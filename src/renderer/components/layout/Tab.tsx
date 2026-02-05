import { useState } from 'react'

interface TabProps {
  name: string
  fullPath: string
  isActive: boolean
  onSelect: () => void
  onClose: () => void
}

export function Tab({ name, fullPath, isActive, onSelect, onClose }: TabProps) {
  const [isHovered, setIsHovered] = useState(false)

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClose()
  }

  return (
    <button
      className={`
        relative flex items-center gap-2 px-4 py-2 text-sm
        transition-colors duration-150 border-r border-terminal-border
        min-w-[180px] max-w-[300px]
        ${isActive
          ? 'bg-terminal-bg text-terminal-text'
          : 'bg-terminal-surface text-terminal-text-muted hover:text-terminal-text'
        }
      `}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={fullPath}
    >
      <span className="truncate flex-1 text-left">{name}</span>
      <span
        className={`
          w-4 h-4 flex items-center justify-center rounded
          hover:bg-terminal-border transition-colors
          ${isHovered || isActive ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={handleClose}
      >
        <svg
          className="w-3 h-3"
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
      </span>
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-terminal-accent" />
      )}
    </button>
  )
}
