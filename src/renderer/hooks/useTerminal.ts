import { useEffect, useRef, useCallback } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import 'xterm/css/xterm.css'

interface UseTerminalOptions {
  sessionId: string
  cwd: string
}

interface UseTerminalReturn {
  terminalRef: React.RefObject<HTMLDivElement>
}

const TERMINAL_THEME = {
  background: '#1e1e1e',
  foreground: '#cccccc',
  cursor: '#cccccc',
  cursorAccent: '#1e1e1e',
  selection: '#264f78',
  black: '#1e1e1e',
  red: '#f14c4c',
  green: '#4ec9b0',
  yellow: '#dcdcaa',
  blue: '#569cd6',
  magenta: '#c586c0',
  cyan: '#9cdcfe',
  white: '#cccccc',
  brightBlack: '#808080',
  brightRed: '#f14c4c',
  brightGreen: '#4ec9b0',
  brightYellow: '#dcdcaa',
  brightBlue: '#569cd6',
  brightMagenta: '#c586c0',
  brightCyan: '#9cdcfe',
  brightWhite: '#ffffff',
}

export function useTerminal({ sessionId, cwd }: UseTerminalOptions): UseTerminalReturn {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  // Fit terminal to container
  const fitTerminal = useCallback(() => {
    if (fitAddonRef.current && xtermRef.current) {
      try {
        fitAddonRef.current.fit()
        const dims = fitAddonRef.current.proposeDimensions()
        if (dims) {
          window.electronAPI.pty.resize({
            sessionId,
            cols: dims.cols,
            rows: dims.rows,
          })
        }
      } catch {
        // Ignore fit errors during initialization
      }
    }
  }, [sessionId])

  useEffect(() => {
    if (!terminalRef.current) return

    // Create terminal instance
    const terminal = new Terminal({
      theme: TERMINAL_THEME,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block',
      allowProposedApi: true,
    })

    // Create addons
    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()

    terminal.loadAddon(fitAddon)
    terminal.loadAddon(webLinksAddon)

    // Open terminal in container
    terminal.open(terminalRef.current)

    // Store references
    xtermRef.current = terminal
    fitAddonRef.current = fitAddon

    // Initial fit
    fitAddon.fit()

    // Spawn PTY
    const dims = fitAddon.proposeDimensions()
    window.electronAPI.pty.spawn({
      sessionId,
      cwd,
    }).then(() => {
      if (dims) {
        window.electronAPI.pty.resize({
          sessionId,
          cols: dims.cols,
          rows: dims.rows,
        })
      }
    })

    // Handle terminal input
    terminal.onData((data) => {
      window.electronAPI.pty.input(sessionId, data)
    })

    // Handle PTY output
    const unsubscribeData = window.electronAPI.pty.onData((sid, data) => {
      if (sid === sessionId) {
        terminal.write(data)
      }
    })

    // Handle PTY exit
    const unsubscribeExit = window.electronAPI.pty.onExit((sid, code) => {
      if (sid === sessionId) {
        terminal.write(`\r\n\x1b[90mProcess exited with code ${code}\x1b[0m\r\n`)
      }
    })

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      fitTerminal()
    })

    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current)
    }

    // Cleanup
    return () => {
      unsubscribeData()
      unsubscribeExit()
      resizeObserver.disconnect()
      window.electronAPI.pty.kill(sessionId)
      terminal.dispose()
    }
  }, [sessionId, cwd, fitTerminal])

  return { terminalRef }
}
