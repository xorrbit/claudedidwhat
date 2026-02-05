import { Session as SessionType } from '@shared/types'
import { ResizableSplit } from './ResizableSplit'
import { Terminal } from '../terminal/Terminal'
import { DiffPanel } from '../diff/DiffPanel'

interface SessionProps {
  session: SessionType
}

export function Session({ session }: SessionProps) {
  return (
    <div className="h-full">
      <ResizableSplit
        left={
          <Terminal sessionId={session.id} cwd={session.cwd} />
        }
        right={
          <DiffPanel sessionId={session.id} cwd={session.cwd} />
        }
        initialRatio={0.6}
        minRatio={0.2}
        maxRatio={0.8}
      />
    </div>
  )
}
