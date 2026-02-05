import { SessionProvider } from './context/SessionContext'
import { useSessions } from './hooks/useSessions'
import { TabBar } from './components/layout/TabBar'
import { Session } from './components/layout/Session'
import { EmptyState } from './components/common/EmptyState'

function AppContent() {
  const {
    sessions,
    activeSessionId,
    createSession,
    closeSession,
    setActiveSession,
  } = useSessions()

  const activeSession = sessions.find((s) => s.id === activeSessionId)

  return (
    <div className="h-screen flex flex-col bg-terminal-bg">
      <TabBar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onTabSelect={setActiveSession}
        onTabClose={closeSession}
        onNewTab={createSession}
      />
      <div className="flex-1 min-h-0">
        {activeSession ? (
          <Session key={activeSession.id} session={activeSession} />
        ) : (
          <EmptyState onCreateSession={createSession} />
        )}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  )
}
