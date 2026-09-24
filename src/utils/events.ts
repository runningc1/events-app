import type { EventFormValues, EventRecord, NewEvent } from '../types'

// The one place form input is cleaned up. EventForm calls it before validating and before
// handing values to a page, so every save path stores the same shape.
export const normalizeValues = (v: EventFormValues): EventFormValues => ({
  name: v.name.trim(),
  description: v.description.trim(),
  company: v.company.trim(),
  color: v.color.trim().toLowerCase(),
})

// Builds a full record for POST so new events have the same shape as the seed data.
// date and time are the user's local date and time, not UTC.
export const buildNewEvent = (values: EventFormValues, now: Date = new Date()): NewEvent => ({
  ...values,
  isActive: true,
  date: now.toLocaleDateString('en-CA'),
  time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
  email: '',
  phone: '',
  address: '',
  image: '',
  createdOn: now.toISOString(),
})

// Merges edited fields into the existing record so PUT sends every field.
export const applyEdits = (existing: EventRecord, values: EventFormValues): EventRecord => ({
  ...existing,
  ...values,
})

export const toFormValues = (e: EventRecord): EventFormValues => ({
  name: e.name,
  description: e.description,
  company: e.company,
  color: e.color,
})
