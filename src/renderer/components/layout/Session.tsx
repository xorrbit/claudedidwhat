import { memo, useMemo } from 'react'
import { Session as SessionType } from '@shared/types'
import { ResizableSplit } from './ResizableSplit'
import { Terminal } from '../terminal/Terminal'
import { DiffPanel } from '../diff/DiffPanel'

interface SessionProps {
  session: SessionType
}

export const Session = memo(function Session({ session }: SessionProps) {
  // Memoize children to prevent re-renders when ResizableSplit updates
  const terminalElement = useMemo(
    () => <Terminal sessionId={session.id} cwd={session.cwd} />,
    [session.id, session.cwd]
  )

  const diffPanelElement = useMemo(
    () => <DiffPanel sessionId={session.id} cwd={session.cwd} />,
    [session.id, session.cwd]
  )

  return (
    <div className="h-full">
      <ResizableSplit
        left={terminalElement}
        right={diffPanelElement}
        initialRatio={0.6}
        minRatio={0.2}
        maxRatio={0.8}
      />
    </div>
  )
})
