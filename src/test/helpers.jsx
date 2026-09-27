import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import App from '../App'

export const renderApp = (initialPath = '/') =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>,
  )

export const fillForm = async (values) => {
  const user = userEvent.setup()
  for (const [field, value] of Object.entries(values)) {
    const input = screen.getByLabelText(field)
    await user.clear(input)
    if (value) await user.type(input, value)
  }
  return user
}

export const VALID = { name: 'Launch', description: 'Big day', company: 'ACME', color: 'red' }
