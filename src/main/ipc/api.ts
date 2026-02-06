import { IpcMain } from 'electron'
import { API_CHANNELS, Session } from '@shared/types'
import { ApiServer } from '../services/api-server'

export function registerApiHandlers(ipcMain: IpcMain, apiServer: ApiServer) {
  ipcMain.on(API_CHANNELS.SESSION_CREATED, (_event, requestId: string, session: Session) => {
    apiServer.resolveSessionRequest(requestId, session)
  })

  ipcMain.on(API_CHANNELS.SESSION_CREATION_FAILED, (_event, requestId: string, error: string) => {
    apiServer.rejectSessionRequest(requestId, error)
  })

  ipcMain.on(API_CHANNELS.SESSIONS_CHANGED, (_event, sessions: Session[]) => {
    apiServer.updateSessions(sessions)
  })
}
