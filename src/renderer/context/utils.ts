// Get home directory in renderer process
export function homedir(): string {
  // In Electron renderer with nodeIntegration disabled,
  // we need to get this from environment variables
  if (typeof process !== 'undefined' && process.env) {
    return process.env.HOME || process.env.USERPROFILE || '/'
  }
  return '/'
}
