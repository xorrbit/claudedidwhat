import { memo, useRef, useCallback } from 'react'
import { ResizableSplit } from './ResizableSplit'
import { Terminal, TerminalHandle } from '../terminal/Terminal'
import { DiffPanel } from '../diff/DiffPanel'

interface SessionProps {
  sessionId: string
  cwd: string
}

export const Session = memo(function Session({ sessionId, cwd }: SessionProps) {
  const terminalRef = useRef<TerminalHandle>(null)

  const focusTerminal = useCallback(() => {
    terminalRef.current?.focus()
  }, [])

  return (
    <div className="h-full">
      <ResizableSplit
        left={<Terminal ref={terminalRef} sessionId={sessionId} cwd={cwd} />}
        right={<DiffPanel sessionId={sessionId} cwd={cwd} onFocusTerminal={focusTerminal} />}
        initialRatio={0.5}
        minRatio={0.2}
        maxRatio={0.8}
      />
    </div>
  )
})
