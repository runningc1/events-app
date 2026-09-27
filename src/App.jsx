import { Navigate, Route, Routes } from 'react-router'
import { EventDetailModal } from './components/EventDetailModal'
import { EditEventPage } from './pages/EditEventPage'
import { EventsPage } from './pages/EventsPage'

// /events/:id is nested under / so the detail modal renders over the list.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<EventsPage />}>
        <Route path="events/:id" element={<EventDetailModal />} />
      </Route>
      <Route path="/events/:id/edit" element={<EditEventPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
