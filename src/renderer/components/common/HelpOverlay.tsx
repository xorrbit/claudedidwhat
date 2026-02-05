interface HelpOverlayProps {
  isOpen: boolean
  onClose: () => void
}

const shortcuts = [
  { keys: ['Ctrl', 'T'], description: 'New tab' },
  { keys: ['Ctrl', 'W'], description: 'Close tab' },
  { keys: ['Ctrl', 'Tab'], description: 'Next tab' },
  { keys: ['Ctrl', 'Shift', 'Tab'], description: 'Previous tab' },
  { keys: ['Ctrl', '1-9'], description: 'Go to tab' },
  { keys: ['Ctrl', '?'], description: 'Show this help' },
]

const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac')

function formatKey(key: string): string {
  if (key === 'Ctrl' && isMac) return '⌘'
  if (key === 'Shift') return isMac ? '⇧' : 'Shift'
  if (key === 'Tab') return '⇥'
  return key
}

export function HelpOverlay({ isOpen, onClose }: HelpOverlayProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-terminal-surface border border-terminal-border rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-terminal-text">
            Keyboard Shortcuts
          </h2>
          <button
            className="text-terminal-text-muted hover:text-terminal-text"
            onClick={onClose}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-2">
          {shortcuts.map(({ keys, description }) => (
            <div
              key={description}
              className="flex items-center justify-between py-2 border-b border-terminal-border last:border-0"
            >
              <span className="text-terminal-text-muted">{description}</span>
              <div className="flex gap-1">
                {keys.map((key, i) => (
                  <span key={i}>
                    <kbd className="px-2 py-1 bg-terminal-bg rounded text-xs text-terminal-text font-mono">
                      {formatKey(key)}
                    </kbd>
                    {i < keys.length - 1 && (
                      <span className="text-terminal-text-muted mx-1">+</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-terminal-text-muted text-center">
          Press <kbd className="px-1.5 py-0.5 bg-terminal-bg rounded">Esc</kbd> to close
        </p>
      </div>
    </div>
  )
}
