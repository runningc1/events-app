import axios from 'axios'
import type { EventId, EventRecord, NewEvent } from '../types'

// One of five identical endpoints (suffix '', '-2' ... '-5'). Override with VITE_API_BASE.
export const API_BASE: string =
  import.meta.env.VITE_API_BASE ?? 'https://rf-json-server.herokuapp.com/events'

export const getAll = () => axios.get<EventRecord[]>(API_BASE).then((r) => r.data)

export const getOne = (id: EventId) =>
  axios.get<EventRecord>(`${API_BASE}/${id}`).then((r) => r.data)

// POST body must not contain id; the server assigns it.
export const create = (event: NewEvent) =>
  axios.post<EventRecord>(API_BASE, event).then((r) => r.data)

// json-server PUT replaces the whole record, so callers send every field.
export const update = (id: EventId, event: EventRecord) =>
  axios.put<EventRecord>(`${API_BASE}/${id}`, event).then((r) => r.data)

export const remove = (id: EventId) => axios.delete(`${API_BASE}/${id}`)
