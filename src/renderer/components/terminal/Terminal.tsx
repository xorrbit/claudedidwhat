import { memo, forwardRef, useImperativeHandle } from 'react'
import { useTerminal } from '../../hooks/useTerminal'

interface TerminalProps {
  sessionId: string
  cwd: string
}

export interface TerminalHandle {
  focus: () => void
}

export const Terminal = memo(forwardRef<TerminalHandle, TerminalProps>(
  function Terminal({ sessionId, cwd }, ref) {
    const { terminalRef, focus } = useTerminal({ sessionId, cwd })

    useImperativeHandle(ref, () => ({
      focus,
    }), [focus])

    return (
      <div className="h-full w-full bg-obsidian-void xterm-container">
        <div ref={terminalRef} className="h-full w-full" />
      </div>
    )
  }
))
