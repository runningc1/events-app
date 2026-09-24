import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { update } from '../api/eventsApi'
import { ErrorBanner } from '../components/ErrorBanner'
import { EventForm } from '../components/EventForm'
import { useEvent } from '../hooks/useEvent'
import type { EventFormValues } from '../types'

export function EditEventPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { event, error: loadError } = useEvent(id!)
  const [saveError, setSaveError] = useState<string | null>(null)

  // GET then PUT: json-server PUT replaces the record, so a 4-field PUT would wipe the rest
  // and PATCH is not what the assignment asks for. Then back to the list, which refetches.
  const save = async (values: EventFormValues) => {
    setSaveError(null)
    try {
      await update(event!.id, { ...event!, ...values })
    } catch (err) {
      setSaveError(`Could not update event. ${(err as Error).message}`)
      return false
    }
    navigate('/')
    return true
  }

  return (
    <main>
      <h1>Edit event</h1>
      <ErrorBanner message={loadError ?? saveError} />
      {event ? (
        <EventForm
          initial={event}
          submitLabel="Save"
          onSubmit={save}
          onCancel={() => navigate('/')}
        />
      ) : (
        !loadError && <p>Loading...</p>
      )}
      <Link to="/">Back to events</Link>
    </main>
  )
}
