import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { API_BASE } from '../../api/eventsApi'
import { fillForm, renderApp, VALID } from '../helpers'
import { db, failNetwork, failWith, makeEvent, seed, server } from '../server'

// Requirement: Demonstrate error handling methodologies to account for API failures.
// The real API rarely fails, so every failure is simulated here.
describe('4. API error handling', () => {
  beforeEach(() => seed())

  describe('loading the list', () => {
    it.each([500, 503, 404])(
      'shows an error with the status when GET returns %i',
      async (status) => {
        failWith('get', status)
        renderApp()
        const alert = await screen.findByRole('alert')
        expect(alert).toHaveTextContent('Could not load events')
        expect(alert).toHaveTextContent(String(status))
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      },
    )

    it('shows an error rather than hanging on Loading when a record has the wrong shape', async () => {
      seed([
        makeEvent({ id: 1 }),
        { id: 2, company: 42 } as unknown as ReturnType<typeof makeEvent>,
      ])
      renderApp()
      expect(await screen.findByRole('table')).toBeInTheDocument()
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    it('shows an error, not Loading, when the list response is not an array', async () => {
      server.use(http.get(API_BASE, () => HttpResponse.json({ not: 'a list' })))
      renderApp()
      expect(await screen.findByRole('alert')).toHaveTextContent('Could not load events')
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    it('shows a network error when the request never reaches the server', async () => {
      failNetwork('get')
      renderApp()
      expect(await screen.findByRole('alert')).toHaveTextContent(/network error/i)
    })

    it('shows an error when the response is not JSON', async () => {
      server.use(http.get(API_BASE, () => new HttpResponse('<html>', { status: 200 })))
      renderApp()
      expect(await screen.findByRole('alert')).toHaveTextContent(/not valid JSON/)
    })

    it('Retry reloads the list and clears the error once the API recovers', async () => {
      failWith('get', 500)
      renderApp()
      await screen.findByRole('alert')

      server.resetHandlers()
      await userEvent.click(screen.getByRole('button', { name: 'Retry' }))

      expect(await screen.findByRole('table')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('Retry keeps showing the error while the API is still down', async () => {
      failWith('get', 500)
      renderApp()
      await screen.findByRole('alert')
      await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('500')
    })
  })

  describe('adding', () => {
    it('shows an error, keeps the typed values, and leaves the list unchanged when POST fails', async () => {
      renderApp()
      await screen.findByRole('table')
      failWith('post', 500)

      const user = await fillForm(VALID)
      await user.click(screen.getByRole('button', { name: 'Add' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Could not add event')
      expect(screen.getByLabelText('name')).toHaveValue('Launch')
      expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled()
      expect(screen.queryByRole('link', { name: 'Launch' })).not.toBeInTheDocument()
      expect(db).toHaveLength(3)
    })

    it('keeps the typed values when the POST succeeds but the refetch fails', async () => {
      renderApp()
      await screen.findByRole('table')
      const user = await fillForm(VALID)
      failWith('get', 500)
      await user.click(screen.getByRole('button', { name: 'Add' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Could not load events')
      expect(screen.getByLabelText('name')).toHaveValue('Launch')
      expect(db.at(-1)?.name).toBe('Launch')
    })

    it('recovers: the same values submit successfully once the API is back', async () => {
      renderApp()
      await screen.findByRole('table')
      failNetwork('post')
      const user = await fillForm(VALID)
      await user.click(screen.getByRole('button', { name: 'Add' }))
      await screen.findByRole('alert')

      server.resetHandlers()
      await user.click(screen.getByRole('button', { name: 'Add' }))

      expect(await screen.findByRole('link', { name: 'Launch' })).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('deleting', () => {
    it('shows an error and keeps the row when DELETE fails', async () => {
      renderApp()
      await screen.findByRole('table')
      failWith('delete', 500, '/1')

      await userEvent.click(screen.getByRole('button', { name: 'Delete Event 1' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Could not delete event')
      expect(screen.getByRole('link', { name: 'Event 1' })).toBeInTheDocument()
      expect(db).toHaveLength(3)
    })

    it('reports 404 when the event was already deleted elsewhere, and refetches so the row goes away', async () => {
      renderApp()
      await screen.findByRole('table')
      db.splice(0, 1) // someone else deleted Event 1
      await userEvent.click(screen.getByRole('button', { name: 'Delete Event 1' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('404')
      await waitFor(() =>
        expect(screen.queryByRole('link', { name: 'Event 1' })).not.toBeInTheDocument(),
      )
      expect(screen.getAllByRole('row')).toHaveLength(3)
    })

    it('a later successful action clears the earlier error', async () => {
      renderApp()
      await screen.findByRole('table')
      failWith('delete', 500, '/1')
      await userEvent.click(screen.getByRole('button', { name: 'Delete Event 1' }))
      await screen.findByRole('alert')

      server.resetHandlers()
      await userEvent.click(screen.getByRole('button', { name: 'Delete Event 2' }))
      await waitFor(() =>
        expect(screen.queryByRole('link', { name: 'Event 2' })).not.toBeInTheDocument(),
      )
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('viewing one event', () => {
    it('shows an error inside the modal when the event does not exist (404)', async () => {
      renderApp('/events/999')
      const dialog = await screen.findByRole('dialog')
      expect(await screen.findByRole('alert')).toHaveTextContent(/Could not load event 999.*404/)
      expect(dialog).toBeInTheDocument()
      expect(screen.queryByText('Loading...', { selector: 'dialog p' })).not.toBeInTheDocument()
    })

    it('shows an error when GET /events/{id} returns 500', async () => {
      failWith('get', 500, '/1')
      renderApp('/events/1')
      expect(await screen.findByRole('alert')).toHaveTextContent('500')
    })
  })

  describe('updating', () => {
    it('shows an error when the event to edit cannot be loaded', async () => {
      renderApp('/events/999/edit')
      expect(await screen.findByRole('alert')).toHaveTextContent(/Could not load event 999.*404/)
      expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    })

    it('shows an error, stays on the edit page and keeps the values when PUT fails', async () => {
      renderApp('/events/1/edit')
      await screen.findByRole('button', { name: 'Save' })
      failWith('put', 500, '/1')

      const user = await fillForm({ name: 'Renamed' })
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Could not update event')
      expect(screen.getByRole('heading', { name: 'Edit event' })).toBeInTheDocument()
      expect(screen.getByLabelText('name')).toHaveValue('Renamed')
      expect(db[0].name).toBe('Event 1')
    })

    it('reports 404 when the event was deleted between load and save', async () => {
      renderApp('/events/1/edit')
      await screen.findByRole('button', { name: 'Save' })
      db.splice(0, 1)
      await userEvent.click(screen.getByRole('button', { name: 'Save' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('404')
    })
  })
})
