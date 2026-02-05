import { IpcMain } from 'electron'
import { FS_CHANNELS } from '@shared/types'
import { FileWatcher } from '../services/watcher'
import { sendToRenderer } from '../index'

const fileWatcher = new FileWatcher()

export function registerFsHandlers(ipcMain: IpcMain) {
  ipcMain.handle(FS_CHANNELS.WATCH_START, async (_event, sessionId: string, dir: string) => {
    fileWatcher.watch(sessionId, dir, (event) => {
      sendToRenderer(FS_CHANNELS.FILE_CHANGED, event)
    })
  })

  ipcMain.handle(FS_CHANNELS.WATCH_STOP, async (_event, sessionId: string) => {
    fileWatcher.unwatch(sessionId)
  })
}
