import axios from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from '../api/eventsApi'
import { sortByCompany } from '../utils/sort'

export function useEvents() {
  const [events, setEvents] = useState(null)
  const [error, setError] = useState(null)
  const [pendingIds, setPendingIds] = useState([])
  const latest = useRef(0)

  const reload = useCallback(() => {
    const token = ++latest.current
    return api
      .getAll()
      .then((list) => {
        if (!Array.isArray(list)) throw new Error('Response was not a list of events')
        if (token !== latest.current) return true
        setEvents(sortByCompany(list))
        setError(null)
        return true
      })
      .catch((err) => {
        if (token === latest.current) setError(`Could not load events. ${err.message}`)
        return false
      })
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const mutate = useCallback(
    async (label, action) => {
      try {
        await action()
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) await reload()
        setError(`Could not ${label}. ${err.message}`)
        return false
      }
      return reload()
    },
    [reload],
  )

  const remove = useCallback(
    async (id) => {
      setPendingIds((ids) => [...ids, id])
      try {
        return await mutate('delete event', () => api.remove(id))
      } finally {
        setPendingIds((ids) => ids.filter((pending) => pending !== id))
      }
    },
    [mutate],
  )

  return { events, error, pendingIds, reload, remove }
}
