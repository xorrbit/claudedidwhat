import { memo } from 'react'
import { ChangedFile } from '@shared/types'
import { FileListItem } from './FileListItem'

interface FileListProps {
  files: ChangedFile[]
  selectedFile: string | null
  onSelectFile: (path: string) => void
  isLoading: boolean
}

export const FileList = memo(function FileList({
  files,
  selectedFile,
  onSelectFile,
  isLoading,
}: FileListProps) {
  if (isLoading && files.length === 0) {
    return (
      <div className="p-3 text-sm text-terminal-text-muted">
        Loading...
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="p-3 text-sm text-terminal-text-muted">
        No changes detected
      </div>
    )
  }

  return (
    <div>
      {files.map((file) => (
        <FileListItem
          key={file.path}
          file={file}
          isSelected={file.path === selectedFile}
          onSelect={onSelectFile}
        />
      ))}
    </div>
  )
})
