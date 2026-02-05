import { useSessionContext } from '../context/SessionContext'

export function useSessions() {
  return useSessionContext()
}
