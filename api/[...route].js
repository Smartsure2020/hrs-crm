import { createClient } from '@supabase/supabase-js';

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

// Strip system-managed columns before insert/update
const RESERVED = new Set(['id', 'created_at', 'updated_at']);
function stripReserved(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !RESERVED.has(k)));
}

function applySort(query, sort) {
  if (!sort) return query.order('created_at', { ascending: false });
  const descending = sort.startsWith('-');
  const field = descending ? sort.slice(1) : sort;
  return query.order(field, { ascending: !descending });
}

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const segments = url.pathname.replace(/^\/api\//, '').split('/');
  const entity   = segments[0];
  const action   = url.searchParams.get('action') || 'list';
  const id       = url.searchParams.get('id');
  const sort     = url.searchParams.get('sort');
  const limit    = parseInt(url.searchParams.get('limit') || '1000', 10);

  const table = TABLES[entity];
  if (!table) {
    return res.status(404).json({ error: `Unknown entity: ${entity}` });
  }

  try {
    switch (action) {

      case 'list': {
        let query = supabase.from(table).select('*');
        query = applySort(query, sort);
        query = query.limit(limit);
        const { data, error } = await query;
        if (error) throw error;
        return res.status(200).json(data);
      }

      case 'get': {
        if (!id) return res.status(400).json({ error: 'id required' });
        const { data, error } = await supabase
          .from(table).select('*').eq('id', id).single();
        if (error) throw error;
        return res.status(200).json(data);
      }

      case 'create': {
        const payload = stripReserved(req.body || {});
        const { data, error } = await supabase
          .from(table).insert(payload).select().single();
        if (error) throw error;
        return res.status(201).json(data);
      }

      case 'update': {
        const updateId = id || req.body?.id;
        if (!updateId) return res.status(400).json({ error: 'id required' });
        const payload = stripReserved(req.body || {});
        const { data, error } = await supabase
          .from(table).update(payload).eq('id', updateId).select().single();
        if (error) throw error;
        return res.status(200).json(data);
      }

      case 'delete': {
        const deleteId = id || req.body?.id;
        if (!deleteId) return res.status(400).json({ error: 'id required' });
        const { error } = await supabase
          .from(table).delete().eq('id', deleteId);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      case 'filter': {
        let query = supabase.from(table).select('*');
        const filters = req.body?.filters || {};
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
        query = applySort(query, sort);
        query = query.limit(limit);
        const { data, error } = await query;
        if (error) throw error;
        return res.status(200).json(data);
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error(`API error [${entity}/${action}]:`, err);
    return res.status(500).json({ error: err.message });
  }
}
