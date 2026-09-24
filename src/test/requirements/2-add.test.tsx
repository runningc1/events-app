import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { fillForm, renderApp, VALID } from '../helpers'
import { captureRequests, db, seed, slow } from '../server'

// Requirement: A form to add a new event and update the list after addition.
// At a minimum, save name, description, company, color (a web safe named color).

describe('2. Add event', () => {
  beforeEach(() => seed())

  it('POSTs the four fields without an id and shows the new event in the list', async () => {
    renderApp()
    await screen.findByRole('table')
    const requests = captureRequests()

    const user = await fillForm({
      name: 'Launch',
      description: 'Big day',
      company: 'ACME',
      color: 'Teal',
    })
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(await screen.findByRole('link', { name: 'Launch' })).toBeInTheDocument()
    const post = requests.find((r) => r.method === 'POST')!
    const body = await post.json()
    expect(body).toMatchObject({
      name: 'Launch',
      description: 'Big day',
      company: 'ACME',
      color: 'teal',
    })
    expect(body).not.toHaveProperty('id')
    expect(post.headers.get('content-type')).toBe('application/json')
    expect(db).toHaveLength(4)
  })

  it('refetches the list after adding, so the new row comes from the server', async () => {
    renderApp()
    await screen.findByRole('table')
    const requests = captureRequests()

    const user = await fillForm(VALID)
    await user.click(screen.getByRole('button', { name: 'Add' }))

    await screen.findByRole('link', { name: 'Launch' })
    expect(requests.map((r) => r.method)).toEqual(['POST', 'GET'])
    expect(screen.getAllByRole('row')).toHaveLength(5)
  })

  it('clears the form after a successful add', async () => {
    renderApp()
    await screen.findByRole('table')
    const user = await fillForm(VALID)
    await user.click(screen.getByRole('button', { name: 'Add' }))

    await screen.findByRole('link', { name: 'Launch' })
    for (const field of ['name', 'description', 'company', 'color']) {
      expect(screen.getByLabelText(field)).toHaveValue('')
    }
  })

  it('trims surrounding whitespace before saving', async () => {
    renderApp()
    await screen.findByRole('table')
    const user = await fillForm({
      name: '  Padded  ',
      description: ' d ',
      company: ' ACME ',
      color: ' RED ',
    })
    await user.click(screen.getByRole('button', { name: 'Add' }))

    await screen.findByRole('link', { name: 'Padded' })
    expect(db.at(-1)).toMatchObject({
      name: 'Padded',
      description: 'd',
      company: 'ACME',
      color: 'red',
    })
  })

  it('disables the submit button while the request is in flight', async () => {
    renderApp()
    await screen.findByRole('table')
    slow('post')
    const user = await fillForm(VALID)
    const button = screen.getByRole('button', { name: 'Add' })
    await user.click(button)
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled())
  })

  it('adds a second event into an empty list', async () => {
    seed([])
    renderApp()
    await screen.findByText('No events yet.')
    const user = await fillForm({ name: 'Only', description: 'd', company: 'ACME', color: 'red' })
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(await screen.findByRole('link', { name: 'Only' })).toBeInTheDocument()
    expect(screen.queryByText('No events yet.')).not.toBeInTheDocument()
  })
})
