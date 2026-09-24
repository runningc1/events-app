import { EVENT_FIELDS, type EventFormErrors, type EventFormValues } from '../types'
import { isNamedColor } from './colors'

export const MAX_LENGTH = 200

// Returns an errors object. Empty object means valid. The single rule set for the app:
// EventForm calls it for add and edit, so a rule change applies to both.
// Expects normalized values (see normalizeValues); it does not trim.
export function validateEvent(values: EventFormValues): EventFormErrors {
  const errors: EventFormErrors = {}
  for (const field of EVENT_FIELDS) {
    const value = values[field]
    if (!value) errors[field] = 'Required'
    else if (value.length > MAX_LENGTH) errors[field] = `Must be ${MAX_LENGTH} characters or fewer`
  }
  if (!errors.color && !isNamedColor(values.color)) {
    errors.color = 'Must be a CSS named color, for example red or steelblue'
  }
  return errors
}

export const isValid = (errors: EventFormErrors): boolean => Object.keys(errors).length === 0
