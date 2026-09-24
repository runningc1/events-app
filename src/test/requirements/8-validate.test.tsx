import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { fillForm, renderApp, VALID } from '../helpers'
import { captureRequests, db, seed } from '../server'

// Requirement: Validate inputs. (Rule-level cases are in utils/validate.test.ts;
// these cover the form behaviour the user sees.)
describe('8. Input validation in the form', () => {
  beforeEach(() => seed())

  it('submitting an empty form shows Required under every field and sends nothing', async () => {
    renderApp()
    await screen.findByRole('table')
    const requests = captureRequests()

    await userEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getAllByText('Required')).toHaveLength(4)
    for (const field of ['name', 'description', 'company', 'color']) {
      const input = screen.getByLabelText(field)
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveAccessibleDescription('Required')
    }
    expect(requests).toHaveLength(0)
    expect(db).toHaveLength(3)
  })

  it('flags only the fields that are wrong', async () => {
    renderApp()
    await screen.findByRole('table')
    const user = await fillForm({
      ...VALID,
      company: '   ',
      color: 'not-a-color',
    })
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getAllByText('Required')).toHaveLength(1)
    expect(screen.getByLabelText('company')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('color')).toHaveAccessibleDescription(/named color/)
    expect(screen.getByLabelText('name')).toHaveAttribute('aria-invalid', 'false')
  })

  it.each(['#ff0000', 'rgb(255, 0, 0)', 'reddish', 'light blue', 'Test 2 steelblue', 'steelblue!'])(
    'rejects color %j',
    async (color) => {
      renderApp()
      await screen.findByRole('table')
      const requests = captureRequests()
      const user = await fillForm({ ...VALID, color })
      await user.click(screen.getByRole('button', { name: 'Add' }))
      expect(await screen.findByText(/named color/)).toBeInTheDocument()
      expect(requests).toHaveLength(0)
    },
  )

  it('offers every CSS named color as a suggestion on the color field and says what is expected', async () => {
    renderApp()
    await screen.findByRole('table')
    const input = screen.getByLabelText('color')
    expect(input).toHaveAttribute('placeholder', expect.stringMatching(/red, steelblue/))
    const listId = input.getAttribute('list')!
    const options = document.querySelectorAll(`datalist[id="${listId}"] option`)
    expect(options).toHaveLength(148)
    expect([...options].map((o) => (o as HTMLOptionElement).value)).toContain('steelblue')
  })

  it.each(['red', 'Red', 'STEELBLUE', ' teal '])('accepts color %j', async (color) => {
    renderApp()
    await screen.findByRole('table')
    const user = await fillForm({ ...VALID, color })
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(await screen.findByRole('link', { name: 'Launch' })).toBeInTheDocument()
    expect(screen.queryByText(/named color/)).not.toBeInTheDocument()
  })

  it('clears a field error as soon as the user edits that field', async () => {
    renderApp()
    await screen.findByRole('table')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getAllByText('Required')).toHaveLength(4)

    await user.type(screen.getByLabelText('name'), 'L')

    expect(screen.getAllByText('Required')).toHaveLength(3)
    expect(screen.getByLabelText('name')).toHaveAttribute('aria-invalid', 'false')
  })

  it('a field fixed after an error submits successfully', async () => {
    renderApp()
    await screen.findByRole('table')
    const user = await fillForm({ ...VALID, color: 'nope' })
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await screen.findByText(/named color/)

    await user.clear(screen.getByLabelText('color'))
    await user.type(screen.getByLabelText('color'), 'olive')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(await screen.findByRole('link', { name: 'Launch' })).toBeInTheDocument()
    expect(db.at(-1)?.color).toBe('olive')
  })

  it('applies the same rules on the edit form', async () => {
    renderApp('/events/1/edit')
    await screen.findByRole('button', { name: 'Save' })
    const requests = captureRequests()
    const user = await fillForm({ description: '', color: 'purple-ish' })
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByText('Required')).toBeInTheDocument()
    expect(screen.getByText(/named color/)).toBeInTheDocument()
    expect(requests).toHaveLength(0)
  })

  it('rejects a value over the length limit', async () => {
    renderApp()
    await screen.findByRole('table')
    const user = await fillForm({ ...VALID, name: 'x'.repeat(201) })
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(await screen.findByText(/200 characters or fewer/)).toBeInTheDocument()
  })
})
