interface EmptyStateProps {
  onCreateSession: () => void
}

export function EmptyState({ onCreateSession }: EmptyStateProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-terminal-text-muted">
      <div className="mb-6">
        <svg
          className="w-16 h-16 opacity-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
      <h2 className="text-lg text-terminal-text mb-2">No sessions open</h2>
      <p className="text-sm mb-6">Open a new terminal session to get started</p>
      <button
        className="
          px-4 py-2 bg-terminal-accent text-white rounded
          hover:bg-terminal-accent-hover transition-colors
          flex items-center gap-2
        "
        onClick={onCreateSession}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        New Session
      </button>
      <p className="text-xs mt-4">
        or press <kbd className="px-1.5 py-0.5 bg-terminal-surface rounded text-terminal-text">Ctrl+T</kbd>
      </p>
    </div>
  )
}
