export const config = {
  table:          'commission_splits',
  brokerScopeCol: 'broker_email',
  adminWriteOnly: true,
  filterableCols: new Set(['broker_email']),
  sortableCols:   new Set(['created_at', 'broker_email']),
  searchableCols: null,
};
