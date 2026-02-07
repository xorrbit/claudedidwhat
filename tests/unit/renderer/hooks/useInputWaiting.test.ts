import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useInputWaiting } from '@renderer/hooks/useInputWaiting'

const handlers = new Map<string, (data: string) => void>()
const mockSubscribePtyData = vi.fn((sessionId: string, handler: (data: string) => void) => {
  handlers.set(sessionId, handler)
  return () => {
    handlers.delete(sessionId)
  }
})

vi.mock('@renderer/lib/eventDispatchers', () => ({
  subscribePtyData: (sessionId: string, handler: (data: string) => void) =>
    mockSubscribePtyData(sessionId, handler),
}))

describe('useInputWaiting', () => {
  const flushAsync = async () => {
    await Promise.resolve()
    await Promise.resolve()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    handlers.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    window.electronAPI.pty.getForegroundProcess.mockResolvedValue(null)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('polls only background sessions and marks prompt-hinted claude/codex sessions as waiting', async () => {
    window.electronAPI.pty.getForegroundProcess.mockImplementation(async (sessionId: string) => (
      sessionId === 's2' ? 'claude' : null
    ))

    const sessions = [
      { id: 's1', cwd: '/repo/one', name: 'one' },
      { id: 's2', cwd: '/repo/two', name: 'two' },
    ]

    const { result } = renderHook(() => useInputWaiting(sessions, 's1'))

    await act(async () => {
      await flushAsync()
    })

    await act(async () => {
      handlers.get('s2')?.('Waiting for input. Please continue?')
      vi.advanceTimersByTime(1500)
      await flushAsync()
    })

    expect(result.current.has('s2')).toBe(true)

    expect(window.electronAPI.pty.getForegroundProcess).toHaveBeenCalledWith('s2')
    expect(window.electronAPI.pty.getForegroundProcess).not.toHaveBeenCalledWith('s1')
  })

  it('treats option-selection prompts as waiting hints', async () => {
    window.electronAPI.pty.getForegroundProcess.mockResolvedValue('claude')
    const sessions = [
      { id: 's1', cwd: '/repo/one', name: 'one' },
      { id: 's2', cwd: '/repo/two', name: 'two' },
    ]

    const { result } = renderHook(() => useInputWaiting(sessions, 's1'))

    await act(async () => {
      await flushAsync()
    })

    await act(async () => {
      handlers.get('s2')?.('What would you like to do? Choose an option:')
      vi.advanceTimersByTime(1500)
      await flushAsync()
    })

    expect(result.current.has('s2')).toBe(true)
  })

  it('does not mark waiting during short idle without a prompt hint', async () => {
    window.electronAPI.pty.getForegroundProcess.mockResolvedValue('codex')
    const sessions = [
      { id: 's1', cwd: '/repo/one', name: 'one' },
      { id: 's2', cwd: '/repo/two', name: 'two' },
    ]

    const { result } = renderHook(() => useInputWaiting(sessions, 's1'))

    await act(async () => {
      vi.advanceTimersByTime(3000)
      await flushAsync()
    })

    expect(result.current.has('s2')).toBe(false)
  })

  it('marks waiting after a longer fallback idle period even without prompt hints', async () => {
    window.electronAPI.pty.getForegroundProcess.mockResolvedValue('codex')
    const sessions = [
      { id: 's1', cwd: '/repo/one', name: 'one' },
      { id: 's2', cwd: '/repo/two', name: 'two' },
    ]

    const { result } = renderHook(() => useInputWaiting(sessions, 's1'))

    await act(async () => {
      for (let index = 0; index < 6; index += 1) {
        vi.advanceTimersByTime(1500)
        await flushAsync()
      }
    })

    expect(result.current.has('s2')).toBe(true)
  })

  it('clears waiting state immediately when that tab becomes active', async () => {
    window.electronAPI.pty.getForegroundProcess.mockResolvedValue('claude')
    const sessions = [
      { id: 's1', cwd: '/repo/one', name: 'one' },
      { id: 's2', cwd: '/repo/two', name: 'two' },
    ]

    const { result, rerender } = renderHook(
      ({ activeSessionId }) => useInputWaiting(sessions, activeSessionId),
      { initialProps: { activeSessionId: 's1' as string | null } }
    )

    await act(async () => {
      await flushAsync()
    })

    await act(async () => {
      handlers.get('s2')?.('Press enter to continue')
      vi.advanceTimersByTime(1500)
      await flushAsync()
    })

    expect(result.current.has('s2')).toBe(true)

    await act(async () => {
      rerender({ activeSessionId: 's2' })
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(result.current.has('s2')).toBe(false)
  })
})
