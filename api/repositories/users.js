export const config = {
  table:          'profiles',
  brokerScopeCol: 'email',
  adminWriteOnly: true,
  filterableCols: new Set(['role', 'status', 'email']),
  sortableCols:   new Set(['created_at', 'email', 'role', 'status']),
  searchableCols: null,
};
