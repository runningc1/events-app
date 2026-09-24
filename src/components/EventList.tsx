import { Link } from 'react-router'
import type { EventRecord } from '../types'
import { isNamedColor } from '../utils/colors'

interface Props {
  events: EventRecord[]
  pendingIds: ReadonlySet<number>
  onDelete: (id: number) => void
}

export function EventList({ events, pendingIds, onDelete }: Props) {
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
              {/* Only a known color name reaches the style attribute; the server is shared and unvalidated. */}
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
                disabled={pendingIds.has(e.id)}
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
