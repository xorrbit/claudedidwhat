import { useEffect, useRef, useState } from 'react'
import { Session } from '@shared/types'
import { subscribePtyData } from '../lib/eventDispatchers'

const PROMPT_IDLE_THRESHOLD_MS = 700
const FALLBACK_IDLE_THRESHOLD_MS = 8000
const PROMPT_HINT_MAX_AGE_MS = 20000
const FOREGROUND_POLL_INTERVAL_MS = 1500

const INPUT_PROMPT_PATTERNS = [
  /\b(?:waiting|awaiting)\s+for\s+(?:your\s+)?(?:input|response|reply)\b/i,
  /\b(?:press|hit|type|enter|provide)\b.{0,40}\b(?:input|response|reply|continue|confirm|send|submit)\b/i,
  /\bwhat\s+would\s+you\s+like\s+to\s+do\??\b/i,
  /\b(?:choose|select)\s+(?:an?\s+)?option\b/i,
  /\b(?:yes\/no|y\/n)\b/i,
  /\bcontinue\?\s*$/im,
]

// Strip ANSI control sequences to make text matching robust across colorized output.
function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex -- terminal control sequences intentionally use control chars
  return text.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '')
}

function hasVisibleText(text: string): boolean {
  return text.trim().length > 0
}

function normalizeOutputForMatching(data: string): string {
  return stripAnsi(data).replace(/\r/g, '')
}

function hasInputPromptHint(normalizedOutput: string): boolean {
  return INPUT_PROMPT_PATTERNS.some((pattern) => pattern.test(normalizedOutput))
}

function setsAreEqual(left: Set<string>, right: Set<string>): boolean {
  if (left.size !== right.size) return false
  for (const value of left) {
    if (!right.has(value)) return false
  }
  return true
}

export function useInputWaiting(
  sessions: Session[],
  activeSessionId: string | null
): Set<string> {
  const [waitingIds, setWaitingIds] = useState<Set<string>>(new Set())
  const lastOutputTime = useRef<Map<string, number>>(new Map())
  const lastPromptHintTime = useRef<Map<string, number>>(new Map())
  const sessionIdsKey = sessions.map((session) => session.id).join('\0')

  useEffect(() => {
    const now = Date.now()
    const sessionIds = sessionIdsKey ? sessionIdsKey.split('\0') : []
    const activeIds = new Set(sessionIds)

    for (const sessionId of sessionIds) {
      if (!lastOutputTime.current.has(sessionId)) {
        lastOutputTime.current.set(sessionId, now)
      }
    }

    for (const sessionId of Array.from(lastOutputTime.current.keys())) {
      if (!activeIds.has(sessionId)) {
        lastOutputTime.current.delete(sessionId)
        lastPromptHintTime.current.delete(sessionId)
      }
    }

    setWaitingIds((previous) => {
      const filtered = new Set<string>()
      for (const sessionId of previous) {
        if (activeIds.has(sessionId)) {
          filtered.add(sessionId)
        }
      }
      return setsAreEqual(previous, filtered) ? previous : filtered
    })
  }, [sessionIdsKey])

  useEffect(() => {
    const sessionIds = sessionIdsKey ? sessionIdsKey.split('\0') : []
    const unsubscribers = sessionIds.map((sessionId) =>
      subscribePtyData(sessionId, (data) => {
        const now = Date.now()
        lastOutputTime.current.set(sessionId, now)
        const normalizedData = normalizeOutputForMatching(data)

        if (hasInputPromptHint(normalizedData)) {
          lastPromptHintTime.current.set(sessionId, now)
          return
        }

        if (hasVisibleText(normalizedData)) {
          // Any non-prompt output means the previous prompt hint is stale.
          lastPromptHintTime.current.delete(sessionId)
        }
      })
    )

    return () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe()
      }
    }
  }, [sessionIdsKey])

  useEffect(() => {
    let cancelled = false
    let pollInFlight = false

    const pollWaitingSessions = async () => {
      if (pollInFlight) return
      pollInFlight = true

      try {
        const sessionIds = sessionIdsKey ? sessionIdsKey.split('\0') : []
        const backgroundSessionIds = sessionIds.filter((sessionId) => sessionId !== activeSessionId)
        if (backgroundSessionIds.length === 0) {
          setWaitingIds((previous) => (previous.size === 0 ? previous : new Set()))
          return
        }

        const now = Date.now()
        const foregroundProcesses = await Promise.all(
          backgroundSessionIds.map(async (sessionId) => {
            try {
              const processName = await window.electronAPI.pty.getForegroundProcess(sessionId)
              return { sessionId, processName }
            } catch {
              return { sessionId, processName: null as string | null }
            }
          })
        )

        if (cancelled) return

        const nextWaitingIds = new Set<string>()
        for (const { sessionId, processName } of foregroundProcesses) {
          const isAiForeground = processName === 'claude' || processName === 'codex'
          if (!isAiForeground) {
            lastPromptHintTime.current.delete(sessionId)
            continue
          }

          const lastOutput = lastOutputTime.current.get(sessionId) ?? now
          const lastPromptHint = lastPromptHintTime.current.get(sessionId)
          const hasFreshPromptHint = (
            typeof lastPromptHint === 'number' &&
            now - lastPromptHint <= PROMPT_HINT_MAX_AGE_MS
          )
          const idleThreshold = hasFreshPromptHint
            ? PROMPT_IDLE_THRESHOLD_MS
            : FALLBACK_IDLE_THRESHOLD_MS

          if (now - lastOutput >= idleThreshold) {
            nextWaitingIds.add(sessionId)
          }
        }

        setWaitingIds((previous) => (
          setsAreEqual(previous, nextWaitingIds) ? previous : nextWaitingIds
        ))
      } finally {
        pollInFlight = false
      }
    }

    void pollWaitingSessions()
    const intervalId = window.setInterval(() => {
      void pollWaitingSessions()
    }, FOREGROUND_POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [activeSessionId, sessionIdsKey])

  useEffect(() => {
    if (!activeSessionId) return
    setWaitingIds((previous) => {
      if (!previous.has(activeSessionId)) return previous
      const next = new Set(previous)
      next.delete(activeSessionId)
      return next
    })
  }, [activeSessionId])

  return waitingIds
}
