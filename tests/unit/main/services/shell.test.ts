import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockExistsSync, mockPlatform } = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockPlatform: vi.fn(),
}))

vi.mock('fs', () => {
  const mod = { existsSync: mockExistsSync }
  return { ...mod, default: mod }
})

vi.mock('os', () => {
  const mod = { platform: mockPlatform }
  return { ...mod, default: mod }
})

import { detectShell, ShellInfo } from '@main/services/shell'

describe('detectShell', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('Unix shell detection', () => {
    beforeEach(() => {
      mockPlatform.mockReturnValue('linux')
    })

    it('uses $SHELL env var when set and file exists', () => {
      process.env.SHELL = '/usr/bin/fish'
      mockExistsSync.mockImplementation((p: string) => p === '/usr/bin/fish')

      const result = detectShell()

      expect(result).toEqual({ path: '/usr/bin/fish', name: 'Fish' })
    })

    it('ignores $SHELL when file does not exist', () => {
      process.env.SHELL = '/nonexistent/shell'
      mockExistsSync.mockImplementation((p: string) => p === '/bin/zsh')

      const result = detectShell()

      expect(result).toEqual({ path: '/bin/zsh', name: 'Zsh' })
    })

    it('falls back to /bin/zsh first', () => {
      delete process.env.SHELL
      mockExistsSync.mockImplementation((p: string) => p === '/bin/zsh' || p === '/bin/bash')

      const result = detectShell()

      expect(result).toEqual({ path: '/bin/zsh', name: 'Zsh' })
    })

    it('falls back to /bin/bash if zsh not found', () => {
      delete process.env.SHELL
      mockExistsSync.mockImplementation((p: string) => p === '/bin/bash')

      const result = detectShell()

      expect(result).toEqual({ path: '/bin/bash', name: 'Bash' })
    })

    it('falls back to /bin/sh if zsh and bash not found', () => {
      delete process.env.SHELL
      mockExistsSync.mockImplementation((p: string) => p === '/bin/sh')

      const result = detectShell()

      expect(result).toEqual({ path: '/bin/sh', name: 'Shell' })
    })

    it('returns /bin/sh as last resort when nothing exists', () => {
      delete process.env.SHELL
      mockExistsSync.mockReturnValue(false)

      const result = detectShell()

      expect(result).toEqual({ path: '/bin/sh', name: 'sh' })
    })

    it('maps shell names correctly', () => {
      const cases: Array<{ shellPath: string; expectedName: string }> = [
        { shellPath: '/bin/zsh', expectedName: 'Zsh' },
        { shellPath: '/bin/bash', expectedName: 'Bash' },
        { shellPath: '/usr/bin/fish', expectedName: 'Fish' },
        { shellPath: '/bin/sh', expectedName: 'Shell' },
      ]

      for (const { shellPath, expectedName } of cases) {
        process.env.SHELL = shellPath
        mockExistsSync.mockImplementation((p: string) => p === shellPath)

        const result = detectShell()
        expect(result.name).toBe(expectedName)
      }
    })

    it('uses basename as name for unknown shells', () => {
      process.env.SHELL = '/usr/local/bin/nushell'
      mockExistsSync.mockImplementation((p: string) => p === '/usr/local/bin/nushell')

      const result = detectShell()

      expect(result).toEqual({ path: '/usr/local/bin/nushell', name: 'nushell' })
    })
  })

  describe('Windows shell detection', () => {
    beforeEach(() => {
      mockPlatform.mockReturnValue('win32')
      process.env.ProgramFiles = 'C:\\Program Files'
      process.env.SystemRoot = 'C:\\Windows'
    })

    it('prefers PowerShell 7 when available', () => {
      mockExistsSync.mockImplementation((p: string) =>
        p === 'C:\\Program Files\\PowerShell\\7\\pwsh.exe'
      )

      const result = detectShell()

      expect(result).toEqual({
        path: 'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
        name: 'PowerShell 7',
      })
    })

    it('falls back to Windows PowerShell', () => {
      mockExistsSync.mockImplementation((p: string) =>
        p === 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'
      )

      const result = detectShell()

      expect(result).toEqual({
        path: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
        name: 'PowerShell',
      })
    })

    it('falls back to cmd.exe as last resort', () => {
      mockExistsSync.mockReturnValue(false)

      const result = detectShell()

      expect(result).toEqual({
        path: 'C:\\Windows\\System32\\cmd.exe',
        name: 'Command Prompt',
      })
    })

    it('skips PowerShell 7 when ProgramFiles is not set', () => {
      delete process.env.ProgramFiles
      mockExistsSync.mockImplementation((p: string) =>
        p === 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'
      )

      const result = detectShell()

      expect(result.name).toBe('PowerShell')
    })
  })
})
