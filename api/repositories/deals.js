export const config = {
  table:          'deals',
  brokerScopeCol: 'assigned_broker',
  adminWriteOnly: false,
  filterableCols: new Set(['stage', 'client_id', 'assigned_broker', 'policy_type']),
  sortableCols:   new Set(['created_at', 'client_name', 'stage', 'assigned_broker', 'reminder_date']),
  searchableCols: null,
};
