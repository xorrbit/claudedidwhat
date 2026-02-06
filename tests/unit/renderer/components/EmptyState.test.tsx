import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EmptyState } from '@renderer/components/common/EmptyState'

describe('EmptyState', () => {
  it('renders heading text', () => {
    render(<EmptyState onCreateSession={vi.fn()} />)

    expect(screen.getByText('No sessions open')).toBeInTheDocument()
  })

  it('renders description text', () => {
    render(<EmptyState onCreateSession={vi.fn()} />)

    expect(screen.getByText(/Start a new terminal session/)).toBeInTheDocument()
  })

  it('renders New Session button', () => {
    render(<EmptyState onCreateSession={vi.fn()} />)

    expect(screen.getByText('New Session')).toBeInTheDocument()
  })

  it('calls onCreateSession when button is clicked', () => {
    const onCreateSession = vi.fn()
    render(<EmptyState onCreateSession={onCreateSession} />)

    fireEvent.click(screen.getByText('New Session'))

    expect(onCreateSession).toHaveBeenCalled()
  })

  it('shows keyboard shortcut hint', () => {
    render(<EmptyState onCreateSession={vi.fn()} />)

    expect(screen.getByText('T')).toBeInTheDocument()
  })
})
