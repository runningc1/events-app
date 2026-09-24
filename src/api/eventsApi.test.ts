import { beforeEach, describe, expect, it } from 'vitest'
import { API_BASE, ApiError, create, getAll, getOne, remove, update } from './eventsApi'
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
    await expect(remove(1)).resolves.toBeUndefined()
  })
})

describe('eventsApi: failures become ApiError', () => {
  it.each([404, 500, 503])('rejects with status %i when the server returns it', async (status) => {
    failWith('get', status)
    const err = await getAll().catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(status)
    expect((err as ApiError).message).toContain(String(status))
  })

  it('getOne on a missing id rejects with 404 (server returns {} with 404)', async () => {
    await expect(getOne(999)).rejects.toMatchObject({ status: 404 })
  })

  it('update on a missing id rejects with 404', async () => {
    await expect(update(999, makeEvent({ id: 999 }))).rejects.toMatchObject({ status: 404 })
  })

  it('remove on a missing id rejects with 404', async () => {
    await expect(remove(999)).rejects.toMatchObject({ status: 404 })
  })

  it('rejects with status 0 when the network fails', async () => {
    failNetwork('post')
    const err = await create(makeEvent()).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(0)
    expect((err as ApiError).message).toMatch(/network/i)
  })

  it('rejects when a 200 response body is not JSON', async () => {
    server.use(http.get(API_BASE, () => new HttpResponse('<html>oops</html>', { status: 200 })))
    await expect(getAll()).rejects.toMatchObject({ status: 200, message: /not valid JSON/ })
  })

  it('does not mutate the store when the request fails', async () => {
    failWith('delete', 500, '/1')
    await expect(remove(1)).rejects.toBeInstanceOf(ApiError)
    expect(db).toHaveLength(3)
  })
})
