import { describe, expect, it } from 'vitest'
import { makeEvent } from '../test/server'
import { sortByCompany } from './sort'

const companies = (events: ReturnType<typeof makeEvent>[]) => events.map((e) => e.company)

describe('sortByCompany', () => {
  it('sorts alphabetically by company', () => {
    const sorted = sortByCompany([
      makeEvent({ id: 1, company: 'ZILCH' }),
      makeEvent({ id: 2, company: 'ANOCHA' }),
      makeEvent({ id: 3, company: 'MIRACULA' }),
    ])
    expect(companies(sorted)).toEqual(['ANOCHA', 'MIRACULA', 'ZILCH'])
  })

  it('ignores case', () => {
    const sorted = sortByCompany([makeEvent({ company: 'beta' }), makeEvent({ company: 'Alpha' })])
    expect(companies(sorted)).toEqual(['Alpha', 'beta'])
  })

  it('keeps original order for equal companies (stable)', () => {
    const sorted = sortByCompany([
      makeEvent({ id: 1, company: 'SAME' }),
      makeEvent({ id: 2, company: 'SAME' }),
      makeEvent({ id: 3, company: 'AAA' }),
    ])
    expect(sorted.map((e) => e.id)).toEqual([3, 1, 2])
  })

  it('does not mutate the input array', () => {
    const input = [makeEvent({ company: 'B' }), makeEvent({ company: 'A' })]
    sortByCompany(input)
    expect(companies(input)).toEqual(['B', 'A'])
  })

  it('handles empty and single-item lists', () => {
    expect(sortByCompany([])).toEqual([])
    expect(companies(sortByCompany([makeEvent({ company: 'ONLY' })]))).toEqual(['ONLY'])
  })

  it('puts records with a missing or empty company first instead of throwing', () => {
    const sorted = sortByCompany([
      makeEvent({ id: 1, company: 'B' }),
      makeEvent({ id: 2, company: undefined as unknown as string }),
      makeEvent({ id: 3, company: '' }),
    ])
    expect(sorted.map((e) => e.id)).toEqual([2, 3, 1])
  })

  it('does not throw when company is a number or an object (shared server, unvalidated data)', () => {
    const bad = [
      makeEvent({ id: 1, company: 'b' }),
      makeEvent({ id: 2, company: 42 as unknown as string }),
      makeEvent({ id: 3, company: { x: 1 } as unknown as string }),
    ]
    expect(() => sortByCompany(bad)).not.toThrow()
    expect(sortByCompany(bad)).toHaveLength(3)
  })
})
