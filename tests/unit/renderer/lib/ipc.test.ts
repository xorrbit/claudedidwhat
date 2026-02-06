import { describe, it, expect, vi } from 'vitest'
import { getElectronAPI, electronAPI } from '@renderer/lib/ipc'

describe('ipc', () => {
  describe('getElectronAPI', () => {
    it('returns window.electronAPI when available', () => {
      const api = getElectronAPI()

      expect(api).toBe(window.electronAPI)
    })

    it('throws when window.electronAPI is not available', () => {
      const original = window.electronAPI
      // Temporarily remove electronAPI
      Object.defineProperty(window, 'electronAPI', {
        value: undefined,
        writable: true,
      })

      expect(() => getElectronAPI()).toThrow('Electron API not available')

      // Restore
      Object.defineProperty(window, 'electronAPI', {
        value: original,
        writable: true,
      })
    })
  })

  describe('electronAPI proxy', () => {
    it('provides access to pty namespace', () => {
      expect(electronAPI.pty).toBe(window.electronAPI.pty)
    })

    it('provides access to git namespace', () => {
      expect(electronAPI.git).toBe(window.electronAPI.git)
    })

    it('provides access to fs namespace', () => {
      expect(electronAPI.fs).toBe(window.electronAPI.fs)
    })

    it('pty getter calls getElectronAPI each time', () => {
      const pty1 = electronAPI.pty
      const pty2 = electronAPI.pty

      // Should get the same object since window.electronAPI hasn't changed
      expect(pty1).toBe(pty2)
    })

    it('throws when accessing namespace without electronAPI', () => {
      const original = window.electronAPI
      Object.defineProperty(window, 'electronAPI', {
        value: undefined,
        writable: true,
      })

      expect(() => electronAPI.pty).toThrow('Electron API not available')
      expect(() => electronAPI.git).toThrow('Electron API not available')
      expect(() => electronAPI.fs).toThrow('Electron API not available')

      Object.defineProperty(window, 'electronAPI', {
        value: original,
        writable: true,
      })
    })
  })
})
