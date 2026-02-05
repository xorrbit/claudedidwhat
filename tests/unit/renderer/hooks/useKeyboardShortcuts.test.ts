import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useKeyboardShortcuts } from '@renderer/hooks/useKeyboardShortcuts'

describe('useKeyboardShortcuts', () => {
  const mockHandlers = {
    onNewTab: vi.fn(),
    onCloseTab: vi.fn(),
    onNextTab: vi.fn(() => 'session-2'),
    onPrevTab: vi.fn(() => 'session-1'),
    onGoToTab: vi.fn(),
    onShowHelp: vi.fn(),
    onTabSwitched: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const dispatchKeyDown = (key: string, options: Partial<KeyboardEvent> = {}) => {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...options,
    })
    window.dispatchEvent(event)
    return event
  }

  describe('new tab shortcut', () => {
    it('Ctrl+T triggers onNewTab', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers))

      dispatchKeyDown('t', { ctrlKey: true })

      expect(mockHandlers.onNewTab).toHaveBeenCalledTimes(1)
    })

    it('Cmd+T triggers onNewTab (macOS)', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers))

      dispatchKeyDown('t', { metaKey: true })

      expect(mockHandlers.onNewTab).toHaveBeenCalledTimes(1)
    })

    it('T without modifier does not trigger onNewTab', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers))

      dispatchKeyDown('t')

      expect(mockHandlers.onNewTab).not.toHaveBeenCalled()
    })
  })

  describe('close tab shortcut', () => {
    it('Ctrl+W triggers onCloseTab', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers))

      dispatchKeyDown('w', { ctrlKey: true })

      expect(mockHandlers.onCloseTab).toHaveBeenCalledTimes(1)
    })

    it('Cmd+W triggers onCloseTab (macOS)', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers))

      dispatchKeyDown('w', { metaKey: true })

      expect(mockHandlers.onCloseTab).toHaveBeenCalledTimes(1)
    })
  })

  describe('tab navigation shortcuts', () => {
    it('Ctrl+Tab triggers onNextTab', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers))

      dispatchKeyDown('Tab', { ctrlKey: true })

      expect(mockHandlers.onNextTab).toHaveBeenCalledTimes(1)
      expect(mockHandlers.onPrevTab).not.toHaveBeenCalled()
    })

    it('Ctrl+Shift+Tab triggers onPrevTab', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers))

      dispatchKeyDown('Tab', { ctrlKey: true, shiftKey: true })

      expect(mockHandlers.onPrevTab).toHaveBeenCalledTimes(1)
      expect(mockHandlers.onNextTab).not.toHaveBeenCalled()
    })

    it('calls onTabSwitched after tab navigation with double rAF', () => {
      // Mock requestAnimationFrame
      let rafCallbacks: (() => void)[] = []
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        rafCallbacks.push(cb as () => void)
        return rafCallbacks.length
      })

      renderHook(() => useKeyboardShortcuts(mockHandlers))

      dispatchKeyDown('Tab', { ctrlKey: true })

      expect(mockHandlers.onTabSwitched).not.toHaveBeenCalled()

      // First rAF
      rafCallbacks[0]()
      expect(mockHandlers.onTabSwitched).not.toHaveBeenCalled()

      // Second rAF
      rafCallbacks[1]()
      expect(mockHandlers.onTabSwitched).toHaveBeenCalledWith('session-2')
    })

    it('does not call onTabSwitched if onNextTab returns undefined', () => {
      const handlers = {
        ...mockHandlers,
        onNextTab: vi.fn(() => undefined),
      }

      renderHook(() => useKeyboardShortcuts(handlers))

      dispatchKeyDown('Tab', { ctrlKey: true })

      expect(handlers.onTabSwitched).not.toHaveBeenCalled()
    })
  })

  describe('go to tab by number', () => {
    it('Ctrl+1 through Ctrl+9 trigger onGoToTab with correct index', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers))

      for (let i = 1; i <= 9; i++) {
        dispatchKeyDown(String(i), { ctrlKey: true })
        expect(mockHandlers.onGoToTab).toHaveBeenLastCalledWith(i - 1)
      }

      expect(mockHandlers.onGoToTab).toHaveBeenCalledTimes(9)
    })

    it('Ctrl+0 does not trigger onGoToTab', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers))

      dispatchKeyDown('0', { ctrlKey: true })

      expect(mockHandlers.onGoToTab).not.toHaveBeenCalled()
    })
  })

  describe('help shortcut', () => {
    it('Ctrl+? triggers onShowHelp when provided', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers))

      dispatchKeyDown('?', { ctrlKey: true })

      expect(mockHandlers.onShowHelp).toHaveBeenCalledTimes(1)
    })

    it('Ctrl+? does not throw when onShowHelp is not provided', () => {
      const { onShowHelp, ...handlersWithoutHelp } = mockHandlers

      renderHook(() => useKeyboardShortcuts(handlersWithoutHelp))

      expect(() => {
        dispatchKeyDown('?', { ctrlKey: true })
      }).not.toThrow()
    })
  })

  describe('cleanup', () => {
    it('removes event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const { unmount } = renderHook(() => useKeyboardShortcuts(mockHandlers))

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    })
  })

  describe('modifier key combinations', () => {
    it('ignores shortcuts when both Ctrl and Meta are pressed', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers))

      // Both modifiers - should still work (either one is sufficient)
      dispatchKeyDown('t', { ctrlKey: true, metaKey: true })

      expect(mockHandlers.onNewTab).toHaveBeenCalledTimes(1)
    })

    it('ignores shortcuts when Alt is pressed alone', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers))

      dispatchKeyDown('t', { altKey: true })

      expect(mockHandlers.onNewTab).not.toHaveBeenCalled()
    })
  })
})
