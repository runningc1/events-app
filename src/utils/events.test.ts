import { describe, expect, it } from 'vitest'
import { buildNewEvent, normalizeValues } from './events'

const raw = { name: ' Launch ', description: ' Big day ', company: ' ACME ', color: ' Red ' }
const values = { name: 'Launch', description: 'Big day', company: 'ACME', color: 'red' }

describe('normalizeValues', () => {
  it('trims every field and lower-cases the color', () => {
    expect(normalizeValues(raw)).toEqual(values)
  })

  it('reduces whitespace-only input to empty strings', () => {
    expect(normalizeValues({ name: '   ', description: '\t\n', company: '', color: ' ' })).toEqual({
      name: '',
      description: '',
      company: '',
      color: '',
    })
  })
})

describe('buildNewEvent', () => {
  it('produces a full record with local date and time and no id', () => {
    const now = new Date(2026, 8, 24, 19, 5) // local 2026-09-24 19:05
    const event = buildNewEvent(values, now)
    expect(event).not.toHaveProperty('id')
    expect(event).toMatchObject({
      ...values,
      isActive: true,
      date: '2026-09-24',
      time: '19:05',
      createdOn: now.toISOString(),
    })
    expect(Object.keys(event).sort()).toEqual([
      'address',
      'color',
      'company',
      'createdOn',
      'date',
      'description',
      'email',
      'image',
      'isActive',
      'name',
      'phone',
      'time',
    ])
  })
})
