export function LoadingState({ message = 'Loading…' }) {
  return <p className="feedback-state" role="status">{message}</p>
}

export function EmptyState({ message = 'No records to display.' }) {
  return <p className="feedback-state">{message}</p>
}

export function ErrorState({ message = 'Something went wrong.' }) {
  return <p className="feedback-state feedback-state--error" role="alert">{message}</p>
}

