import { watch, FSWatcher, readFileSync } from 'fs'
import { join } from 'path'
import { platform } from 'os'
import { FileChangeEvent } from '@shared/types'
import { debugLog } from '../logger'

type WatcherCallback = (event: FileChangeEvent) => void
type ErrorCallback = (sessionId: string, error: Error) => void

interface SharedWatcher {
  watcher: FSWatcher
  subscribers: Map<string, { callback: WatcherCallback; onError?: ErrorCallback }>
  debounceTimer: NodeJS.Timeout | null
  pendingEvents: FileChangeEvent[]
}

const DEBOUNCE_MS = 300

// Directories/files to ignore (matched against path segments)
const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '.cache',
  'vendor',
  'target',
  '__pycache__',
])

const IGNORED_EXTENSIONS = new Set(['.log', '.tmp'])
const IGNORED_FILES = new Set(['.DS_Store'])

function isIgnored(relativePath: string): boolean {
  const normalizedPath = relativePath.replace(/\\/g, '/')
  const segments = normalizedPath.split('/')
  for (const seg of segments) {
    if (IGNORED_DIRS.has(seg)) return true
  }
  const filename = segments[segments.length - 1]
  if (IGNORED_FILES.has(filename)) return true
  for (const ext of IGNORED_EXTENSIONS) {
    if (filename.endsWith(ext)) return true
  }
  return false
}

function isWSL(): boolean {
  if (platform() !== 'linux') return false
  try {
    return readFileSync('/proc/version', 'utf-8').toLowerCase().includes('microsoft')
  } catch {
    return false
  }
}

const IS_WSL = isWSL()

export class FileWatcher {
  // One FSWatcher per directory, shared by all sessions watching that dir
  private dirWatchers: Map<string, SharedWatcher> = new Map()
  // Reverse lookup: sessionId → directory (for unwatch)
  private sessionToDir: Map<string, string> = new Map()

  /**
   * Start watching a directory for changes.
   * Multiple sessions watching the same directory share a single FSWatcher.
   */
  watch(sessionId: string, dir: string, callback: WatcherCallback, onError?: ErrorCallback): boolean {
    // Skip if existing subscription already covers the same directory
    const existingDir = this.sessionToDir.get(sessionId)
    if (existingDir === dir) {
      return true
    }

    // Stop any existing watcher for this session (may be a different dir)
    this.unwatch(sessionId)

    // WSL2: native fs.watch with recursive still uses inotify under the hood,
    // which overwhelms the 9P filesystem bridge and starves the event loop.
    // Skip file watching entirely — useGitDiff falls back to periodic git status.
    if (IS_WSL) return false

    // Check if we already have a shared watcher for this directory
    let shared = this.dirWatchers.get(dir)

    if (!shared) {
      // Create a new FSWatcher for this directory
      debugLog('Creating shared file watcher:', { dir })

      const fsWatcher = watch(dir, { recursive: true })

      shared = {
        watcher: fsWatcher,
        subscribers: new Map(),
        debounceTimer: null,
        pendingEvents: [],
      }

      const sharedRef = shared

      const emitDebounced = () => {
        if (sharedRef.debounceTimer) {
          clearTimeout(sharedRef.debounceTimer)
        }

        sharedRef.debounceTimer = setTimeout(() => {
          // Deduplicate pending events by path
          const uniqueEvents = new Map<string, FileChangeEvent>()
          for (const event of sharedRef.pendingEvents) {
            uniqueEvents.set(event.path, event)
          }

          // Emit to all subscribers, stamping each event with the subscriber's sessionId
          for (const [subSessionId, sub] of sharedRef.subscribers) {
            for (const event of uniqueEvents.values()) {
              sub.callback({ ...event, sessionId: subSessionId })
            }
          }

          sharedRef.pendingEvents = []
          sharedRef.debounceTimer = null
        }, DEBOUNCE_MS)
      }

      fsWatcher.on('change', (_eventType: string, filename: string | null) => {
        if (!filename) return
        if (isIgnored(filename)) return

        const fullPath = join(dir, filename)
        // fs.watch reports 'rename' for add/unlink and 'change' for modifications.
        // Map both to 'change' since useGitDiff just refreshes git status either way.
        // sessionId is a placeholder — emitDebounced stamps the real one per subscriber
        sharedRef.pendingEvents.push({ sessionId: '', type: 'change', path: fullPath })
        emitDebounced()
      })

      fsWatcher.on('error', (error: NodeJS.ErrnoException) => {
        console.error(`Shared watcher error for dir ${dir}:`, error)
        if (error.code === 'EMFILE' || error.code === 'ENFILE' || error.code === 'ENOSPC') {
          debugLog('Shared watcher hit OS limit, closing:', { dir, code: error.code })
          // Notify all subscribers and remove them
          for (const [subSessionId, sub] of sharedRef.subscribers) {
            sub.onError?.(subSessionId, error)
          }
          // Clean up the shared watcher entirely
          this.closeSharedWatcher(dir)
        }
      })

      this.dirWatchers.set(dir, shared)
    }

    // Add this session as a subscriber
    shared.subscribers.set(sessionId, { callback, onError })
    this.sessionToDir.set(sessionId, dir)
    debugLog('Subscribed to shared watcher:', { sessionId, dir, subscribers: shared.subscribers.size })

    return true
  }

  /**
   * Stop watching for a session.
   * The underlying FSWatcher is only closed when the last subscriber unsubscribes.
   */
  unwatch(sessionId: string): void {
    const dir = this.sessionToDir.get(sessionId)
    if (!dir) return

    this.sessionToDir.delete(sessionId)

    const shared = this.dirWatchers.get(dir)
    if (!shared) return

    shared.subscribers.delete(sessionId)
    debugLog('Unsubscribed from shared watcher:', { sessionId, dir, subscribers: shared.subscribers.size })

    // Close the FSWatcher when no subscribers remain
    if (shared.subscribers.size === 0) {
      this.closeSharedWatcher(dir)
    }
  }

  /**
   * Close a shared watcher and clean up its resources.
   */
  private closeSharedWatcher(dir: string): void {
    const shared = this.dirWatchers.get(dir)
    if (!shared) return

    if (shared.debounceTimer) {
      clearTimeout(shared.debounceTimer)
    }
    debugLog('Closing shared file watcher:', { dir })
    shared.watcher.close()

    // Clean up reverse lookup for any remaining subscribers
    for (const subSessionId of shared.subscribers.keys()) {
      this.sessionToDir.delete(subSessionId)
    }

    this.dirWatchers.delete(dir)
  }

  /**
   * Stop all watchers (for cleanup on app exit).
   */
  unwatchAll(): void {
    for (const dir of [...this.dirWatchers.keys()]) {
      this.closeSharedWatcher(dir)
    }
  }
}
