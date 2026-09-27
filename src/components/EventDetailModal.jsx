import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useEvent } from '../hooks/useEvent'
import { ErrorBanner } from './ErrorBanner'
import { EventImage } from './EventImage'

export function EventDetailModal() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dialogRef = useRef(null)
  const { event, error } = useEvent(id)

  const close = () => navigate('/')

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      aria-label={event?.name ?? 'Event details'}
      onClose={close}
      onClick={(e) => e.target === dialogRef.current && close()}
    >
      <div className="dialog-body">
        {error && <ErrorBanner message={error} />}
        {!error && !event && <p>Loading...</p>}
        {event && (
          <>
            <h2>{event.name}</h2>
            <p>{event.description}</p>
            <EventImage src={event.image} alt={event.name} />
          </>
        )}
        <button type="button" onClick={close}>
          Close
        </button>
      </div>
    </dialog>
  )
}
