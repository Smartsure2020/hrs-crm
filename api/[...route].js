import { createClient } from '@supabase/supabase-js';
import { requireAuth } from './_auth.js';
import { SCHEMAS } from './_schemas.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TABLES = {
  clients:            'clients',
  policies:           'policies',
  claims:             'claims',
  deals:              'deals',
  documents:          'documents',
  tasks:              'tasks',
  users:              'profiles',
  'activity-logs':    'activity_logs',
  'audit-logs':       'audit_logs',
  'commission-splits':'commission_splits',
};

const FILTERABLE_COLUMNS = {
  clients:            new Set(['status', 'assigned_broker', 'client_type', 'province', 'city']),
  policies:           new Set(['status', 'client_id', 'deal_id', 'assigned_broker', 'insurer', 'policy_type']),
  claims:             new Set(['status', 'client_id', 'policy_id', 'assigned_broker', 'claim_type']),
  deals:              new Set(['stage', 'client_id', 'assigned_broker', 'policy_type']),
  documents:          new Set(['client_id', 'policy_id', 'deal_id', 'folder', 'document_type', 'uploaded_by']),
  tasks:              new Set(['status', 'priority', 'client_id', 'deal_id', 'assigned_to', 'task_type']),
  users:              new Set(['role', 'status', 'email']),
  'activity-logs':    new Set(['entity_type', 'entity_id', 'user_email']),
  'audit-logs':       new Set(['user_email', 'action', 'record_type', 'record_id']),
  'commission-splits':new Set(['broker_email']),
};

// Column used to scope reads/writes to the calling broker's own records.
// Entities absent from this map are governed by ADMIN_WRITE_ONLY instead.
const BROKER_SCOPE_COL = {
  clients:            'assigned_broker',
  deals:              'assigned_broker',
  policies:           'assigned_broker',
  claims:             'assigned_broker',
  documents:          'uploaded_by',
  tasks:              'assigned_to',
  users:              'email',
  'activity-logs':    'user_email',
  'commission-splits':'broker_email',
};

// Non-admin users are completely blocked from mutating these entities via the API.
// Audit-logs are written by the frontend auditLogger (anon-key, subject to RLS WITH CHECK).
// Commission-splits and users are managed by admins only.
const ADMIN_WRITE_ONLY = new Set(['audit-logs', 'commission-splits', 'users']);

const MAX_LIMIT = 500;

// Per-entity allowlist of sortable columns (prevents schema enumeration via PostgREST errors).
const SORTABLE_COLUMNS = {
  clients:            new Set(['created_at', 'client_name', 'renewal_date', 'status', 'assigned_broker']),
  deals:              new Set(['created_at', 'client_name', 'stage', 'assigned_broker', 'reminder_date']),
  policies:           new Set(['created_at', 'policy_number', 'renewal_date', 'status', 'assigned_broker']),
  claims:             new Set(['created_at', 'claim_number', 'status', 'date_of_incident']),
  documents:          new Set(['created_at', 'name', 'document_type', 'folder']),
  tasks:              new Set(['created_at', 'due_date', 'status', 'priority', 'title']),
  users:              new Set(['created_at', 'email', 'role', 'status']),
  'activity-logs':    new Set(['created_at', 'user_email', 'entity_type']),
  'audit-logs':       new Set(['created_at', 'user_email', 'action', 'record_type']),
  'commission-splits':new Set(['created_at', 'broker_email']),
};

// Columns searched by the ?search= param (ILIKE %term% OR across these columns)
const SEARCHABLE_COLUMNS = {
  clients:   ['client_name', 'company_name', 'email'],
  tasks:     ['title', 'client_name'],
  documents: ['name', 'client_name'],
  policies:  ['policy_number', 'client_name', 'insurer'],
  'audit-logs': ['user_email', 'action', 'details'],
};

// Strip system-managed columns before insert/update
const RESERVED = new Set(['id', 'created_at', 'updated_at']);
function stripReserved(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !RESERVED.has(k)));
}

function applySort(query, sort, entity) {
  if (!sort) return query.order('created_at', { ascending: false });
  const descending = sort.startsWith('-');
  const field = descending ? sort.slice(1) : sort;
  const allowed = SORTABLE_COLUMNS[entity];
  if (allowed && !allowed.has(field)) return query.order('created_at', { ascending: false });
  return query.order(field, { ascending: !descending });
}

