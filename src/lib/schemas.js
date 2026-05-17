import { z } from 'zod';

// Coerce empty string / null / undefined → undefined, then parse as number.
const num = z.preprocess(
  v => (v === '' || v === null || v === undefined ? undefined : v),
  z.coerce.number().optional()
);

const pct = z.preprocess(
  v => (v === '' || v === null || v === undefined ? undefined : v),
  z.coerce.number().min(0).max(100).optional()
);

// Required percentage: same coercion but not optional.
const reqPct = z.preprocess(
  v => (v === '' || v === null || v === undefined ? undefined : v),
  z.coerce.number({ required_error: 'Required' }).min(0).max(100)
);

const s = z.string().optional();
const req = z.string().min(1, 'Required');

export const SCHEMAS = {
  clients: z.object({
    client_type:          z.enum(['personal','commercial','body_corporate','motor_trader']).optional(),
    status:               z.enum(['prospect','active','inactive']).optional(),
    client_name:          req,   // NOT NULL in DB; assembled by forms before submit
    surname:              s,
    initials:             s,
    first_name:           s,
    id_number:            s,
    company_name:         s,
    contact_person:       s,
    company_reg:          s,
    vat_number:           s,
    email:                z.string().email('Invalid email').or(z.literal('')).optional(),
    phone:                s,
    street_address:       s,
    complex_number:       s,
    suburb:               s,
    city:                 s,
    province:             s,
    postal_code:          s,
    current_insurer:      s,
    current_policy_no:    s,
    proposed_insurer:     s,
    referror:             s,
    effective_date:       s,
    renewal_date:         s,
    assigned_broker:      s,
    broker_name:          s,
    notes:                s,
    broker_commission_pct: pct,
    hrs_commission_pct:    pct,
  }),

  deals: z.object({
    client_id:         s,
    client_name:       req,
    policy_type:       z.enum(['personal','commercial']).optional(),
    estimated_premium: num,
    stage:             z.enum([
      'lead_received','contacted','quote_requested','quotes_received',
      'quote_sent','follow_up','policy_bound','lost',
    ]).optional(),
    assigned_broker:   s,
    broker_name:       s,
    notes:             s,
    next_action:       s,
    reminder_date:     s,
    insurer:           s,
    contact_phone:     s,
    contact_email:     s,
  }),

  policies: z.object({
    policy_number:     req,
    client_id:         s,
    client_name:       req,
    deal_id:           s,
    insurer:           req,
    policy_type:       z.enum([
      'motor','household','commercial','liability','life',
      'health','marine','engineering','crop','other',
    ]),
    monthly_premium:   num,
    premium:           num,
    start_date:        s,
    renewal_date:      s,
    assigned_broker:   s,
    broker_name:       s,
    status:            z.enum(['active','pending','cancelled','expired']).optional(),
    notes:             s,
    broker_commission_pct: pct,
    hrs_commission_pct:    pct,
  }),

  claims: z.object({
    claim_number:     s,
    claim_type:       z.enum(['motor','household','commercial','liability','life','health','other']).optional(),
    status:           z.enum(['open','in_progress','settled','rejected','withdrawn']).optional(),
    date_of_incident: s,
    date_submitted:   s,
    date_settled:     s,
    amount_claimed:   num,
    amount_settled:   num,
    insurer:          s,
    policy_number:    s,
    policy_id:        s,
    description:      s,
    notes:            s,
    client_id:        req,
    client_name:      req,
    assigned_broker:  s,
    broker_name:      s,
  }),

  documents: z.object({
    name:          req,
    file_url:      req,
    policy_id:     s,
    deal_id:       s,
    client_id:     s,
    client_name:   s,
    folder:        s,
    document_type: s,
    uploaded_by:   s,
  }),

  tasks: z.object({
    title:         req,
    description:   s,
    client_id:     s,
    client_name:   s,
    deal_id:       s,
    due_date:      req,
    assigned_to:   s,
    assigned_name: s,
    status:        z.enum(['pending','in_progress','completed','overdue']).optional(),
    priority:      z.enum(['low','medium','high','urgent']).optional(),
    task_type:     z.enum([
      'follow_up_quote','renewal_reminder','claim_update',
      'compliance_followup','call_client','send_documents','general',
    ]).optional(),
  }),

  'activity-logs': z.object({
    action:      s,
    entity_type: s,
    entity_name: s,
    entity_id:   s,
    user_email:  s,
    user_name:   s,
  }),

  'audit-logs': z.object({
    user_name:   s,
    user_email:  req,
    user_role:   s,
    action:      req,
    record_type: s,
    record_id:   s,
    record_name: s,
    details:     s,
  }),

  // broker_name, broker_email, broker_percentage, hrs_percentage are NOT NULL in DB.
  'commission-splits': z.object({
    broker_name:       req,
    broker_email:      req,
    broker_percentage: reqPct,
    hrs_percentage:    reqPct,
    notes:             s,
  }),

  users: z.object({
    full_name: s,
    email:     z.string().email('Invalid email').optional(),
    role:      z.enum(['admin','admin_staff','broker']).optional(),
    status:    z.enum(['active','pending','inactive']).optional(),
    phone:     s,
  }),
};
