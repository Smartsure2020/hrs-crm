import { createClient } from '@supabase/supabase-js';
import { SCHEMAS } from './_schemas.js';

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const RESERVED = new Set(['id', 'created_at', 'updated_at']);

function stripReserved(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !RESERVED.has(k)));
}

function applySort(query, sort, sortableCols) {
  if (!sort) return query.order('created_at', { ascending: false });
  const desc  = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  if (sortableCols && !sortableCols.has(field)) return query.order('created_at', { ascending: false });
  return query.order(field, { ascending: !desc });
}

function applySearch(query, searchableCols, rawSearch) {
  if (!rawSearch || !searchableCols?.length) return query;
  const term = rawSearch.trim().replace(/[,.'"`()\\]/g, '');
  if (!term) return query;
  return query.or(searchableCols.map(c => `${c}.ilike.%${term}%`).join(','));
}

function validationError(res, issues) {
  return res.status(422).json({
    error:  'Validation failed',
    issues: issues.map(i => ({ path: i.path.join('.'), message: i.message })),
  });
}

// Maps Postgres/Supabase error codes to meaningful HTTP responses.
// Returns the response when the error is mapped; throws when it isn't.
function pgErrorResponse(res, error) {
  const code = error?.code;
  const detail = error?.details || error?.message || '';

  // Extract the column name from Postgres detail strings like:
  // "Key (email)=(foo@bar.com) already exists."
  const colMatch = detail.match(/Key \(([^)]+)\)/);
  const field = colMatch?.[1] ?? null;

  const PG_ERRORS = {
    '23505': { status: 409, message: field
      ? `A record with this ${field} already exists.`
      : 'A duplicate record already exists.' },
    '23503': { status: 422, message: 'This record references something that no longer exists.' },
    '23502': { status: 422, message: field
      ? `${field} is required.`
      : 'A required field is missing.' },
    '42501': { status: 403, message: 'You do not have permission to perform this action.' },
    'PGRST116': { status: 404, message: 'Record not found.' },
  };

  const mapped = PG_ERRORS[code];
  if (!mapped) throw error;
  return res.status(mapped.status).json({ error: mapped.message, code });
}

// Returns a CRUD action map bound to the given entity config.
// The returned object is created once at startup (in [...route].js) and reused per request.
export function createActions(config, entity) {
  const { table, brokerScopeCol, filterableCols, sortableCols, searchableCols, adminWriteOnly } = config;
  const schema = SCHEMAS[entity];

  function applyScope(query, ctx) {
    if (ctx.isAdmin || !brokerScopeCol) return query;
    return query.eq(brokerScopeCol, ctx.callerEmail);
  }

  async function callerOwns(recordId, ctx) {
    if (ctx.isAdmin) return true;
    if (!brokerScopeCol) return false;
    const { data } = await supabase.from(table).select(brokerScopeCol).eq('id', recordId).single();
    return data?.[brokerScopeCol] === ctx.callerEmail;
  }

  return {
    async list(req, res, ctx, params) {
      let q = supabase.from(table).select('*', { count: 'exact' });
      q = applyScope(q, ctx);
      q = applySort(q, params.sort, sortableCols);
      q = applySearch(q, searchableCols, params.search);
      q = q.range(params.offset, params.offset + params.limit - 1);
      const { data, error, count } = await q;
      if (error) return pgErrorResponse(res, error);
      return res.status(200).json({ data, total: count });
    },

    async get(req, res, ctx, params) {
      if (!params.id) return res.status(400).json({ error: 'id required' });
      let q = supabase.from(table).select('*').eq('id', params.id);
      q = applyScope(q, ctx);
      const { data, error } = await q.single();
      if (error) return pgErrorResponse(res, error);
      return res.status(200).json(data);
    },

    async create(req, res, ctx) {
      if (adminWriteOnly && !ctx.isAdmin) return res.status(403).json({ error: 'Forbidden' });
      const parsed = schema.safeParse(req.body || {});
      if (!parsed.success) return validationError(res, parsed.error.issues);
      if (!ctx.isAdmin && brokerScopeCol) {
        if (parsed.data[brokerScopeCol] && parsed.data[brokerScopeCol] !== ctx.callerEmail) {
          return res.status(403).json({ error: 'Forbidden: cannot assign records to another broker' });
        }
        parsed.data[brokerScopeCol] = ctx.callerEmail;
      }
      const { data, error } = await supabase.from(table).insert(parsed.data).select().single();
      if (error) return pgErrorResponse(res, error);
      return res.status(201).json(data);
    },

    async update(req, res, ctx, params) {
      if (adminWriteOnly && !ctx.isAdmin) return res.status(403).json({ error: 'Forbidden' });
      const id = params.id || req.body?.id;
      if (!id) return res.status(400).json({ error: 'id required' });
      if (!(await callerOwns(id, ctx))) return res.status(403).json({ error: 'Forbidden' });
      const parsed = schema.safeParse(stripReserved(req.body || {}));
      if (!parsed.success) return validationError(res, parsed.error.issues);
      if (!ctx.isAdmin && brokerScopeCol) delete parsed.data[brokerScopeCol];
      const { data, error } = await supabase.from(table).update(parsed.data).eq('id', id).select().single();
      if (error) return pgErrorResponse(res, error);
      return res.status(200).json(data);
    },

    async delete(req, res, ctx, params) {
      if (adminWriteOnly && !ctx.isAdmin) return res.status(403).json({ error: 'Forbidden' });
      const id = params.id || req.body?.id;
      if (!id) return res.status(400).json({ error: 'id required' });
      if (!(await callerOwns(id, ctx))) return res.status(403).json({ error: 'Forbidden' });
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) return pgErrorResponse(res, error);
      return res.status(200).json({ success: true });
    },

    async filter(req, res, ctx, params) {
      const filters = req.body?.filters || {};
      const unknown = Object.keys(filters).filter(k => !filterableCols?.has(k));
      if (unknown.length > 0) {
        return res.status(400).json({ error: `Invalid filter fields: ${unknown.join(', ')}` });
      }
      let q = supabase.from(table).select('*', { count: 'exact' });
      q = applyScope(q, ctx);
      Object.entries(filters).forEach(([key, value]) => { q = q.eq(key, value); });
      q = applySort(q, params.sort, sortableCols);
      q = applySearch(q, searchableCols, params.search);
      q = q.range(params.offset, params.offset + params.limit - 1);
      const { data, error, count } = await q;
      if (error) return pgErrorResponse(res, error);
      return res.status(200).json({ data, total: count });
    },
  };
}
