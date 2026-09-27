import { delay, http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { API_BASE } from '../api/eventsApi'

export let db = []

export const makeEvent = (overrides = {}) => ({
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

export const SEED = [
  makeEvent({ id: 1, name: 'Event 1', company: 'ZILCH', color: 'green' }),
  makeEvent({ id: 2, name: 'Event 2', company: 'anocha', color: 'blue' }),
  makeEvent({ id: 3, name: 'Event 3', company: 'Geekfarm', color: 'red' }),
]

export const seed = (events = SEED) => {
  db = events.map((e) => ({ ...e }))
}

const find = (id) => db.find((e) => String(e.id) === id)

export const handlers = [
  http.get(API_BASE, () => HttpResponse.json(db)),

  http.get(`${API_BASE}/:id`, ({ params }) => {
    const event = find(params.id)
    return event ? HttpResponse.json(event) : HttpResponse.json({}, { status: 404 })
  }),

  http.post(API_BASE, async ({ request }) => {
    const body = await request.json()
    const id = db.reduce((max, e) => Math.max(max, e.id), 0) + 1
    const created = { ...body, id }
    db.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.put(`${API_BASE}/:id`, async ({ params, request }) => {
    const index = db.findIndex((e) => String(e.id) === params.id)
    if (index === -1) return HttpResponse.json({}, { status: 404 })
    const body = await request.json()
    db[index] = { ...body, id: db[index].id }
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

export const failWith = (method, status, path = '') =>
  server.use(
    http[method](`${API_BASE}${path}`, () => HttpResponse.json({ error: 'boom' }, { status })),
  )

export const slow = (method, path = '', ms = 100) =>
  server.use(
    http[method](`${API_BASE}${path}`, async () => {
      await delay(ms)
    }),
  )

export const failNetwork = (method, path = '') =>
  server.use(http[method](`${API_BASE}${path}`, () => HttpResponse.error()))

export const captureRequests = () => {
  const requests = []
  server.events.on('request:start', ({ request }) => {
    requests.push(request.clone())
  })
  return requests
}
