import { vi, describe, it, expect, beforeEach } from 'vitest'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser: vi.fn() }, from: mockFrom }),
}))

import { createActions } from '../_base.js'
import { config as clientsConfig } from '../repositories/clients.js'

// clients.brokerScopeCol = 'assigned_broker'
const actions = createActions(clientsConfig, 'clients')

// --- helpers ---

function makeRes() {
  const res = { _status: null, _body: null }
  res.status = vi.fn(code => { res._status = code; return res })
  res.json  = vi.fn(body => { res._body  = body; return res })
  return res
}

// Returns a fresh chainable query stub.
// range() and single() are the terminal methods that resolve the query.
function makeChain(
  rangeResult = { data: [], error: null, count: 0 },
  singleResult = { data: null, error: null },
) {
  const c = {}
  c.select = vi.fn(() => c)
  c.eq     = vi.fn(() => c)
  c.order  = vi.fn(() => c)
  c.or     = vi.fn(() => c)
  c.insert = vi.fn(() => c)
  c.update = vi.fn(() => c)
  c.delete = vi.fn(() => c)
  c.range  = vi.fn(() => Promise.resolve(rangeResult))
  c.single = vi.fn(() => Promise.resolve(singleResult))
  return c
}

const DEFAULT_PARAMS = { id: null, sort: null, search: null, limit: 50, offset: 0 }
const BROKER_CTX     = { isAdmin: false, callerEmail: 'broker-a@test.com' }
const ADMIN_CTX      = { isAdmin: true,  callerEmail: 'admin@test.com' }

beforeEach(() => vi.clearAllMocks())

// --- applyBrokerScope ---

describe('broker scope on list', () => {
  it('applies .eq(brokerScopeCol, callerEmail) for non-admin', async () => {
    const chain = makeChain()
    mockFrom.mockReturnValue(chain)

    await actions.list({}, makeRes(), BROKER_CTX, DEFAULT_PARAMS)

    expect(chain.eq).toHaveBeenCalledWith('assigned_broker', 'broker-a@test.com')
  })

  it('does NOT apply scope filter for admin', async () => {
    const chain = makeChain()
    mockFrom.mockReturnValue(chain)

    await actions.list({}, makeRes(), ADMIN_CTX, DEFAULT_PARAMS)

    const scopeCall = chain.eq.mock.calls.some(([col]) => col === 'assigned_broker')
    expect(scopeCall).toBe(false)
  })
})

// --- create: broker scope stamping ---

describe('create: broker scope enforcement', () => {
  it('stamps callerEmail onto assigned_broker before inserting', async () => {
    const newRecord = { id: 'r1', client_name: 'Acme', assigned_broker: 'broker-a@test.com' }
    const chain = makeChain(undefined, { data: newRecord, error: null })
    mockFrom.mockReturnValue(chain)

    const req = { body: { client_name: 'Acme' } }
    const res = makeRes()
    await actions.create(req, res, BROKER_CTX)

    expect(res._status).toBe(201)
    const insertedPayload = chain.insert.mock.calls[0][0]
    expect(insertedPayload.assigned_broker).toBe('broker-a@test.com')
  })

  it('returns 403 when broker tries to assign a record to a different broker', async () => {
    const req = { body: { client_name: 'Acme', assigned_broker: 'broker-b@test.com' } }
    const res = makeRes()
    await actions.create(req, res, BROKER_CTX)

    expect(res._status).toBe(403)
    expect(res._body.error).toMatch(/Forbidden/)
  })
})

// --- filter: column allowlist ---

describe('filter: column allowlist', () => {
  it('returns 200 and applies scope for a valid filterable column', async () => {
    const chain = makeChain()
    mockFrom.mockReturnValue(chain)

    const req = { body: { filters: { status: 'active' } } }
    const res = makeRes()
    await actions.filter(req, res, BROKER_CTX, DEFAULT_PARAMS)

    expect(res._status).toBe(200)
    // Scope was applied
    expect(chain.eq).toHaveBeenCalledWith('assigned_broker', 'broker-a@test.com')
    // Actual filter was applied
    expect(chain.eq).toHaveBeenCalledWith('status', 'active')
  })

  it('returns 400 for a column not in filterableCols', async () => {
    const req = { body: { filters: { secret_column: 'value' } } }
    const res = makeRes()
    await actions.filter(req, res, BROKER_CTX, DEFAULT_PARAMS)

    expect(res._status).toBe(400)
    expect(res._body.error).toMatch(/Invalid filter fields/)
  })
})
