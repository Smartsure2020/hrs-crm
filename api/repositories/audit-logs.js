// No brokerScopeCol: non-admins can read all audit logs (existing behaviour preserved).
// adminWriteOnly: all mutations require admin role.
export const config = {
  table:          'audit_logs',
  brokerScopeCol: null,
  adminWriteOnly: true,
  filterableCols: new Set(['user_email', 'action', 'record_type', 'record_id']),
  sortableCols:   new Set(['created_at', 'user_email', 'action', 'record_type']),
  searchableCols: ['user_email', 'action', 'details'],
};
