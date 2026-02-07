import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron'
import { isTrustedRendererUrl } from './trusted-renderer'

function isTopLevelFrame(event: IpcMainEvent | IpcMainInvokeEvent): boolean {
  if (!event.senderFrame || !event.sender.mainFrame) return false

  // Prefer direct identity when available.
  if (event.senderFrame === event.sender.mainFrame) return true

  // Electron can surface distinct wrapper objects for the same frame,
  // so fall back to stable frame identifiers.
  const senderRoutingId = event.senderFrame.routingId
  const mainRoutingId = event.sender.mainFrame.routingId
  if (typeof senderRoutingId !== 'number' || typeof mainRoutingId !== 'number') {
    return false
  }
  if (senderRoutingId !== mainRoutingId) return false

  const senderProcessId = event.senderFrame.processId
  const mainProcessId = event.sender.mainFrame.processId
  if (typeof senderProcessId === 'number' && typeof mainProcessId === 'number') {
    return senderProcessId === mainProcessId
  }

  return true
}

/**
 * Validate that an IPC message comes from a trusted origin.
 *
 * Accepts:
 *   - The packaged renderer entrypoint file URL
 *   - The Vite dev server origin when running in dev mode
 *
 * Rejects everything else to prevent untrusted content (e.g. from a
 * navigation bypass or renderer compromise) from invoking privileged
 * IPC handlers.
 */
export function validateIpcSender(event: IpcMainEvent | IpcMainInvokeEvent): boolean {
  try {
    const senderFrame = event.senderFrame
    if (!senderFrame) return false

    // Only allow calls from the top-level renderer frame.
    if (!isTopLevelFrame(event)) return false

    const url = senderFrame.url
    return isTrustedRendererUrl(url)
  } catch {
    // senderFrame destroyed, URL parsing failed, etc. — reject
    return false
  }
}
