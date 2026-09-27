export function ErrorBanner({ message, onRetry }) {
  if (!message) return null
  return (
    <div role="alert" className="error">
      {message}
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  )
}
