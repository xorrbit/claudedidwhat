import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConfirmDialog } from '@renderer/components/common/ConfirmDialog'

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    title: 'Test Title',
    message: 'Test message body',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  }

  it('renders nothing when closed', () => {
    const { container } = render(<ConfirmDialog {...defaultProps} isOpen={false} />)

    expect(container.innerHTML).toBe('')
  })

  it('renders title and message when open', () => {
    render(<ConfirmDialog {...defaultProps} />)

    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test message body')).toBeInTheDocument()
  })

  it('renders default button labels', () => {
    render(<ConfirmDialog {...defaultProps} />)

    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Close anyway')).toBeInTheDocument()
  })

  it('renders custom button labels', () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        confirmLabel="Delete"
        cancelLabel="Keep"
      />
    )

    expect(screen.getByText('Keep')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />)

    fireEvent.click(screen.getByText('Close anyway'))

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />)

    fireEvent.click(screen.getByText('Cancel'))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when backdrop is clicked', () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />)

    const backdrop = screen.getByText('Test Title').closest('.fixed')!
    fireEvent.click(backdrop)

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('does not call onCancel when modal content is clicked', () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />)

    fireEvent.click(screen.getByText('Test Title'))

    expect(onCancel).not.toHaveBeenCalled()
  })

  it('renders warning icon', () => {
    const { container } = render(<ConfirmDialog {...defaultProps} />)

    const icon = container.querySelector('.bg-obsidian-modified\\/10')
    expect(icon).toBeInTheDocument()
  })

  it('applies destructive styling to confirm button by default', () => {
    render(<ConfirmDialog {...defaultProps} />)

    const confirmButton = screen.getByText('Close anyway')
    expect(confirmButton.className).toContain('text-obsidian-deleted')
  })

  it('renders ReactNode message content', () => {
    const message = (
      <div>
        <p>Open tabs for these directories:</p>
        <ul>
          <li>alpha</li>
          <li>beta</li>
        </ul>
      </div>
    )

    render(<ConfirmDialog {...defaultProps} message={message} />)

    expect(screen.getByText('Open tabs for these directories:')).toBeInTheDocument()
    expect(screen.getByText('alpha')).toBeInTheDocument()
    expect(screen.getByText('beta')).toBeInTheDocument()
  })

  it('applies custom confirmClassName to confirm button', () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        confirmClassName="px-4 py-2 text-sm font-medium text-obsidian-accent"
      />
    )

    const confirmButton = screen.getByText('Close anyway')
    expect(confirmButton.className).toContain('text-obsidian-accent')
    expect(confirmButton.className).not.toContain('text-obsidian-deleted')
  })
})
