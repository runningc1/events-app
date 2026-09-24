import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { fillForm, renderApp } from '../helpers'
import { captureRequests, db, seed } from '../server'

// Requirement: Update an event. At a minimum, update the name, description, company, color.
describe('6. Update event', () => {
  beforeEach(() => seed())

  it('Edit link opens /events/{id}/edit with the current values filled in', async () => {
    renderApp()
    await screen.findByRole('table')
    const row = screen.getByRole('link', { name: 'Event 2' }).closest('tr')!
    await userEvent.click(within(row).getByRole('link', { name: 'Edit' }))

    expect(await screen.findByRole('heading', { name: 'Edit event' })).toBeInTheDocument()
    expect(await screen.findByLabelText('name')).toHaveValue('Event 2')
    expect(screen.getByLabelText('description')).toHaveValue('First event')
    expect(screen.getByLabelText('company')).toHaveValue('anocha')
    expect(screen.getByLabelText('color')).toHaveValue('blue')
  })

  it('PUTs the full record with all four fields changed, then shows the updated list', async () => {
    renderApp('/events/2/edit')
    await screen.findByRole('button', { name: 'Save' })
    const requests = captureRequests()

    const user = await fillForm({
      name: 'Renamed',
      description: 'New text',
      company: 'NEWCO',
      color: 'Navy',
    })
    await user.click(screen.getByRole('button', { name: 'Save' }))

    const row = (await screen.findByRole('link', { name: 'Renamed' })).closest('tr')!
    expect(within(row).getByText('New text')).toBeInTheDocument()
    expect(within(row).getByText('NEWCO')).toBeInTheDocument()
    expect(within(row).getByText('navy')).toBeInTheDocument()

    const put = requests.find((r) => r.method === 'PUT')!
    expect(put.url).toMatch(/\/2$/)
    expect(put.headers.get('content-type')).toBe('application/json')
    const body = await put.json()
    expect(body).toMatchObject({
      id: 2,
      name: 'Renamed',
      description: 'New text',
      company: 'NEWCO',
      color: 'navy',
    })
    // json-server PUT replaces the record, so untouched fields must be sent too.
    expect(body).toMatchObject({ email: 'a@geekfarm.com', isActive: true, date: '2021-01-05' })
    expect(db.find((e) => e.id === 2)).toEqual(body)
  })

  it('updates a single field and leaves the others as they were', async () => {
    renderApp('/events/1/edit')
    await screen.findByRole('button', { name: 'Save' })
    const user = await fillForm({ color: 'gold' })
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByRole('table')
    expect(db.find((e) => e.id === 1)).toMatchObject({
      name: 'Event 1',
      company: 'ZILCH',
      color: 'gold',
    })
  })

  it('saving without changes still succeeds and returns to the list', async () => {
    renderApp('/events/3/edit')
    await screen.findByRole('button', { name: 'Save' })
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByRole('heading', { name: 'Events' })).toBeInTheDocument()
    expect(db.find((e) => e.id === 3)?.name).toBe('Event 3')
  })

  it('Cancel returns to the list without sending a request', async () => {
    renderApp('/events/1/edit')
    await screen.findByRole('button', { name: 'Save' })
    const requests = captureRequests()
    const user = await fillForm({ name: 'Discarded' })
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(await screen.findByRole('link', { name: 'Event 1' })).toBeInTheDocument()
    expect(requests.filter((r) => r.method === 'PUT')).toHaveLength(0)
    expect(db[0].name).toBe('Event 1')
  })

  it('does not send the PUT when the edited values are invalid', async () => {
    renderApp('/events/1/edit')
    await screen.findByRole('button', { name: 'Save' })
    const requests = captureRequests()
    const user = await fillForm({ name: '', color: '#123456' })
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findAllByText(/Required|named color/)).toHaveLength(2)
    expect(requests).toHaveLength(0)
    expect(screen.getByRole('heading', { name: 'Edit event' })).toBeInTheDocument()
  })
})
