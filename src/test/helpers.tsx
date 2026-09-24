import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import App from '../App'

// Renders the whole app at a URL, so tests exercise real routing. Every requirement test
// starts here, so the router wrapper is set up once rather than in each file.
export const renderApp = (initialPath = '/') =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>,
  )

// Clears and types into the labelled inputs. Returns the user-event instance for further actions.
export const fillForm = async (values: Record<string, string>) => {
  const user = userEvent.setup()
  for (const [field, value] of Object.entries(values)) {
    const input = screen.getByLabelText(field)
    await user.clear(input)
    if (value) await user.type(input, value)
  }
  return user
}

export const VALID = { name: 'Launch', description: 'Big day', company: 'ACME', color: 'red' }
