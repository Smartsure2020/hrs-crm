import { createClient } from '@supabase/supabase-js';
import { requireAuth } from './_auth.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST /api/clients-check-duplicate
// Body: { id_number?, email?, company_reg? }
// Returns: { duplicates: Row[] }
// Uses service-role so the check spans all brokers, not just the caller's scope.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  const { id_number, email, company_reg } = req.body || {};

  const queries = [];
  if (id_number?.trim())
    queries.push(supabase.from('clients').select('id,client_name,id_number,email,company_reg').eq('id_number', id_number.trim()));
  if (email?.trim())
    queries.push(supabase.from('clients').select('id,client_name,id_number,email,company_reg').ilike('email', email.trim()));
  if (company_reg?.trim())
    queries.push(supabase.from('clients').select('id,client_name,id_number,email,company_reg').eq('company_reg', company_reg.trim()));

  if (!queries.length) return res.status(200).json({ duplicates: [] });

  const results = await Promise.all(queries);
  const seen = new Set();
  const found = [];
  for (const { data } of results) {
    for (const row of (data || [])) {
      if (!seen.has(row.id)) { seen.add(row.id); found.push(row); }
    }
  }

  return res.status(200).json({ duplicates: found });
}
