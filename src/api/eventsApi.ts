import type { EventId, EventRecord, NewEvent } from '../types'

// One of five identical endpoints (suffix '', '-2' ... '-5'). Override with VITE_API_BASE.
export const API_BASE: string =
  import.meta.env.VITE_API_BASE ?? 'https://rf-json-server.herokuapp.com/events'

// status is 0 when no HTTP response was received (network failure).
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// Every API call goes through here, so the JSON header, the res.ok check and the error
// shape exist once. fetch() resolves on 404/500, so res.ok must be checked by hand.
async function request<T>(url: string, method = 'GET', body?: unknown): Promise<T> {
  let res: Response
  try {
    // Content-Type only when there is a body: on GET/DELETE it would just force a CORS preflight.
    res = await fetch(url, {
      method,
      ...(body !== undefined && {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    })
  } catch (err) {
    throw new ApiError(`Network error: ${(err as Error).message}`, 0)
  }
  if (!res.ok) throw new ApiError(`Request failed with status ${res.status}`, res.status)
  if (res.status === 204) return undefined as T
  try {
    return (await res.json()) as T
  } catch {
    throw new ApiError('Response was not valid JSON', res.status)
  }
}

export const getAll = () => request<EventRecord[]>(API_BASE)

export const getOne = (id: EventId) => request<EventRecord>(`${API_BASE}/${id}`)

// POST body must not contain id; the server assigns it.
export const create = (event: NewEvent) => request<EventRecord>(API_BASE, 'POST', event)

// json-server PUT replaces the whole record, so callers send every field.
export const update = (id: EventId, event: EventRecord) =>
  request<EventRecord>(`${API_BASE}/${id}`, 'PUT', event)

export const remove = (id: EventId) => request<unknown>(`${API_BASE}/${id}`, 'DELETE')
