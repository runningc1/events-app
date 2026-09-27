import { Link, Outlet } from 'react-router'
import { ErrorBanner } from '../components/ErrorBanner'
import { EventList } from '../components/EventList'
import { useEvents } from '../hooks/useEvents'

export function EventsPage() {
  const { events, error, pendingIds, reload, remove } = useEvents()

  return (
    <main>
      <header className="page-header">
        <h1>Events</h1>
        <Link to="/events/add" className="add-link" aria-label="Add event">
          +
        </Link>
      </header>
      <ErrorBanner message={error} onRetry={reload} />
      {events ? (
        <EventList events={events} pendingIds={pendingIds} onDelete={remove} />
      ) : (
        !error && <p>Loading...</p>
      )}
      <Outlet />
    </main>
  )
}
