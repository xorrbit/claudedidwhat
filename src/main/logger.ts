const DEBUG = process.argv.includes('--debug') || process.env.DEBUG === '1'

export function debugLog(...args: unknown[]): void {
  if (DEBUG) {
    console.log('[DEBUG]', ...args)
  }
}
