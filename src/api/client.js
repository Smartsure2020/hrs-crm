// Supabase-backed API client — mirrors the Base44 entity API surface.
// Import { base44 } from "@/api/client" as a drop-in replacement for
// the old "@/api/client" import. All usage patterns are identical.

import { supabase } from '@/lib/supabaseClient';

export const PAGE_SIZE = 50;

async function apiCall(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { ...(options.headers || {}) };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  const res = await fetch(path, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `API error ${res.status}`);
  return data;
}

// Unwraps the { data, total } envelope that the API now always returns for list/filter,
// so callers that just want an array continue to work without changes.
function unwrapArray(result) {
  if (Array.isArray(result)) return result;
  return result?.data ?? result;
}

function makeEntityClient(entity) {
  return {
    list(sort, limit) {
      const p = new URLSearchParams({ action: 'list' });
      if (sort != null) p.set('sort', sort);
      if (limit != null) p.set('limit', String(limit));
      return apiCall(`/api/${entity}?${p}`).then(unwrapArray);
    },
    get(id) {
      return apiCall(`/api/${entity}?action=get&id=${encodeURIComponent(id)}`);
    },
    create(data) {
      return apiCall(`/api/${entity}?action=create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    update(id, data) {
      return apiCall(`/api/${entity}?action=update&id=${encodeURIComponent(id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    delete(id) {
      return apiCall(`/api/${entity}?action=delete&id=${encodeURIComponent(id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    },
    filter(filters = {}, sort, limit) {
      const p = new URLSearchParams({ action: 'filter' });
      if (sort != null) p.set('sort', sort);
      if (limit != null) p.set('limit', String(limit));
      return apiCall(`/api/${entity}?${p}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters }),
      }).then(unwrapArray);
    },
    // Paginated query — returns { data: Row[], total: number }.
    // page is 0-indexed. filters/search are applied server-side.
    paginate(page, filters = {}, sort, search) {
      const offset = page * PAGE_SIZE;
      const p = new URLSearchParams({ action: 'filter', offset: String(offset), limit: String(PAGE_SIZE) });
      if (sort != null) p.set('sort', sort);
      if (search) p.set('search', search);
      return apiCall(`/api/${entity}?${p}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters }),
      });
    },
  };
}

export const base44 = {
  entities: {
    Client:           makeEntityClient('clients'),
    Deal:             makeEntityClient('deals'),
    Policy:           makeEntityClient('policies'),
    Claim:            makeEntityClient('claims'),
    Document:         makeEntityClient('documents'),
    Task:             makeEntityClient('tasks'),
    User:             makeEntityClient('users'),
    ActivityLog:      makeEntityClient('activity-logs'),
    AuditLog:         makeEntityClient('audit-logs'),
    CommissionSplit:  makeEntityClient('commission-splits'),
  },

  auth: {
    async me() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        const err = new Error('Not authenticated');
        err.status = 401;
        throw err;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      return { ...profile, email: session.user.email };
    },

    async updateMe(data) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { id: _id, created_at: _ca, updated_at: _ua, ...payload } = data;
      await supabase.from('profiles').update(payload).eq('id', session.user.id);
    },

    logout(redirectUrl) {
      supabase.auth.signOut().then(() => {
        window.location.href = redirectUrl || '/';
      });
    },

    redirectToLogin(returnUrl) {
      const next = returnUrl ? `?next=${encodeURIComponent(returnUrl)}` : '';
      window.location.href = `/login${next}`;
    },
  },

  users: {
    inviteUser(email, role) {
      return apiCall('/api/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
    },

    deleteUser(userId) {
      return apiCall('/api/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
    },
  },

  integrations: {
    Core: {
      async UploadFile({ file }) {
        const { data: { session } } = await supabase.auth.getSession();
        const p = new URLSearchParams({ filename: file.name });
        const headers = { 'Content-Type': file.type || 'application/octet-stream' };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        const res = await fetch(`/api/upload-file?${p}`, {
          method: 'POST',
          body: file,
          headers,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        return data; // { file_url }
      },
    },
  },
};
