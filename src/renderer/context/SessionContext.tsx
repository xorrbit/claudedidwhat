import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Session } from '@shared/types'
import { homedir } from './utils'

interface SessionContextType {
  sessions: Session[]
  activeSessionId: string | null
  createSession: (cwd?: string) => Promise<void>
  closeSession: (id: string) => void
  setActiveSession: (id: string) => void
}

const SessionContext = createContext<SessionContextType | null>(null)

function generateId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function getSessionName(cwd: string): string {
  const parts = cwd.split(/[/\\]/)
  return parts[parts.length - 1] || cwd
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  const createSession = useCallback(async (cwd?: string) => {
    let sessionCwd = cwd

    if (!sessionCwd) {
      // Show directory picker
      const selected = await window.electronAPI.fs.selectDirectory()
      sessionCwd = selected || homedir()
    }

    const newSession: Session = {
      id: generateId(),
      cwd: sessionCwd,
      name: getSessionName(sessionCwd),
    }

    setSessions((prev) => [...prev, newSession])
    setActiveSessionId(newSession.id)
  }, [])

  const closeSession = useCallback((id: string) => {
    setSessions((prev) => {
      const newSessions = prev.filter((s) => s.id !== id)

      // If closing active session, switch to another
      if (activeSessionId === id && newSessions.length > 0) {
        const closedIndex = prev.findIndex((s) => s.id === id)
        const newActiveIndex = Math.min(closedIndex, newSessions.length - 1)
        setActiveSessionId(newSessions[newActiveIndex].id)
      } else if (newSessions.length === 0) {
        setActiveSessionId(null)
      }

      return newSessions
    })
  }, [activeSessionId])

  const setActiveSession = useCallback((id: string) => {
    setActiveSessionId(id)
  }, [])

  return (
    <SessionContext.Provider
      value={{
        sessions,
        activeSessionId,
        createSession,
        closeSession,
        setActiveSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSessionContext(): SessionContextType {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSessionContext must be used within a SessionProvider')
  }
  return context
}
