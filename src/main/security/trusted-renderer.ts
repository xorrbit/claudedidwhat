import { app } from 'electron'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { pathsEqual } from './path-utils'

function getTrustedRendererIndexPaths(): string[] {
  const appPath = app.getAppPath()
  // appPath can vary by launch mode:
  // - project root: /repo
  // - dist folder: /repo/dist
  // - dist main folder: /repo/dist/main
  return [
    resolve(appPath, 'dist', 'renderer', 'index.html'),
    resolve(appPath, '..', 'dist', 'renderer', 'index.html'),
    resolve(appPath, '..', '..', 'dist', 'renderer', 'index.html'),
  ]
}

function getTrustedDevServerUrl(): URL | null {
  if (app.isPackaged || !process.env.VITE_DEV_SERVER_URL) return null
  try {
    return new URL(process.env.VITE_DEV_SERVER_URL)
  } catch {
    return null
  }
}

export function isTrustedDevServerUrl(url: string): boolean {
  const trustedDevUrl = getTrustedDevServerUrl()
  if (!trustedDevUrl) return false

  try {
    const candidate = new URL(url)
    if (candidate.origin !== trustedDevUrl.origin) return false

    const trustedPath = trustedDevUrl.pathname || '/'
    const trustedPrefix = trustedPath.endsWith('/') ? trustedPath : `${trustedPath}/`
    return candidate.pathname === trustedPath || candidate.pathname.startsWith(trustedPrefix)
  } catch {
    return false
  }
}

export function isTrustedRendererFileUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'file:') return false

    const filePath = fileURLToPath(parsed)
    const trustedIndexPaths = getTrustedRendererIndexPaths()

    // Allow only the packaged renderer entrypoint.
    return trustedIndexPaths.some((trustedIndexPath) => pathsEqual(filePath, trustedIndexPath))
  } catch {
    return false
  }
}

export function isTrustedRendererUrl(url: string): boolean {
  return isTrustedDevServerUrl(url) || isTrustedRendererFileUrl(url)
}
