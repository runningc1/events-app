import { useState } from 'react'
import { useNavigate } from 'react-router'
import { create } from '../api/eventsApi'
import { ErrorBanner } from '../components/ErrorBanner'
import { EventForm } from '../components/EventForm'
import { buildNewEvent } from '../utils/events'

export function AddEventPage() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  // POST, then back to the list, which refetches on mount. On failure the form keeps its values.
  const save = async (values) => {
    setError(null)
    try {
      await create(buildNewEvent(values))
    } catch (err) {
      setError(`Could not add event. ${err.message}`)
      return false
    }
    navigate('/')
    return true
  }

  return (
    <main>
      <h1>Add event</h1>
      <ErrorBanner message={error} />
      <EventForm submitLabel="Add" onSubmit={save} onCancel={() => navigate('/')} />
    </main>
  )
}
