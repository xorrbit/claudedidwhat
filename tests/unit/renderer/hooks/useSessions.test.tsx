import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { ReactNode } from 'react'
import { SessionProvider, useSessionContext } from '@renderer/context/SessionContext'

const wrapper = ({ children }: { children: ReactNode }) => (
  <SessionProvider>{children}</SessionProvider>
)

describe('useSessions (SessionContext)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts with initial session auto-created', async () => {
    const { result } = renderHook(() => useSessionContext(), { wrapper })

    // SessionProvider auto-creates an initial session on mount
    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(1)
    })
    expect(result.current.activeSessionId).toBe(result.current.sessions[0].id)
  })

  it('creates session with unique ID', async () => {
    const { result } = renderHook(() => useSessionContext(), { wrapper })

    // Wait for initial session to be created
    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(1)
    })
    const initialCount = result.current.sessions.length

    await act(async () => {
      await result.current.createSession('/test/path')
    })

    expect(result.current.sessions).toHaveLength(initialCount + 1)
    const newSession = result.current.sessions[result.current.sessions.length - 1]
    expect(newSession.id).toMatch(/^session-\d+-[a-z0-9]+$/)
    expect(newSession.cwd).toBe('/test/path')
    expect(newSession.name).toBe('path')
  })

  it('creates session with provided cwd', async () => {
    const { result } = renderHook(() => useSessionContext(), { wrapper })

    // Wait for initial session
    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(1)
    })

    await act(async () => {
      await result.current.createSession('/custom/directory')
    })

    expect(result.current.sessions).toHaveLength(2)
    const newSession = result.current.sessions[1]
    expect(newSession.cwd).toBe('/custom/directory')
    expect(newSession.name).toBe('directory')
  })

  it('sets active session on create', async () => {
    const { result } = renderHook(() => useSessionContext(), { wrapper })

    // Wait for initial session
    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(1)
    })

    // Initial session should be active
    expect(result.current.activeSessionId).toBe(result.current.sessions[0].id)

    await act(async () => {
      await result.current.createSession('/test/one')
    })

    // Newly created session should be active
    const newSessionId = result.current.sessions[result.current.sessions.length - 1].id
    expect(result.current.activeSessionId).toBe(newSessionId)

    await act(async () => {
      await result.current.createSession('/test/two')
    })

    // Latest session should be active
    const latestSessionId = result.current.sessions[result.current.sessions.length - 1].id
    expect(result.current.activeSessionId).toBe(latestSessionId)
  })

  it('removes session by ID', async () => {
    const { result } = renderHook(() => useSessionContext(), { wrapper })

    // Wait for initial session
    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(1)
    })

    await act(async () => {
      await result.current.createSession('/test/one')
      await result.current.createSession('/test/two')
    })

    expect(result.current.sessions).toHaveLength(3) // initial + 2 new

    const sessionToRemove = result.current.sessions[1].id

    act(() => {
      result.current.closeSession(sessionToRemove)
    })

    expect(result.current.sessions).toHaveLength(2)
    expect(result.current.sessions.find((s) => s.id === sessionToRemove)).toBeUndefined()
  })

  it('tracks active session correctly', async () => {
    const { result } = renderHook(() => useSessionContext(), { wrapper })

    // Wait for initial session
    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(1)
    })

    await act(async () => {
      await result.current.createSession('/test/one')
      await result.current.createSession('/test/two')
      await result.current.createSession('/test/three')
    })

    const [initial, first, second, third] = result.current.sessions

    act(() => {
      result.current.setActiveSession(first.id)
    })

    expect(result.current.activeSessionId).toBe(first.id)

    act(() => {
      result.current.setActiveSession(third.id)
    })

    expect(result.current.activeSessionId).toBe(third.id)
  })

  it('handles closing active session - switches to adjacent', async () => {
    const { result } = renderHook(() => useSessionContext(), { wrapper })

    // Wait for initial session
    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(1)
    })

    await act(async () => {
      await result.current.createSession('/test/one')
      await result.current.createSession('/test/two')
      await result.current.createSession('/test/three')
    })

    const [initial, first, second, third] = result.current.sessions

    // Make second tab active
    act(() => {
      result.current.setActiveSession(second.id)
    })

    // Close the second tab
    act(() => {
      result.current.closeSession(second.id)
    })

    // Should switch to what was third (now at same index)
    expect(result.current.activeSessionId).toBe(third.id)
  })

  it('handles closing last session - quits the app', async () => {
    const { result } = renderHook(() => useSessionContext(), { wrapper })

    // Wait for initial session
    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(1)
    })

    // Close the initial session (the only one)
    const onlySession = result.current.sessions[0]

    act(() => {
      result.current.closeSession(onlySession.id)
    })

    expect(result.current.sessions).toHaveLength(0)
    expect(window.electronAPI.window.quit).toHaveBeenCalled()
  })

  it('handles closing non-active session - keeps active session', async () => {
    const { result } = renderHook(() => useSessionContext(), { wrapper })

    // Wait for initial session
    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(1)
    })

    await act(async () => {
      await result.current.createSession('/test/one')
      await result.current.createSession('/test/two')
    })

    const [initial, first, second] = result.current.sessions

    // second is active (last created)
    expect(result.current.activeSessionId).toBe(second.id)

    // Close the first (non-active) tab
    act(() => {
      result.current.closeSession(first.id)
    })

    // Active should still be second
    expect(result.current.activeSessionId).toBe(second.id)
  })

  it('generates unique IDs for each session', async () => {
    const { result } = renderHook(() => useSessionContext(), { wrapper })

    // Wait for initial session
    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(1)
    })

    await act(async () => {
      await result.current.createSession('/test/one')
      await result.current.createSession('/test/two')
      await result.current.createSession('/test/three')
    })

    const ids = result.current.sessions.map((s) => s.id)
    const uniqueIds = new Set(ids)

    expect(uniqueIds.size).toBe(4) // initial + 3 new
  })

  it('uses home directory when no cwd provided', async () => {
    const { result } = renderHook(() => useSessionContext(), { wrapper })

    // Wait for initial session (which uses home directory)
    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(1)
    })

    // Initial session should use the fallback (homedir from mocked getHomeDir)
    expect(result.current.sessions[0].cwd).toBe('/home/test')
  })

  it('throws error when used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => useSessionContext())
    }).toThrow('useSessionContext must be used within a SessionProvider')

    consoleSpy.mockRestore()
  })
})
