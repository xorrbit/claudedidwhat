// Re-export shared types
export * from '@shared/types'

// Renderer-specific types
export interface TabProps {
  id: string
  name: string
  isActive: boolean
  onSelect: () => void
  onClose: () => void
}

export interface ResizeState {
  ratio: number
  isDragging: boolean
}
