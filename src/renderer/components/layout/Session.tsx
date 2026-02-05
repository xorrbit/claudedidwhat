import { memo, useRef, useCallback, useEffect } from 'react'
import { ResizableSplit } from './ResizableSplit'
import { Terminal, TerminalHandle } from '../terminal/Terminal'
import { DiffPanel } from '../diff/DiffPanel'

interface SessionProps {
  sessionId: string
  cwd: string
  isActive?: boolean
}

export const Session = memo(function Session({ sessionId, cwd, isActive }: SessionProps) {
  const terminalRef = useRef<TerminalHandle>(null)

  const focusTerminal = useCallback(() => {
    terminalRef.current?.focus()
  }, [])

  // Focus terminal when this session becomes active
  useEffect(() => {
    if (isActive) {
      // Small delay to ensure the terminal is visible before focusing
      const timer = setTimeout(() => {
        focusTerminal()
      }, 10)
      return () => clearTimeout(timer)
    }
  }, [isActive, focusTerminal])

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
