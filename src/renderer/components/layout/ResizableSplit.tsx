import { ReactNode } from 'react'
import { useResizable } from '../../hooks/useResizable'

interface ResizableSplitProps {
  left: ReactNode
  right: ReactNode
  initialRatio?: number
  minRatio?: number
  maxRatio?: number
}

export function ResizableSplit({
  left,
  right,
  initialRatio = 0.6,
  minRatio = 0.2,
  maxRatio = 0.8,
}: ResizableSplitProps) {
  const { ratio, isDragging, handleMouseDown } = useResizable({
    initialRatio,
    minRatio,
    maxRatio,
  })

  return (
    <div className="flex h-full w-full">
      {/* Left pane */}
      <div
        className="h-full overflow-hidden"
        style={{ width: `${ratio * 100}%` }}
      >
        {left}
      </div>

      {/* Divider */}
      <div
        className={`
          w-1 bg-terminal-border cursor-col-resize flex-shrink-0
          hover:bg-terminal-accent transition-colors
          ${isDragging ? 'bg-terminal-accent' : ''}
        `}
        onMouseDown={handleMouseDown}
      />

      {/* Right pane */}
      <div
        className="h-full overflow-hidden"
        style={{ width: `${(1 - ratio) * 100}%` }}
      >
        {right}
      </div>
    </div>
  )
}
