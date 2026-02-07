import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

// Mock useResizable to control ratio
const mockUseResizable = vi.fn()

vi.mock('@renderer/hooks/useResizable', () => ({
  useResizable: (...args: any[]) => mockUseResizable(...args),
}))

import { ResizableSplit } from '@renderer/components/layout/ResizableSplit'

describe('ResizableSplit', () => {
  beforeEach(() => {
    mockUseResizable.mockReturnValue({
      ratio: 0.6,
      isDragging: false,
      handleMouseDown: vi.fn(),
    })
  })

  it('renders left and right panes', () => {
    const { container } = render(
      <ResizableSplit
        left={<div data-testid="left">Left</div>}
        right={<div data-testid="right">Right</div>}
      />
    )

    expect(container.querySelector('[data-testid="left"]')).toBeInTheDocument()
    expect(container.querySelector('[data-testid="right"]')).toBeInTheDocument()
  })

  it('applies correct width ratios from hook', () => {
    mockUseResizable.mockReturnValue({
      ratio: 0.7,
      isDragging: false,
      handleMouseDown: vi.fn(),
    })

    const { container } = render(
      <ResizableSplit left={<div>Left</div>} right={<div>Right</div>} />
    )

    const panes = container.querySelectorAll('.h-full.overflow-hidden, .h-full.relative')
    // Left pane should be 70%
    expect((panes[0] as HTMLElement).style.width).toBe('70%')
  })

  it('passes initialRatio to useResizable', () => {
    render(
      <ResizableSplit
        left={<div>Left</div>}
        right={<div>Right</div>}
        initialRatio={0.5}
        minRatio={0.3}
        maxRatio={0.7}
      />
    )

    expect(mockUseResizable).toHaveBeenCalledWith({
      initialRatio: 0.5,
      minRatio: 0.3,
      maxRatio: 0.7,
    })
  })

  it('uses default ratios when not specified', () => {
    render(
      <ResizableSplit left={<div>Left</div>} right={<div>Right</div>} />
    )

    expect(mockUseResizable).toHaveBeenCalledWith({
      initialRatio: 0.6,
      minRatio: 0.2,
      maxRatio: 0.8,
    })
  })

  it('renders divider between panes', () => {
    const { container } = render(
      <ResizableSplit left={<div>Left</div>} right={<div>Right</div>} />
    )

    const divider = container.querySelector('.cursor-ew-resize')
    expect(divider).toBeInTheDocument()
  })

  it('applies dragging style to divider when isDragging', () => {
    mockUseResizable.mockReturnValue({
      ratio: 0.6,
      isDragging: true,
      handleMouseDown: vi.fn(),
    })

    const { container } = render(
      <ResizableSplit left={<div>Left</div>} right={<div>Right</div>} />
    )

    const divider = container.querySelector('.cursor-ew-resize')!
    expect(divider.className).toContain('w-0.5')
  })
})
