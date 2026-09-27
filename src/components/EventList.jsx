import { Link } from 'react-router'
import { isNamedColor } from '../utils/colors'

export function EventList({ events, pendingIds, onDelete }) {
  if (events.length === 0) return <p>No events yet.</p>
  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Description</th>
          <th>Company</th>
          <th>Color</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {events.map((e) => (
          <tr key={e.id}>
            <td>
              <Link to={`/events/${e.id}`}>{e.name}</Link>
            </td>
            <td>{e.description}</td>
            <td>{e.company}</td>
            <td>
              {isNamedColor(String(e.color ?? '')) && (
                <span className="swatch" style={{ background: e.color }} />
              )}{' '}
              {e.color}
            </td>
            <td>
              <Link to={`/events/${e.id}/edit`}>Edit</Link>{' '}
              <button
                type="button"
                onClick={() => onDelete(e.id)}
                disabled={pendingIds.includes(e.id)}
                aria-label={`Delete ${e.name}`}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
