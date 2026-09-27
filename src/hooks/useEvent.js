import { useEffect, useState } from 'react'
import { getOne } from '../api/eventsApi'

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
