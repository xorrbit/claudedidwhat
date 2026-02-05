import { useEffect, useCallback } from 'react'
import { FileChangeEvent } from '@shared/types'

interface UseFileWatcherOptions {
  sessionId: string
  cwd: string
  onFileChange?: (event: FileChangeEvent) => void
}

export function useFileWatcher({
  sessionId,
  cwd,
  onFileChange,
}: UseFileWatcherOptions): void {
  const handleFileChange = useCallback(
    (event: FileChangeEvent) => {
      if (event.sessionId === sessionId && onFileChange) {
        onFileChange(event)
      }
    },
    [sessionId, onFileChange]
  )

  useEffect(() => {
    // Start watching
    window.electronAPI.fs.watchStart(sessionId, cwd)

    // Subscribe to changes
    const unsubscribe = window.electronAPI.fs.onFileChanged(handleFileChange)

    return () => {
      unsubscribe()
      window.electronAPI.fs.watchStop(sessionId)
    }
  }, [sessionId, cwd, handleFileChange])
}
