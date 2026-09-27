import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { update } from '../api/eventsApi'
import { ErrorBanner } from '../components/ErrorBanner'
import { EventForm } from '../components/EventForm'
import { useEvent } from '../hooks/useEvent'

export function EditEventPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { event, error: loadError } = useEvent(id)
  const [saveError, setSaveError] = useState(null)

  const save = async (values) => {
    setSaveError(null)
    try {
      await update(event.id, { ...event, ...values })
    } catch (err) {
      setSaveError(`Could not update event. ${err.message}`)
      return
    }
    navigate('/')
  }

  return (
    <main>
      <h1>Edit event</h1>
      <ErrorBanner message={loadError ?? saveError} />
      {event ? (
        <EventForm
          initial={{
            name: event.name,
            description: event.description,
            company: event.company,
            color: event.color,
          }}
          submitLabel="Save"
          onSubmit={save}
          onCancel={() => navigate('/')}
        />
      ) : (
        !loadError && <p>Loading...</p>
      )}
    </main>
  )
}
