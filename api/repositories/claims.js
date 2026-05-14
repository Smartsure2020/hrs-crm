export const config = {
  table:          'claims',
  brokerScopeCol: 'assigned_broker',
  adminWriteOnly: false,
  filterableCols: new Set(['status', 'client_id', 'policy_id', 'assigned_broker', 'claim_type']),
  sortableCols:   new Set(['created_at', 'claim_number', 'status', 'date_of_incident']),
  searchableCols: null,
};
