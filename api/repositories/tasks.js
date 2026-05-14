export const config = {
  table:          'tasks',
  brokerScopeCol: 'assigned_to',
  adminWriteOnly: false,
  filterableCols: new Set(['status', 'priority', 'client_id', 'deal_id', 'assigned_to', 'task_type']),
  sortableCols:   new Set(['created_at', 'due_date', 'status', 'priority', 'title']),
  searchableCols: ['title', 'client_name'],
};
