import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HelpOverlay } from '@renderer/components/common/HelpOverlay'

describe('HelpOverlay', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<HelpOverlay isOpen={false} onClose={vi.fn()} />)

    expect(container.innerHTML).toBe('')
  })

  it('renders modal when open', () => {
    render(<HelpOverlay isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument()
  })

  it('renders all shortcuts', () => {
    render(<HelpOverlay isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText('New tab')).toBeInTheDocument()
    expect(screen.getByText('Close tab')).toBeInTheDocument()
    expect(screen.getByText('Next tab')).toBeInTheDocument()
    expect(screen.getByText('Previous tab')).toBeInTheDocument()
    expect(screen.getByText('Go to tab')).toBeInTheDocument()
    expect(screen.getByText('Show this help')).toBeInTheDocument()
  })

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn()
    render(<HelpOverlay isOpen={true} onClose={onClose} />)

    // Click the backdrop (outermost div)
    const backdrop = screen.getByText('Keyboard Shortcuts').closest('.fixed')!
    fireEvent.click(backdrop)

    expect(onClose).toHaveBeenCalled()
  })

  it('does not close when modal content is clicked', () => {
    const onClose = vi.fn()
    render(<HelpOverlay isOpen={true} onClose={onClose} />)

    // Click inside the modal
    fireEvent.click(screen.getByText('Keyboard Shortcuts'))

    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(<HelpOverlay isOpen={true} onClose={onClose} />)

    // Find the close button in the header
    const closeButton = container.querySelector('.flex.items-center.justify-between button')!
    fireEvent.click(closeButton)

    expect(onClose).toHaveBeenCalled()
  })

  it('shows Esc hint in footer', () => {
    render(<HelpOverlay isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText('Esc')).toBeInTheDocument()
  })

  it('renders keyboard key badges', () => {
    const { container } = render(<HelpOverlay isOpen={true} onClose={vi.fn()} />)

    // Should have kbd elements for keys
    const kbds = container.querySelectorAll('kbd')
    expect(kbds.length).toBeGreaterThan(0)
  })
})
