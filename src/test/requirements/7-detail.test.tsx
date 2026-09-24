import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { renderApp } from '../helpers'
import { captureRequests, makeEvent, seed, slow } from '../server'

// Requirement: Load and display individual event info (name, description) in a modal
// or on a new page with the use of react-router.
describe('7. Individual event modal (routed)', () => {
  beforeEach(() => seed())

  it('clicking an event name navigates to /events/{id} and opens a modal with name and description', async () => {
    renderApp()
    await screen.findByRole('table')
    const requests = captureRequests()

    await userEvent.click(screen.getByRole('link', { name: 'Event 2' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAttribute('open')
    expect(await within(dialog).findByRole('heading', { name: 'Event 2' })).toBeInTheDocument()
    expect(within(dialog).getByText('First event')).toBeInTheDocument()
    expect(requests[0].url).toMatch(/\/events\/2$/) // loaded via GET /events/{id}
    expect(screen.getByRole('table')).toBeInTheDocument() // list stays underneath
  })

  it('a direct link to /events/{id} opens the modal on load', async () => {
    renderApp('/events/3')
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByRole('heading', { name: 'Event 3' })).toBeInTheDocument()
    expect(await screen.findByRole('table')).toBeInTheDocument()
  })

  it('shows a loading state inside the modal before the event arrives', async () => {
    slow('get', '/1')
    renderApp('/events/1')
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Loading...')).toBeInTheDocument()
    await within(dialog).findByRole('heading', { name: 'Event 1' })
    expect(within(dialog).queryByText('Loading...')).not.toBeInTheDocument()
  })

  it('Close button navigates back to / and removes the modal', async () => {
    renderApp('/events/1')
    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByRole('heading', { name: 'Event 1' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Events' })).toBeInTheDocument()
  })

  it('closing the dialog natively (Escape) also navigates back to /', async () => {
    renderApp('/events/1')
    const dialog = await screen.findByRole('dialog')
    act(() => (dialog as HTMLDialogElement).close())
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('clicking the backdrop closes the modal, clicking inside does not', async () => {
    renderApp('/events/1')
    const dialog = await screen.findByRole('dialog')
    const heading = await within(dialog).findByRole('heading', { name: 'Event 1' })

    fireEvent.click(heading)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.click(dialog)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('shows the image, and swaps to a placeholder when it fails to load', async () => {
    seed([makeEvent({ id: 1, image: 'https://example.com/a.png' })])
    renderApp('/events/1')
    const img = await screen.findByRole('img', { name: 'Event 1' })
    expect(img).toHaveAttribute('src', 'https://example.com/a.png')
    fireEvent.error(img)
    expect(screen.getByText('Image not found')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('shows the placeholder when the record has no image URL', async () => {
    seed([makeEvent({ id: 2, name: 'Event 2', image: '' })])
    renderApp('/events/2')
    expect(await screen.findByText('Image not found')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('an unknown route redirects to the list', async () => {
    renderApp('/nowhere/at/all')
    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
