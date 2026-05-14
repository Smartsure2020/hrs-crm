export const config = {
  table:          'policies',
  brokerScopeCol: 'assigned_broker',
  adminWriteOnly: false,
  filterableCols: new Set(['status', 'client_id', 'deal_id', 'assigned_broker', 'insurer', 'policy_type']),
  sortableCols:   new Set(['created_at', 'policy_number', 'renewal_date', 'status', 'assigned_broker']),
  searchableCols: ['policy_number', 'client_name', 'insurer'],
};
