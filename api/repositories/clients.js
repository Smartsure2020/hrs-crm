export const config = {
  table:          'clients',
  brokerScopeCol: 'assigned_broker',
  adminWriteOnly: false,
  filterableCols: new Set(['status', 'assigned_broker', 'client_type', 'province', 'city']),
  sortableCols:   new Set(['created_at', 'client_name', 'renewal_date', 'status', 'assigned_broker']),
  searchableCols: ['client_name', 'company_name', 'email'],
};
