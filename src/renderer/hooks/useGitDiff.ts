import { useState, useEffect, useCallback, useRef } from 'react'
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

export function useGitDiff({ cwd }: UseGitDiffOptions): UseGitDiffReturn {
  const [files, setFiles] = useState<ChangedFile[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [diffContent, setDiffContent] = useState<DiffContent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const selectedFileRef = useRef<string | null>(null)

  // Keep ref in sync with state
  useEffect(() => {
    selectedFileRef.current = selectedFile
  }, [selectedFile])

  // Load changed files and refresh diff if a file is selected
  const loadFiles = useCallback(async () => {
    try {
      const changedFiles = await window.electronAPI.git.getChangedFiles(cwd)
      setFiles(changedFiles)
      setError(null)

      // Auto-select first file if none selected (use ref to avoid dependency)
      if (!selectedFileRef.current && changedFiles.length > 0) {
        setSelectedFile(changedFiles[0].path)
      } else if (selectedFileRef.current) {
        // Refresh diff content for currently selected file
        try {
          const diff = await window.electronAPI.git.getFileDiff(cwd, selectedFileRef.current)
          setDiffContent(diff)
        } catch {
          // Ignore diff refresh errors
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files')
      setFiles([])
    } finally {
      setIsLoading(false)
    }
  }, [cwd])

  // Delay initial load to not block terminal initialization
  useEffect(() => {
    const timer = setTimeout(() => {
      loadFiles()
    }, 2000) // Wait 2 seconds after mount before first git check

    return () => clearTimeout(timer)
  }, [loadFiles])

  // Load diff when selected file changes (with small delay)
  useEffect(() => {
    if (!selectedFile) {
      setDiffContent(null)
      return
    }

    const timer = setTimeout(async () => {
      try {
        const diff = await window.electronAPI.git.getFileDiff(cwd, selectedFile)
        setDiffContent(diff)
      } catch (err) {
        console.error('Failed to load diff:', err)
        setDiffContent(null)
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [cwd, selectedFile])

  // Poll for file changes every 5 seconds
  useEffect(() => {
    const pollInterval = setInterval(() => {
      loadFiles()
    }, 5000)

    return () => {
      clearInterval(pollInterval)
    }
  }, [loadFiles])

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
