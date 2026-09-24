import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from '../api/eventsApi'
import type { ApiError } from '../api/eventsApi'
import type { EventRecord, NewEvent } from '../types'
import { sortByCompany } from '../utils/sort'

// Loads the list, sorts it by company, and refetches after every mutation
// so the list always reflects the server. `events` is null until the first load finishes.
export function useEvents() {
  const [events, setEvents] = useState<EventRecord[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingIds, setPendingIds] = useState<ReadonlySet<number>>(new Set())
  const latest = useRef(0)

  // Resolves true when the list was refreshed. Overlapping reloads can resolve out of
  // order, so only the most recent request may touch state.
  const reload = useCallback(() => {
    const token = ++latest.current
    return api
      .getAll()
      .then((list) => {
        if (token !== latest.current) return true
        setEvents(sortByCompany(list))
        setError(null)
        return true
      })
      .catch((err: Error) => {
        if (token === latest.current) setError(`Could not load events. ${err.message}`)
        return false
      })
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  // add and remove differ only in the request they send. mutate holds the shared part:
  // run it, then refetch. Resolves false if either step failed so callers can react.
  // A 404 means the server changed underneath us, so the list is refetched even on failure.
  const mutate = useCallback(
    async (label: string, action: () => Promise<unknown>): Promise<boolean> => {
      try {
        await action()
      } catch (err) {
        if ((err as ApiError).status === 404) await reload()
        setError(`Could not ${label}. ${(err as Error).message}`)
        return false
      }
      return reload()
    },
    [reload],
  )

  const add = useCallback(
    (event: NewEvent) => mutate('add event', () => api.create(event)),
    [mutate],
  )

  // pendingIds lets the list disable a row's Delete button while its request is in flight,
  // so a double-click cannot send a second DELETE that 404s.
  const remove = useCallback(
    async (id: number) => {
      setPendingIds((s) => new Set(s).add(id))
      try {
        return await mutate('delete event', () => api.remove(id))
      } finally {
        setPendingIds((s) => {
          const next = new Set(s)
          next.delete(id)
          return next
        })
      }
    },
    [mutate],
  )

  return { events, error, pendingIds, reload, add, remove }
}
