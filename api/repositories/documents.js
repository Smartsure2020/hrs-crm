export const config = {
  table:          'documents',
  brokerScopeCol: 'uploaded_by',
  adminWriteOnly: false,
  filterableCols: new Set(['client_id', 'policy_id', 'deal_id', 'folder', 'document_type', 'uploaded_by']),
  sortableCols:   new Set(['created_at', 'name', 'document_type', 'folder']),
  searchableCols: ['name', 'client_name'],
};
