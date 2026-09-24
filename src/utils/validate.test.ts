import { describe, expect, it } from 'vitest'
import type { EventFormValues } from '../types'
import { isNamedColor, NAMED_COLORS } from './colors'
import { MAX_LENGTH, validateEvent } from './validate'

const valid: EventFormValues = {
  name: 'Launch',
  description: 'Big day',
  company: 'ACME',
  color: 'red',
}

describe('validateEvent', () => {
  it('accepts a fully valid form', () => {
    expect(validateEvent(valid)).toEqual({})
  })

  it.each(['name', 'description', 'company', 'color'] as const)('requires %s', (field) => {
    expect(validateEvent({ ...valid, [field]: '' })).toEqual({
      [field]: 'Required',
    })
  })

  it('reports every failing field at once', () => {
    const errors = validateEvent({
      name: '',
      description: '',
      company: '',
      color: '',
    })
    expect(Object.keys(errors).sort()).toEqual(['color', 'company', 'description', 'name'])
  })

  it('rejects values longer than the maximum', () => {
    expect(validateEvent({ ...valid, name: 'x'.repeat(MAX_LENGTH + 1) })).toEqual({
      name: `Must be ${MAX_LENGTH} characters or fewer`,
    })
    expect(validateEvent({ ...valid, name: 'x'.repeat(MAX_LENGTH) })).toEqual({})
  })

  it.each(['red', 'RED', 'steelblue', 'rebeccapurple', 'lightgoldenrodyellow'])(
    'accepts named color %j',
    (color) => expect(validateEvent({ ...valid, color })).toEqual({}),
  )

  it.each([
    '#ff0000',
    'rgb(255,0,0)',
    'reddish',
    'light blue',
    '123',
    'transparent',
    'currentcolor',
    'Test 2 steelblue',
    'steelblue!',
    'steel blue',
    'red,blue',
    'color: red',
  ])('rejects non-named color %j', (color) =>
    expect(validateEvent({ ...valid, color })).toEqual({
      color: expect.stringMatching(/named color/),
    }),
  )

  it('reports Required rather than the color-name error when color is blank', () => {
    expect(validateEvent({ ...valid, color: '' })).toEqual({
      color: 'Required',
    })
  })
})

describe('isNamedColor', () => {
  it('has the 148 CSS named colors, spot-checked against the spec list', () => {
    expect(NAMED_COLORS.size).toBe(148)
    for (const c of [
      'aliceblue',
      'rebeccapurple',
      'yellowgreen',
      'grey',
      'gray',
      'darkslategrey',
    ]) {
      expect(isNamedColor(c)).toBe(true)
    }
    for (const c of ['transparent', 'currentcolor', 'inherit', 'lightgoldenrod']) {
      expect(isNamedColor(c)).toBe(false)
    }
  })

  it('is case- and whitespace-insensitive', () => {
    expect(isNamedColor('  DarkSlateGray ')).toBe(true)
  })

  it('rejects empty and unknown strings', () => {
    expect(isNamedColor('')).toBe(false)
    expect(isNamedColor('notacolor')).toBe(false)
  })
})
