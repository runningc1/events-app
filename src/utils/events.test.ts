import { describe, expect, it } from 'vitest'
import { makeEvent } from '../test/server'
import { applyEdits, buildNewEvent, normalizeValues, toFormValues } from './events'

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

describe('applyEdits', () => {
  it('overwrites only the four editable fields and keeps the rest, including id', () => {
    const existing = makeEvent({ id: 7, email: 'keep@me.com' })
    const edited = applyEdits(existing, values)
    expect(edited).toEqual({
      ...existing,
      name: 'Launch',
      description: 'Big day',
      company: 'ACME',
      color: 'red',
    })
    expect(edited.id).toBe(7)
    expect(edited.email).toBe('keep@me.com')
  })

  it('does not mutate the existing record', () => {
    const existing = makeEvent()
    applyEdits(existing, values)
    expect(existing.name).toBe('Event 1')
  })
})

describe('toFormValues', () => {
  it('extracts exactly the four editable fields', () => {
    expect(
      toFormValues(makeEvent({ name: 'A', description: 'B', company: 'C', color: 'teal' })),
    ).toEqual({
      name: 'A',
      description: 'B',
      company: 'C',
      color: 'teal',
    })
  })
})
