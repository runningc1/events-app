import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { fillForm, renderApp } from '../helpers'
import { makeEvent, seed } from '../server'

// Requirement: Sort by company name after loading.
const companyColumn = () =>
  within(screen.getByRole('table'))
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[2].textContent)

describe('5. Sort by company', () => {
  beforeEach(() => seed())

  it('shows events sorted by company even though the API returns them in id order', async () => {
    renderApp()
    await screen.findByRole('table')
    // API order is ZILCH, anocha, Geekfarm (ids 1, 2, 3).
    expect(companyColumn()).toEqual(['anocha', 'Geekfarm', 'ZILCH'])
  })

  it('sorts case-insensitively', async () => {
    seed([
      makeEvent({ id: 1, name: 'a', company: 'zeta' }),
      makeEvent({ id: 2, name: 'b', company: 'Alpha' }),
      makeEvent({ id: 3, name: 'c', company: 'BETA' }),
    ])
    renderApp()
    await screen.findByRole('table')
    expect(companyColumn()).toEqual(['Alpha', 'BETA', 'zeta'])
  })

  it('keeps the list sorted after adding an event that belongs in the middle', async () => {
    renderApp()
    await screen.findByRole('table')
    const user = await fillForm({ name: 'Mid', description: 'd', company: 'Delta', color: 'red' })
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await screen.findByRole('link', { name: 'Mid' })
    expect(companyColumn()).toEqual(['anocha', 'Delta', 'Geekfarm', 'ZILCH'])
  })

  it('keeps the list sorted after deleting', async () => {
    renderApp()
    await screen.findByRole('table')
    await userEvent.click(screen.getByRole('button', { name: 'Delete Event 3' })) // Geekfarm
    await waitFor(() => expect(companyColumn()).toEqual(['anocha', 'ZILCH']))
  })

  it('re-sorts after an edit changes the company', async () => {
    renderApp('/events/2/edit') // anocha, currently first
    await screen.findByRole('button', { name: 'Save' })
    const user = await fillForm({ company: 'Zzz Corp' })
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByRole('table')
    expect(companyColumn()).toEqual(['Geekfarm', 'ZILCH', 'Zzz Corp'])
  })
})
