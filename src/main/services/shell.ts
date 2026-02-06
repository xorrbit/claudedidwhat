import { existsSync } from 'fs'
import { platform } from 'os'

export interface ShellInfo {
  path: string
  name: string
}

/**
 * Detects the user's default shell based on the platform.
 */
export function detectShell(): ShellInfo {
  const currentPlatform = platform()

  if (currentPlatform === 'win32') {
    return detectWindowsShell()
  }

  return detectUnixShell()
}

function detectUnixShell(): ShellInfo {
  // Try $SHELL environment variable first
  const shellEnv = process.env.SHELL

  if (shellEnv && existsSync(shellEnv)) {
    return {
      path: shellEnv,
      name: getShellName(shellEnv),
    }
  }

  // Fallback shells to try
  const fallbacks = ['/bin/zsh', '/bin/bash', '/bin/sh']

  for (const shell of fallbacks) {
    if (existsSync(shell)) {
      return {
        path: shell,
        name: getShellName(shell),
      }
    }
  }

  // Last resort fallback
  return {
    path: '/bin/sh',
    name: 'sh',
  }
}

function detectWindowsShell(): ShellInfo {
  // Try PowerShell Core first
  const pwshPath = process.env.ProgramFiles
    ? `${process.env.ProgramFiles}\\PowerShell\\7\\pwsh.exe`
    : null

  if (pwshPath && existsSync(pwshPath)) {
    return {
      path: pwshPath,
      name: 'PowerShell 7',
    }
  }

  // Try Windows PowerShell
  const powershellPath = `${process.env.SystemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`

  if (existsSync(powershellPath)) {
    return {
      path: powershellPath,
      name: 'PowerShell',
    }
  }

  // Fallback to cmd
  const cmdPath = `${process.env.SystemRoot}\\System32\\cmd.exe`

  return {
    path: cmdPath,
    name: 'Command Prompt',
  }
}

export function getShellName(shellPath: string): string {
  const baseName = shellPath.split('/').pop() || shellPath

  const shellNames: Record<string, string> = {
    zsh: 'Zsh',
    bash: 'Bash',
    sh: 'Shell',
    fish: 'Fish',
    'pwsh.exe': 'PowerShell',
    'powershell.exe': 'PowerShell',
    'cmd.exe': 'Command Prompt',
  }

  return shellNames[baseName] || baseName
}
