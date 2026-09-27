import { Outlet } from 'react-router'
import { ErrorBanner } from '../components/ErrorBanner'
import { EventForm } from '../components/EventForm'
import { EventList } from '../components/EventList'
import { useEvents } from '../hooks/useEvents'
import { buildNewEvent } from '../utils/events'

export function EventsPage() {
  const { events, error, pendingIds, reload, add, remove } = useEvents()

  return (
    <main>
      <h1>Events</h1>
      <ErrorBanner message={error} onRetry={reload} />

      <section>
        <h2>Add event</h2>
        <EventForm
          submitLabel="Add"
          onSubmit={(values) => add(buildNewEvent(values))}
          resetOnSuccess
        />
      </section>

      <section>
        <h2>All events</h2>
        {events ? (
          <EventList events={events} pendingIds={pendingIds} onDelete={remove} />
        ) : (
          !error && <p>Loading...</p>
        )}
      </section>

      <Outlet />
    </main>
  )
}
