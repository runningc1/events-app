import { beforeEach, describe, expect, it } from 'vitest'
import { isAxiosError } from 'axios'
import { API_BASE, create, getAll, getOne, remove, update } from './eventsApi'
import {
  captureRequests,
  db,
  failNetwork,
  failWith,
  makeEvent,
  seed,
  server,
  SEED,
} from '../test/server'
import { http, HttpResponse } from 'msw'

beforeEach(() => seed())

describe('eventsApi: request contract', () => {
  it('getAll GETs the collection and returns every record', async () => {
    const requests = captureRequests()
    await expect(getAll()).resolves.toEqual(SEED)
    expect(requests[0].method).toBe('GET')
    expect(requests[0].url).toBe(API_BASE)
  })

  it('getOne GETs /events/{id}', async () => {
    const requests = captureRequests()
    await expect(getOne(2)).resolves.toEqual(SEED[1])
    expect(requests[0].url).toBe(`${API_BASE}/2`)
  })

  it('create POSTs the body without an id and returns the record with the assigned id', async () => {
    const requests = captureRequests()
    const { id: _id, ...body } = makeEvent({ name: 'New', company: 'NEWCO' })
    const created = await create(body)
    expect(requests[0].method).toBe('POST')
    expect(await requests[0].json()).not.toHaveProperty('id')
    expect(created).toEqual({ ...body, id: 4 })
    expect(db).toHaveLength(4)
  })

  it('update PUTs the full record to /events/{id}', async () => {
    const requests = captureRequests()
    const changed = { ...SEED[0], name: 'Renamed', color: 'blue' }
    await expect(update(1, changed)).resolves.toEqual(changed)
    expect(requests[0].method).toBe('PUT')
    expect(requests[0].url).toBe(`${API_BASE}/1`)
    expect(await requests[0].json()).toEqual(changed)
  })

  it('remove DELETEs /events/{id}', async () => {
    const requests = captureRequests()
    await remove(3)
    expect(requests[0].method).toBe('DELETE')
    expect(requests[0].url).toBe(`${API_BASE}/3`)
    expect(db.map((e) => e.id)).toEqual([1, 2])
  })

  it('sends Content-Type: application/json on requests with a body, and not otherwise', async () => {
    const requests = captureRequests()
    await getAll()
    await getOne(1)
    await create(makeEvent())
    await update(1, makeEvent())
    await remove(1)
    expect(requests.map((r) => [r.method, r.headers.get('content-type')])).toEqual([
      ['GET', null],
      ['GET', null],
      ['POST', 'application/json'],
      ['PUT', 'application/json'],
      ['DELETE', null],
    ])
  })

  it('treats a 204 with no body as success', async () => {
    server.use(http.delete(`${API_BASE}/1`, () => new HttpResponse(null, { status: 204 })))
    await expect(remove(1)).resolves.toMatchObject({ status: 204 })
  })
})

describe('eventsApi: failures reject with the HTTP status', () => {
  it.each([404, 500, 503])('rejects with status %i when the server returns it', async (status) => {
    failWith('get', status)
    const err = await getAll().catch((e) => e)
    expect(isAxiosError(err) && err.response?.status).toBe(status)
  })

  it.each([
    ['getOne', () => getOne(999)],
    ['update', () => update(999, makeEvent({ id: 999 }))],
    ['remove', () => remove(999)],
  ])('%s on a missing id rejects with 404', async (_name, call) => {
    await expect(call()).rejects.toMatchObject({ response: { status: 404 } })
  })

  it('rejects with no response when the network fails', async () => {
    failNetwork('post')
    const err = await create(makeEvent()).catch((e) => e)
    expect(isAxiosError(err)).toBe(true)
    expect(isAxiosError(err) && err.response).toBeUndefined()
  })

  it('does not mutate the store when the request fails', async () => {
    failWith('delete', 500, '/1')
    await expect(remove(1)).rejects.toMatchObject({ response: { status: 500 } })
    expect(db).toHaveLength(3)
  })
})
