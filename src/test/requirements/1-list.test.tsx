import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { renderApp } from '../helpers'
import { makeEvent, seed } from '../server'

// Requirement: A page to show a list of events. Display the name, description, company.
describe('1. List page', () => {
  beforeEach(() => seed())

  it('shows a loading state, then name, description and company for every event', async () => {
    renderApp()
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    const rows = await screen.findAllByRole('row')
    expect(rows).toHaveLength(4) // header + 3 events
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()

    for (const e of [
      { name: 'Event 1', description: 'First event', company: 'ZILCH' },
      { name: 'Event 2', description: 'First event', company: 'anocha' },
      { name: 'Event 3', description: 'First event', company: 'Geekfarm' },
    ]) {
      const row = screen.getByRole('link', { name: e.name }).closest('tr')!
      expect(within(row).getByText(e.description)).toBeInTheDocument()
      expect(within(row).getByText(e.company)).toBeInTheDocument()
    }
  })

  it('shows an empty state when the API returns no events', async () => {
    seed([])
    renderApp()
    expect(await screen.findByText('No events yet.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('renders records that are missing optional fields without crashing', async () => {
    seed([{ id: 9, name: 'Sparse', company: 'ZED' } as ReturnType<typeof makeEvent>])
    renderApp()
    expect(await screen.findByRole('link', { name: 'Sparse' })).toBeInTheDocument()
    expect(screen.getByText('ZED')).toBeInTheDocument()
  })

  it('renders long text and HTML-looking text as plain text', async () => {
    const description = '<script>alert(1)</script> '.repeat(5)
    seed([makeEvent({ description })])
    renderApp()
    expect(await screen.findByText(description.trim())).toBeInTheDocument()
    expect(document.querySelector('script')).toBeNull()
  })
})
