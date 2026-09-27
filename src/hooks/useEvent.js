import { useEffect, useState } from 'react'
import { getOne } from '../api/eventsApi'

// Loads one event for the detail modal and the edit page. `stale` stops a slow response
// for a previous id from overwriting the current one.
export function useEvent(id) {
  const [event, setEvent] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let stale = false
    getOne(id)
      .then((loaded) => !stale && setEvent(loaded))
      .catch((err) => !stale && setError(`Could not load event ${id}. ${err.message}`))
    return () => {
      stale = true
    }
  }, [id])

  return { event, error }
}
