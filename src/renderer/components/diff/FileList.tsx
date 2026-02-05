import { ChangedFile } from '@shared/types'
import { FileListItem } from './FileListItem'

interface FileListProps {
  files: ChangedFile[]
  selectedFile: string | null
  onSelectFile: (path: string) => void
  isLoading: boolean
}

export function FileList({
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
    <div className="max-h-40 overflow-y-auto">
      {files.map((file) => (
        <FileListItem
          key={file.path}
          file={file}
          isSelected={file.path === selectedFile}
          onSelect={() => onSelectFile(file.path)}
        />
      ))}
    </div>
  )
}
