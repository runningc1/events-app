import type { EventRecord } from '../types'

// Returns a new array sorted by company, case-insensitive. Does not mutate the input.
// String() guards against records on the shared server whose company is not a string.
export const sortByCompany = (events: EventRecord[]): EventRecord[] =>
  [...events].sort((a, b) =>
    String(a.company ?? '').localeCompare(String(b.company ?? ''), undefined, {
      sensitivity: 'base',
    }),
  )
