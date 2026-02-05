import { useState, useEffect, useCallback } from 'react'
import { ChangedFile, DiffContent } from '@shared/types'

interface UseGitDiffOptions {
  sessionId: string
  cwd: string
}

interface UseGitDiffReturn {
  files: ChangedFile[]
  selectedFile: string | null
  diffContent: DiffContent | null
  isLoading: boolean
  error: string | null
  selectFile: (path: string) => void
  refresh: () => void
}

export function useGitDiff({ sessionId, cwd }: UseGitDiffOptions): UseGitDiffReturn {
  const [files, setFiles] = useState<ChangedFile[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [diffContent, setDiffContent] = useState<DiffContent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load changed files
  const loadFiles = useCallback(async () => {
    try {
      const changedFiles = await window.electronAPI.git.getChangedFiles(cwd)
      setFiles(changedFiles)
      setError(null)

      // Auto-select first file if none selected
      if (!selectedFile && changedFiles.length > 0) {
        setSelectedFile(changedFiles[0].path)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files')
      setFiles([])
    } finally {
      setIsLoading(false)
    }
  }, [cwd, selectedFile])

  // Load diff content for selected file
  const loadDiff = useCallback(async () => {
    if (!selectedFile) {
      setDiffContent(null)
      return
    }

    try {
      const diff = await window.electronAPI.git.getFileDiff(cwd, selectedFile)
      setDiffContent(diff)
    } catch (err) {
      console.error('Failed to load diff:', err)
      setDiffContent(null)
    }
  }, [cwd, selectedFile])

  // Initial load
  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  // Load diff when selected file changes
  useEffect(() => {
    loadDiff()
  }, [loadDiff])

  // Subscribe to file changes
  useEffect(() => {
    const unsubscribe = window.electronAPI.fs.onFileChanged((event) => {
      if (event.sessionId === sessionId) {
        // Debounce refresh
        loadFiles()
      }
    })

    // Start watching
    window.electronAPI.fs.watchStart(sessionId, cwd)

    return () => {
      unsubscribe()
      window.electronAPI.fs.watchStop(sessionId)
    }
  }, [sessionId, cwd, loadFiles])

  const selectFile = useCallback((path: string) => {
    setSelectedFile(path)
  }, [])

  const refresh = useCallback(() => {
    setIsLoading(true)
    loadFiles()
  }, [loadFiles])

  return {
    files,
    selectedFile,
    diffContent,
    isLoading,
    error,
    selectFile,
    refresh,
  }
}
