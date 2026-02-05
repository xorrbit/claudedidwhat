// IPC client wrapper
// This module provides type-safe access to the Electron API
// exposed through the preload script

export function getElectronAPI() {
  if (typeof window === 'undefined' || !window.electronAPI) {
    throw new Error('Electron API not available')
  }
  return window.electronAPI
}

// Re-export for convenience
export const electronAPI = {
  get pty() {
    return getElectronAPI().pty
  },
  get git() {
    return getElectronAPI().git
  },
  get fs() {
    return getElectronAPI().fs
  },
}
