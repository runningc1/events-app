import { delay, http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { API_BASE } from '../api/eventsApi'
import type { EventRecord } from '../types'

// Shared by every test file: one fake server, seeded per test, instead of per-test fetch mocks.
// In-memory stand-in for rf-json-server. Status codes and bodies match what the
// real server returned when probed on 2026-09-24:
//   GET /events 200, GET /events/:id 404 {} when missing, POST 201 (assigns id),
//   PUT 200 replacing the whole record (404 {} when missing), DELETE 200 {} (404 {} when missing).
export let db: EventRecord[] = []

export const makeEvent = (overrides: Partial<EventRecord> = {}): EventRecord => ({
  id: 1,
  name: 'Event 1',
  description: 'First event',
  company: 'GEEKFARM',
  color: 'red',
  isActive: true,
  date: '2021-01-05',
  time: '06:56',
  email: 'a@geekfarm.com',
  phone: '+1 (831) 446-3332',
  address: '697 Brooklyn Road',
  image: 'https://placeimg.com/320/240/arch',
  createdOn: '2020-09-05T03:56:56 +06:00',
  ...overrides,
})

// Three events whose ids are deliberately out of company order, to catch a missing sort.
export const SEED: EventRecord[] = [
  makeEvent({ id: 1, name: 'Event 1', company: 'ZILCH', color: 'green' }),
  makeEvent({ id: 2, name: 'Event 2', company: 'anocha', color: 'blue' }),
  makeEvent({ id: 3, name: 'Event 3', company: 'Geekfarm', color: 'red' }),
]

export const seed = (events: EventRecord[] = SEED) => {
  db = events.map((e) => ({ ...e }))
}

const find = (id: unknown) => db.find((e) => String(e.id) === id)

export const handlers = [
  http.get(API_BASE, () => HttpResponse.json(db)),

  http.get(`${API_BASE}/:id`, ({ params }) => {
    const event = find(params.id)
    return event ? HttpResponse.json(event) : HttpResponse.json({}, { status: 404 })
  }),

  http.post(API_BASE, async ({ request }) => {
    const body = (await request.json()) as Partial<EventRecord>
    const id = db.reduce((max, e) => Math.max(max, e.id), 0) + 1
    const created = { ...body, id } as EventRecord
    db.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.put(`${API_BASE}/:id`, async ({ params, request }) => {
    const index = db.findIndex((e) => String(e.id) === params.id)
    if (index === -1) return HttpResponse.json({}, { status: 404 })
    const body = (await request.json()) as Partial<EventRecord>
    db[index] = { ...body, id: db[index].id } as EventRecord
    return HttpResponse.json(db[index])
  }),

  http.delete(`${API_BASE}/:id`, ({ params }) => {
    const index = db.findIndex((e) => String(e.id) === params.id)
    if (index === -1) return HttpResponse.json({}, { status: 404 })
    db.splice(index, 1)
    return HttpResponse.json({})
  }),
]

export const server = setupServer(...handlers)

type Method = 'get' | 'post' | 'put' | 'delete'

// Make one route fail for the rest of the current test.
export const failWith = (method: Method, status: number, path = '') =>
  server.use(
    http[method](`${API_BASE}${path}`, () => HttpResponse.json({ error: 'boom' }, { status })),
  )

// Delay one route's normal response so in-flight UI states can be asserted.
export const slow = (method: Method, path = '', ms = 100) =>
  server.use(
    http[method](`${API_BASE}${path}`, async () => {
      await delay(ms)
    }),
  )

export const failNetwork = (method: Method, path = '') =>
  server.use(http[method](`${API_BASE}${path}`, () => HttpResponse.error()))

// Records every request so tests can assert on method, URL, headers and body.
export const captureRequests = () => {
  const requests: Request[] = []
  server.events.on('request:start', ({ request }) => {
    requests.push(request.clone())
  })
  return requests
}
