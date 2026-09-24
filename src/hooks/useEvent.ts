import { useEffect, useState } from 'react'
import { getOne } from '../api/eventsApi'
import type { EventId, EventRecord } from '../types'

// Loads one event for the detail modal and the edit page. `stale` stops a slow response
// for a previous id from overwriting the current one.
export function useEvent(id: EventId) {
  const [event, setEvent] = useState<EventRecord | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let stale = false
    getOne(id)
      .then((loaded) => !stale && setEvent(loaded))
      .catch((err: Error) => !stale && setError(`Could not load event ${id}. ${err.message}`))
    return () => {
      stale = true
    }
  }, [id])

  return { event, error }
}
