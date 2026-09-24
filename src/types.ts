/**
 * Shape of an event record as stored by rf-json-server.
 * Field list taken from the sample POST payload in the assignment PDF.
 */
export interface EventRecord {
  id: number
  name: string
  description: string
  company: string
  color: string
  isActive: boolean
  date: string
  time: string
  email: string
  phone: string
  address: string
  image: string
  createdOn: string
}

/** A record without a server-assigned id. POST bodies must never include id. */
export type NewEvent = Omit<EventRecord, 'id'>

/** Route params arrive as strings; records carry numbers. The API accepts either. */
export type EventId = number | string

/** The four fields the assignment requires the user to be able to enter and edit. */
export const EVENT_FIELDS = ['name', 'description', 'company', 'color'] as const

export type EventFormValues = Record<(typeof EVENT_FIELDS)[number], string>

export type EventFormErrors = Partial<EventFormValues>