// Applies a case-insensitive text search across the entity's searchable columns.
// Strips characters that could break PostgREST filter syntax.
function applySearch(query, entity, rawSearch) {
  const cols = SEARCHABLE_COLUMNS[entity];
  if (!rawSearch || !cols) return query;
  const term = rawSearch.trim().replace(/[,.'"`()\\]/g, '');
  if (!term) return query;
  return query.or(cols.map(c => `${c}.ilike.%${term}%`).join(','));
}

export default async function handler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  // Fetch caller's role from profiles (service_role bypasses RLS so this is always readable)
  const { data: callerProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  const isAdmin = callerProfile?.role === 'admin' || callerProfile?.role === 'admin_staff';
  const callerEmail = user.email;

  const url = new URL(req.url, `http://${req.headers.host}`);
  const segments = url.pathname.replace(/^\/api\//, '').split('/');
  const entity   = segments[0];
  const action   = url.searchParams.get('action') || 'list';
  const id       = url.searchParams.get('id');
  const sort     = url.searchParams.get('sort');
  const rawLimit = parseInt(url.searchParams.get('limit') || '50', 10);
  const limit    = Math.min(isNaN(rawLimit) ? 50 : rawLimit, MAX_LIMIT);
  const offset   = parseInt(url.searchParams.get('offset') || '0', 10);
  const search   = url.searchParams.get('search') || null;

  const table = TABLES[entity];
  if (!table) {
    return res.status(404).json({ error: `Unknown entity: ${entity}` });
  }

  // Adds the caller's broker scope filter for non-admin users.
  function applyBrokerScope(query) {
    if (isAdmin) return query;
    const col = BROKER_SCOPE_COL[entity];
    if (col) return query.eq(col, callerEmail);
    return query;
  }

  // Verifies a record belongs to the calling broker before a mutating operation.
  // Returns true if allowed to proceed, false if the caller should be rejected.
  async function callerOwnsRecord(recordId) {
    if (isAdmin) return true;
    const col = BROKER_SCOPE_COL[entity];
    if (!col) return false; // No scope col defined → deny non-admin mutations
    const { data: existing } = await supabase
      .from(table).select(col).eq('id', recordId).single();
    return existing?.[col] === callerEmail;
  }

  try {
    switch (action) {

      case 'list': {
        let query = supabase.from(table).select('*', { count: 'exact' });
        query = applyBrokerScope(query);
        query = applySort(query, sort, entity);
        query = applySearch(query, entity, search);
        query = query.range(offset, offset + limit - 1);
        const { data, error, count } = await query;
        if (error) throw error;
        return res.status(200).json({ data, total: count });
      }

      case 'get': {
        if (!id) return res.status(400).json({ error: 'id required' });
        let query = supabase.from(table).select('*').eq('id', id);
        query = applyBrokerScope(query);
        const { data, error } = await query.single();
        if (error) throw error;
        return res.status(200).json(data);
      }

      case 'create': {
        if (!isAdmin && ADMIN_WRITE_ONLY.has(entity)) {
          return res.status(403).json({ error: 'Forbidden' });
        }
        const schema = SCHEMAS[entity];
        const parsed = schema.safeParse(req.body || {});
        if (!parsed.success) {
          return res.status(422).json({
            error: 'Validation failed',
            issues: parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
          });
        }
        // Enforce broker ownership: non-admins can only create records assigned to themselves
        if (!isAdmin) {
          const col = BROKER_SCOPE_COL[entity];
          if (col && parsed.data[col] && parsed.data[col] !== callerEmail) {
            return res.status(403).json({ error: 'Forbidden: cannot assign records to another broker' });
          }
          if (col) parsed.data[col] = callerEmail;
        }
        const { data, error } = await supabase
          .from(table).insert(parsed.data).select().single();
        if (error) throw error;
        return res.status(201).json(data);
      }

      case 'update': {
        if (!isAdmin && ADMIN_WRITE_ONLY.has(entity)) {
          return res.status(403).json({ error: 'Forbidden' });
        }
        const updateId = id || req.body?.id;
        if (!updateId) return res.status(400).json({ error: 'id required' });
        if (!(await callerOwnsRecord(updateId))) {
          return res.status(403).json({ error: 'Forbidden' });
        }
        const schema = SCHEMAS[entity];
        const parsed = schema.safeParse(stripReserved(req.body || {}));
        if (!parsed.success) {
          return res.status(422).json({
            error: 'Validation failed',
            issues: parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
          });
        }
        // Non-admins cannot change the scope column (reassign to another broker)
        if (!isAdmin) {
          const col = BROKER_SCOPE_COL[entity];
          if (col) delete parsed.data[col];
        }
        const { data, error } = await supabase
          .from(table).update(parsed.data).eq('id', updateId).select().single();
        if (error) throw error;
        return res.status(200).json(data);
      }

      case 'delete': {
        if (!isAdmin && ADMIN_WRITE_ONLY.has(entity)) {
          return res.status(403).json({ error: 'Forbidden' });
        }
        const deleteId = id || req.body?.id;
        if (!deleteId) return res.status(400).json({ error: 'id required' });
        if (!(await callerOwnsRecord(deleteId))) {
          return res.status(403).json({ error: 'Forbidden' });
        }
        const { error } = await supabase
          .from(table).delete().eq('id', deleteId);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      case 'filter': {
        const allowed = FILTERABLE_COLUMNS[entity];
        const filters = req.body?.filters || {};
        const unknown = Object.keys(filters).filter(k => !allowed.has(k));
        if (unknown.length > 0) {
          return res.status(400).json({ error: `Invalid filter fields: ${unknown.join(', ')}` });
        }
        let query = supabase.from(table).select('*', { count: 'exact' });
        query = applyBrokerScope(query);
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
        query = applySort(query, sort, entity);
        query = applySearch(query, entity, search);
        query = query.range(offset, offset + limit - 1);
        const { data, error, count } = await query;
        if (error) throw error;
        return res.status(200).json({ data, total: count });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error(`API error [${entity}/${action}]:`, err);
    return res.status(500).json({ error: err.message });
  }
}
