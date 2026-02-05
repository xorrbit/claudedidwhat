import chokidar, { FSWatcher } from 'chokidar'
import { FileChangeEvent } from '@shared/types'

type WatcherCallback = (event: FileChangeEvent) => void

interface WatcherInstance {
  watcher: FSWatcher
  callback: WatcherCallback
  debounceTimer: NodeJS.Timeout | null
  pendingEvents: FileChangeEvent[]
}

const DEBOUNCE_MS = 300

export class FileWatcher {
  private watchers: Map<string, WatcherInstance> = new Map()

  /**
   * Start watching a directory for changes.
   */
  watch(sessionId: string, dir: string, callback: WatcherCallback): void {
    // Stop any existing watcher for this session
    this.unwatch(sessionId)

    const watcher = chokidar.watch(dir, {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/coverage/**',
        '**/*.log',
      ],
      persistent: true,
      ignoreInitial: true,
      // Use polling for cross-platform reliability
      usePolling: true,
      interval: 5000,
    })

    const instance: WatcherInstance = {
      watcher,
      callback,
      debounceTimer: null,
      pendingEvents: [],
    }

    const emitDebounced = () => {
      if (instance.debounceTimer) {
        clearTimeout(instance.debounceTimer)
      }

      instance.debounceTimer = setTimeout(() => {
        // Emit all pending events (deduplicated by path)
        const uniqueEvents = new Map<string, FileChangeEvent>()
        for (const event of instance.pendingEvents) {
          uniqueEvents.set(event.path, event)
        }

        for (const event of uniqueEvents.values()) {
          instance.callback(event)
        }

        instance.pendingEvents = []
        instance.debounceTimer = null
      }, DEBOUNCE_MS)
    }

    const handleEvent = (type: FileChangeEvent['type'], path: string) => {
      instance.pendingEvents.push({
        sessionId,
        type,
        path,
      })
      emitDebounced()
    }

    watcher
      .on('add', (path) => handleEvent('add', path))
      .on('change', (path) => handleEvent('change', path))
      .on('unlink', (path) => handleEvent('unlink', path))
      .on('error', (error) => {
        console.error(`Watcher error for session ${sessionId}:`, error)
      })

    this.watchers.set(sessionId, instance)
  }

  /**
   * Stop watching for a session.
   */
  unwatch(sessionId: string): void {
    const instance = this.watchers.get(sessionId)
    if (instance) {
      if (instance.debounceTimer) {
        clearTimeout(instance.debounceTimer)
      }
      instance.watcher.close()
      this.watchers.delete(sessionId)
    }
  }

  /**
   * Stop all watchers (for cleanup on app exit).
   */
  unwatchAll(): void {
    for (const [sessionId] of this.watchers) {
      this.unwatch(sessionId)
    }
  }
}
