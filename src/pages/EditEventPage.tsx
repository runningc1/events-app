import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { getOne, update } from '../api/eventsApi'
import { ErrorBanner } from '../components/ErrorBanner'
import { EventForm } from '../components/EventForm'
import type { EventFormValues, EventRecord } from '../types'
import { applyEdits, toFormValues } from '../utils/events'

export function EditEventPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState<EventRecord | null>(null)
  const [error, setError] = useState<string | null>(null)

  // `stale` stops a slow response for a previous id from overwriting the current one.
  useEffect(() => {
    let stale = false
    getOne(id!)
      .then((e) => !stale && setEvent(e))
      .catch((err: Error) => !stale && setError(`Could not load event ${id}. ${err.message}`))
    return () => {
      stale = true
    }
  }, [id])

  // GET then PUT: json-server PUT replaces the record, so a 4-field PUT would wipe the rest
  // and PATCH is not what the assignment asks for. Then back to the list, which refetches.
  const save = async (values: EventFormValues) => {
    setError(null)
    try {
      await update(event!.id, applyEdits(event!, values))
    } catch (err) {
      setError(`Could not update event. ${(err as Error).message}`)
      return false
    }
    navigate('/')
    return true
  }

  return (
    <main>
      <h1>Edit event</h1>
      <ErrorBanner message={error} />
      {event ? (
        <EventForm
          initial={toFormValues(event)}
          submitLabel="Save"
          onSubmit={save}
          onCancel={() => navigate('/')}
        />
      ) : (
        !error && <p>Loading...</p>
      )}
      <Link to="/">Back to events</Link>
    </main>
  )
}
