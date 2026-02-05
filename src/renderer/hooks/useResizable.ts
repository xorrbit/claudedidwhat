import { useState, useCallback, useRef, useEffect } from 'react'

interface UseResizableOptions {
  initialRatio?: number
  minRatio?: number
  maxRatio?: number
}

interface UseResizableReturn {
  ratio: number
  isDragging: boolean
  handleMouseDown: (e: React.MouseEvent) => void
}

export function useResizable(options: UseResizableOptions = {}): UseResizableReturn {
  const { initialRatio = 0.6, minRatio = 0.2, maxRatio = 0.8 } = options

  const [ratio, setRatio] = useState(initialRatio)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLElement | null>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    containerRef.current = e.currentTarget.parentElement
    document.body.classList.add('resizing')
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const newRatio = (e.clientX - rect.left) / rect.width

      // Clamp ratio to min/max bounds
      const clampedRatio = Math.min(maxRatio, Math.max(minRatio, newRatio))
      setRatio(clampedRatio)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.body.classList.remove('resizing')
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.classList.remove('resizing')
    }
  }, [isDragging, minRatio, maxRatio])

  return { ratio, isDragging, handleMouseDown }
}
