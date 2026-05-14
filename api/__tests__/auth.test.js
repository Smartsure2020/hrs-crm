import { vi, describe, it, expect, beforeEach } from 'vitest'

// vi.hoisted ensures these refs are initialised before the vi.mock factory runs
// (vi.mock is hoisted above imports by Vitest's transform).
const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser: mockGetUser }, from: mockFrom }),
}))

import { requireAuth, requireAdmin } from '../_auth.js'

// --- helpers ---

function makeReq(token) {
  return { headers: { authorization: token != null ? `Bearer ${token}` : undefined } }
}

function makeRes() {
  const res = { _status: null, _body: null }
  res.status = vi.fn(code => { res._status = code; return res })
  res.json  = vi.fn(body => { res._body  = body; return res })
  return res
}

// Returns a chainable Supabase query stub that resolves .single() with `profile`.
function profileChain(profile) {
  const c = {}
  c.select = vi.fn(() => c)
  c.eq     = vi.fn(() => c)
  c.single = vi.fn(() => Promise.resolve({ data: profile, error: null }))
  return c
}

// --- requireAuth ---

describe('requireAuth', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when Authorization header is absent', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('no token') })
    const res = makeRes()
    const result = await requireAuth(makeReq(null), res)
    expect(result).toBeNull()
    expect(res._status).toBe(401)
  })

  it('returns 401 when Supabase rejects the token', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Invalid JWT') })
    const res = makeRes()
    const result = await requireAuth(makeReq('bad-token'), res)
    expect(result).toBeNull()
    expect(res._status).toBe(401)
  })

  it('returns 403 when profile status is inactive and role is broker', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'b@test.com' } }, error: null })
    mockFrom.mockReturnValue(profileChain({ status: 'inactive', role: 'broker' }))
    const res = makeRes()
    const result = await requireAuth(makeReq('tok'), res)
    expect(result).toBeNull()
    expect(res._status).toBe(403)
  })

  it('returns user with _profile attached for an active broker', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u2', email: 'b@test.com' } }, error: null })
    mockFrom.mockReturnValue(profileChain({ status: 'active', role: 'broker' }))
    const res = makeRes()
    const result = await requireAuth(makeReq('tok'), res)
    expect(result).not.toBeNull()
    expect(result._profile).toEqual({ status: 'active', role: 'broker' })
    expect(res._status).toBeNull()  // no error response sent
  })

  it('lets an inactive admin through (status gate is bypassed for admins)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'a1', email: 'admin@test.com' } }, error: null })
    mockFrom.mockReturnValue(profileChain({ status: 'inactive', role: 'admin' }))
    const res = makeRes()
    const result = await requireAuth(makeReq('tok'), res)
    expect(result).not.toBeNull()
    expect(res._status).toBeNull()
  })
})

// --- requireAdmin ---

describe('requireAdmin', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 403 when authenticated user has broker role', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u3', email: 'b@test.com' } }, error: null })
    mockFrom.mockReturnValue(profileChain({ status: 'active', role: 'broker' }))
    const res = makeRes()
    const result = await requireAdmin(makeReq('tok'), res)
    expect(result).toBeNull()
    expect(res._status).toBe(403)
  })

  it('passes through for role=admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'a2', email: 'admin@test.com' } }, error: null })
    mockFrom.mockReturnValue(profileChain({ status: 'active', role: 'admin' }))
    const res = makeRes()
    const result = await requireAdmin(makeReq('tok'), res)
    expect(result).not.toBeNull()
  })

  it('passes through for role=admin_staff', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'a3', email: 'staff@test.com' } }, error: null })
    mockFrom.mockReturnValue(profileChain({ status: 'active', role: 'admin_staff' }))
    const res = makeRes()
    const result = await requireAdmin(makeReq('tok'), res)
    expect(result).not.toBeNull()
  })
})
