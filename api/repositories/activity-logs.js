export const config = {
  table:          'activity_logs',
  brokerScopeCol: 'user_email',
  adminWriteOnly: false,
  filterableCols: new Set(['entity_type', 'entity_id', 'user_email']),
  sortableCols:   new Set(['created_at', 'user_email', 'entity_type']),
  searchableCols: null,
};
