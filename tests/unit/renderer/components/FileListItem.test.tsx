import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FileListItem } from '@renderer/components/diff/FileListItem'
import type { ChangedFile } from '@shared/types'

describe('FileListItem', () => {
  const defaultProps = {
    file: { path: 'src/components/Button.tsx', status: 'M' as const },
    isSelected: false,
    onSelect: vi.fn(),
    index: 0,
  }

  it('renders the file name', () => {
    render(<FileListItem {...defaultProps} />)

    expect(screen.getByText('Button.tsx')).toBeInTheDocument()
  })

  it('renders the directory path', () => {
    render(<FileListItem {...defaultProps} />)

    expect(screen.getByText('src/components')).toBeInTheDocument()
  })

  it('handles file with no directory', () => {
    render(
      <FileListItem
        {...defaultProps}
        file={{ path: 'README.md', status: 'M' }}
      />
    )

    expect(screen.getByText('README.md')).toBeInTheDocument()
    // No directory path should be shown
    expect(screen.queryByText('.')).not.toBeInTheDocument()
  })

  it('calls onSelect with file path when clicked', () => {
    const onSelect = vi.fn()
    render(<FileListItem {...defaultProps} onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button'))

    expect(onSelect).toHaveBeenCalledWith('src/components/Button.tsx')
  })

  it('shows status badge with correct letter', () => {
    const statuses: Array<{ status: ChangedFile['status']; letter: string }> = [
      { status: 'M', letter: 'M' },
      { status: 'A', letter: 'A' },
      { status: 'D', letter: 'D' },
      { status: 'R', letter: 'R' },
      { status: '?', letter: '?' },
    ]

    for (const { status, letter } of statuses) {
      const { unmount } = render(
        <FileListItem {...defaultProps} file={{ path: 'file.ts', status }} />
      )
      expect(screen.getByText(letter)).toBeInTheDocument()
      unmount()
    }
  })

  it('shows selection indicator when selected', () => {
    const { container } = render(
      <FileListItem {...defaultProps} isSelected={true} />
    )

    // Selected state should have the accent background
    const button = container.querySelector('button')!
    expect(button.className).toContain('bg-obsidian-accent/10')
  })

  it('applies hover style when not selected', () => {
    const { container } = render(
      <FileListItem {...defaultProps} isSelected={false} />
    )

    const button = container.querySelector('button')!
    expect(button.className).toContain('hover:bg-obsidian-float/50')
  })

  it('shows tooltip with path and status label', () => {
    render(
      <FileListItem
        {...defaultProps}
        file={{ path: 'src/index.ts', status: 'A' }}
      />
    )

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('title', 'src/index.ts (Added)')
  })

  it('hides status badge when collapsed', () => {
    const { container } = render(
      <FileListItem {...defaultProps} isCollapsed={true} />
    )

    // Status badge should not be rendered when collapsed
    const statusBadge = container.querySelector('.font-mono.font-semibold')
    expect(statusBadge).not.toBeInTheDocument()
  })

  it('shows status badge when not collapsed', () => {
    render(<FileListItem {...defaultProps} isCollapsed={false} />)

    expect(screen.getByText('M')).toBeInTheDocument()
  })

  it('applies animation delay based on index', () => {
    const { container } = render(
      <FileListItem {...defaultProps} index={3} />
    )

    const button = container.querySelector('button')!
    expect(button.style.animationDelay).toBe('90ms') // 3 * 30ms
  })

  it('uses compact padding when collapsed', () => {
    const { container } = render(
      <FileListItem {...defaultProps} isCollapsed={true} />
    )

    const button = container.querySelector('button')!
    expect(button.className).toContain('px-2')
  })
})
