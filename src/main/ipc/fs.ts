import { IpcMain } from 'electron'
import { readdir } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import { FS_CHANNELS } from '@shared/types'
import { FileWatcher } from '../services/watcher'
import { sendToRenderer } from '../index'
import { validateIpcSender } from '../security/validate-sender'
import { assertNonEmptyString, assertSessionId } from '../security/validate-ipc-params'

export const fileWatcher = new FileWatcher()

const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.hg', '.svn', 'dist', 'build', '.next',
  '__pycache__', '.cache', '.vscode', '.idea', 'coverage', '.turbo',
])

export function registerFsHandlers(ipcMain: IpcMain) {
  ipcMain.handle(FS_CHANNELS.WATCH_START, async (event, sessionId: string, dir: string) => {
    if (!validateIpcSender(event)) throw new Error('Unauthorized IPC sender')
    assertSessionId(sessionId, 'sessionId')
    assertNonEmptyString(dir, 'dir')
    return fileWatcher.watch(
      sessionId,
      dir,
      (event) => {
        sendToRenderer(FS_CHANNELS.FILE_CHANGED, event)
      },
      (sid) => {
        sendToRenderer(FS_CHANNELS.WATCHER_ERROR, sid)
      }
    )
  })

  ipcMain.handle(FS_CHANNELS.WATCH_STOP, async (event, sessionId: string) => {
    if (!validateIpcSender(event)) throw new Error('Unauthorized IPC sender')
    assertSessionId(sessionId, 'sessionId')
    fileWatcher.unwatch(sessionId)
  })

  ipcMain.handle(FS_CHANNELS.GET_HOME_DIR, (event) => {
    if (!validateIpcSender(event)) throw new Error('Unauthorized IPC sender')
    return homedir()
  })

  ipcMain.handle(FS_CHANNELS.LIST_SUBDIRECTORIES, async (event, dir: string) => {
    if (!validateIpcSender(event)) throw new Error('Unauthorized IPC sender')
    assertNonEmptyString(dir, 'dir')
    const entries = await readdir(dir, { withFileTypes: true })
    return entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b))
  })

  ipcMain.handle(FS_CHANNELS.LIST_FILES, async (event, dir: string, limit?: number) => {
    if (!validateIpcSender(event)) throw new Error('Unauthorized IPC sender')
    assertNonEmptyString(dir, 'dir')
    const maxFiles = typeof limit === 'number' && limit > 0 ? limit : 50
    const results: string[] = []

    async function walk(current: string, prefix: string) {
      if (results.length >= maxFiles) return
      let entries
      try {
        entries = await readdir(current, { withFileTypes: true })
      } catch {
        return
      }
      // Sort for deterministic order
      entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
      for (const entry of entries) {
        if (results.length >= maxFiles) return
        const relPath = prefix ? `${prefix}/${entry.name}` : entry.name
        if (entry.isDirectory()) {
          if (!IGNORED_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
            await walk(join(current, entry.name), relPath)
          }
        } else {
          results.push(relPath)
        }
      }
    }

    await walk(dir, '')
    return results
  })
}
