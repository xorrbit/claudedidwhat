import { memo } from 'react'
import { ChangedFile, FileStatus } from '@shared/types'

interface FileListItemProps {
  file: ChangedFile
  isSelected: boolean
  onSelect: (path: string) => void
}

const STATUS_COLORS: Record<FileStatus, string> = {
  A: 'text-terminal-added',
  M: 'text-terminal-modified',
  D: 'text-terminal-deleted',
  R: 'text-terminal-modified',
  '?': 'text-terminal-added',
}

const STATUS_LABELS: Record<FileStatus, string> = {
  A: 'Added',
  M: 'Modified',
  D: 'Deleted',
  R: 'Renamed',
  '?': 'Untracked',
}

export const FileListItem = memo(function FileListItem({ file, isSelected, onSelect }: FileListItemProps) {
  const statusColor = STATUS_COLORS[file.status]
  const statusLabel = STATUS_LABELS[file.status]

  // Get just the filename from the path
  const fileName = file.path.split('/').pop() || file.path
  // Get the directory path
  const dirPath = file.path.split('/').slice(0, -1).join('/')

  return (
    <button
      className={`
        w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm
        hover:bg-terminal-surface transition-colors
        ${isSelected ? 'bg-terminal-surface' : ''}
      `}
      onClick={() => onSelect(file.path)}
      title={`${file.path} (${statusLabel})`}
    >
      {/* Status indicator */}
      <span className={`font-mono text-xs ${statusColor}`}>
        {file.status}
      </span>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <span className="text-terminal-text truncate block">
          {fileName}
        </span>
        {dirPath && (
          <span className="text-terminal-text-muted text-xs truncate block">
            {dirPath}
          </span>
        )}
      </div>
    </button>
  )
})
