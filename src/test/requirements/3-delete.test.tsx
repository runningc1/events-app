import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { API_BASE } from '../../api/eventsApi'
import { renderApp } from '../helpers'
import { captureRequests, db, seed, SEED, server, slow } from '../server'

// Requirement: A delete link/button to remove an event and update the list after deletion.
describe('3. Delete event', () => {
  beforeEach(() => seed())

  it('sends DELETE /events/{id} and removes the row', async () => {
    renderApp()
    await screen.findByRole('table')
    const requests = captureRequests()

    await userEvent.click(screen.getByRole('button', { name: 'Delete Event 2' }))

    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'Event 2' })).not.toBeInTheDocument(),
    )
    expect(screen.getAllByRole('row')).toHaveLength(3)
    expect(requests[0].method).toBe('DELETE')
    expect(requests[0].url).toMatch(/\/2$/)
    expect(db.map((e) => e.id)).toEqual([1, 3])
  })

  it('refetches the list after deleting', async () => {
    renderApp()
    await screen.findByRole('table')
    const requests = captureRequests()
    await userEvent.click(screen.getByRole('button', { name: 'Delete Event 1' }))
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(3))
    expect(requests.map((r) => r.method)).toEqual(['DELETE', 'GET'])
  })

  it('shows the empty state after deleting the last event', async () => {
    seed([SEED[0]])
    renderApp()
    await screen.findByRole('table')
    await userEvent.click(screen.getByRole('button', { name: 'Delete Event 1' }))
    expect(await screen.findByText('No events yet.')).toBeInTheDocument()
  })

  it('disables the button while the delete is in flight, so a double-click sends one DELETE', async () => {
    renderApp()
    await screen.findByRole('table')
    slow('delete', '/2')
    const requests = captureRequests()
    const button = screen.getByRole('button', { name: 'Delete Event 2' })

    await userEvent.dblClick(button)

    expect(button).toBeDisabled()
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'Event 2' })).not.toBeInTheDocument(),
    )
    expect(requests.filter((r) => r.method === 'DELETE')).toHaveLength(1)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('two quick deletes: a stale refetch response cannot overwrite the newer list', async () => {
    renderApp()
    await screen.findByRole('table')
    // The first refetch snapshots the list, then answers late, after the second refetch.
    server.use(
      http.get(
        API_BASE,
        async () => {
          const snapshot = [...db]
          await delay(200)
          return HttpResponse.json(snapshot)
        },
        { once: true },
      ),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Delete Event 1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete Event 2' }))

    await waitFor(() => expect(screen.queryByRole('link', { name: 'Event 2' })).toBeNull())
    await new Promise((r) => setTimeout(r, 300)) // let the stale response arrive
    expect(screen.queryByRole('link', { name: 'Event 1' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Event 2' })).toBeNull()
    expect(screen.getAllByRole('row')).toHaveLength(2)
  })

  it('deletes every event one after another', async () => {
    renderApp()
    await screen.findByRole('table')
    for (const name of ['Event 3', 'Event 1', 'Event 2']) {
      await userEvent.click(screen.getByRole('button', { name: `Delete ${name}` }))
      await waitFor(() => expect(screen.queryByRole('link', { name })).not.toBeInTheDocument())
    }
    expect(screen.getByText('No events yet.')).toBeInTheDocument()
    expect(db).toHaveLength(0)
  })
})
