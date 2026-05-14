import { describe, it, expect } from 'vitest'
import { SCHEMAS } from '../_schemas.js'

describe('clients schema', () => {
  it('rejects missing client_name', () => {
    const result = SCHEMAS.clients.safeParse({ status: 'active' })
    expect(result.success).toBe(false)
    expect(result.error.issues.map(i => i.path[0])).toContain('client_name')
  })

  it('accepts minimal valid client', () => {
    const result = SCHEMAS.clients.safeParse({ client_name: 'Acme Corp' })
    expect(result.success).toBe(true)
  })
})

describe('deals schema', () => {
  it('rejects missing client_name', () => {
    const result = SCHEMAS.deals.safeParse({ stage: 'lead_received' })
    expect(result.success).toBe(false)
    expect(result.error.issues.map(i => i.path[0])).toContain('client_name')
  })
})

describe('policies schema', () => {
  it('rejects missing required fields: policy_number, client_name, insurer, policy_type', () => {
    const result = SCHEMAS.policies.safeParse({})
    expect(result.success).toBe(false)
    const paths = result.error.issues.map(i => i.path[0])
    expect(paths).toContain('policy_number')
    expect(paths).toContain('client_name')
    expect(paths).toContain('insurer')
    expect(paths).toContain('policy_type')
  })
})

describe('claims schema', () => {
  it('rejects missing client_id and client_name', () => {
    const result = SCHEMAS.claims.safeParse({})
    expect(result.success).toBe(false)
    const paths = result.error.issues.map(i => i.path[0])
    expect(paths).toContain('client_id')
    expect(paths).toContain('client_name')
  })
})

describe('commission-splits schema', () => {
  it('rejects missing broker_percentage and hrs_percentage', () => {
    const result = SCHEMAS['commission-splits'].safeParse({
      broker_name: 'Alice',
      broker_email: 'alice@example.com',
    })
    expect(result.success).toBe(false)
    const paths = result.error.issues.map(i => i.path[0])
    expect(paths).toContain('broker_percentage')
    expect(paths).toContain('hrs_percentage')
  })

  it('rejects percentage above 100', () => {
    const result = SCHEMAS['commission-splits'].safeParse({
      broker_name: 'Alice',
      broker_email: 'alice@example.com',
      broker_percentage: 150,
      hrs_percentage: 50,
    })
    expect(result.success).toBe(false)
  })
})

describe('tasks schema', () => {
  it('rejects missing title and due_date', () => {
    const result = SCHEMAS.tasks.safeParse({})
    expect(result.success).toBe(false)
    const paths = result.error.issues.map(i => i.path[0])
    expect(paths).toContain('title')
    expect(paths).toContain('due_date')
  })
})
