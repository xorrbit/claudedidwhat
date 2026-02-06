import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import React, { createRef } from 'react'

// Mock the useTerminal hook
const mockFocus = vi.fn()
const mockTerminalRef = { current: document.createElement('div') }

vi.mock('@renderer/hooks/useTerminal', () => ({
  useTerminal: vi.fn(() => ({
    terminalRef: mockTerminalRef,
    focus: mockFocus,
  })),
}))

import { Terminal, TerminalHandle } from '@renderer/components/terminal/Terminal'
import { useTerminal } from '@renderer/hooks/useTerminal'

describe('Terminal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders terminal container', () => {
    const { container } = render(
      <Terminal sessionId="s1" cwd="/project" />
    )

    expect(container.querySelector('.xterm-container')).toBeInTheDocument()
  })

  it('passes sessionId and cwd to useTerminal', () => {
    render(<Terminal sessionId="s1" cwd="/project" />)

    expect(useTerminal).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 's1',
        cwd: '/project',
      })
    )
  })

  it('exposes focus via ref', () => {
    const ref = createRef<TerminalHandle>()

    render(<Terminal ref={ref} sessionId="s1" cwd="/project" />)

    expect(ref.current).toBeDefined()
    ref.current!.focus()
    expect(mockFocus).toHaveBeenCalled()
  })

  it('passes onExit to useTerminal', () => {
    const onExit = vi.fn()

    render(<Terminal sessionId="s1" cwd="/project" onExit={onExit} />)

    expect(useTerminal).toHaveBeenCalledWith(
      expect.objectContaining({
        onExit,
      })
    )
  })
})
