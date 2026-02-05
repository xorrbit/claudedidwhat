import { memo, useMemo } from 'react'
import { ResizableSplit } from './ResizableSplit'
import { Terminal } from '../terminal/Terminal'
import { DiffPanel } from '../diff/DiffPanel'

interface SessionProps {
  sessionId: string
  cwd: string
}

export const Session = memo(function Session({ sessionId, cwd }: SessionProps) {
  // Memoize children to prevent re-renders when ResizableSplit updates
  const terminalElement = useMemo(
    () => <Terminal sessionId={sessionId} cwd={cwd} />,
    [sessionId, cwd]
  )

  const diffPanelElement = useMemo(
    () => <DiffPanel sessionId={sessionId} cwd={cwd} />,
    [sessionId, cwd]
  )

  return (
    <div className="h-full">
      <ResizableSplit
        left={terminalElement}
        right={diffPanelElement}
        initialRatio={0.5}
        minRatio={0.2}
        maxRatio={0.8}
      />
    </div>
  )
})
