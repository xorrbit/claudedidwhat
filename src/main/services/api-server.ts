import * as http from 'http'
import * as crypto from 'crypto'
import { Session } from '@shared/types'
import { PtyManager } from './pty-manager'

const MAX_BODY_SIZE = 1024 * 1024 // 1MB

interface PendingSessionRequest {
  resolve: (session: Session) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

export class ApiServer {
  private server: http.Server | null = null
  private token: Buffer | null = null
  private ptyManager: PtyManager
  private sendToRenderer: (channel: string, ...args: unknown[]) => void
  private pendingRequests = new Map<string, PendingSessionRequest>()
  private sessions: Session[] = []

  constructor(
    ptyManager: PtyManager,
    sendToRenderer: (channel: string, ...args: unknown[]) => void
  ) {
    this.ptyManager = ptyManager
    this.sendToRenderer = sendToRenderer
  }

  start(): void {
    // Check if explicitly disabled
    if (process.env.CLAUDEDIDWHAT_API === '0') {
      console.log('API server disabled: CLAUDEDIDWHAT_API=0')
      return
    }

    const tokenStr = process.env.CLAUDEDIDWHAT_API_TOKEN
    if (!tokenStr) {
      console.log('API server disabled: CLAUDEDIDWHAT_API_TOKEN not set')
      return
    }

    this.token = Buffer.from(tokenStr)

    const port = parseInt(process.env.CLAUDEDIDWHAT_API_PORT || '19532', 10)

    this.server = http.createServer((req, res) => this.handleRequest(req, res))

    this.server.listen(port, '127.0.0.1', () => {
      console.log(`API server listening on http://127.0.0.1:${port}`)
    })

    this.server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`API server: port ${port} already in use`)
      } else {
        console.error('API server error:', err)
      }
    })
  }

  stop(): void {
    // Clean up pending requests
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timer)
      pending.reject(new Error('Server shutting down'))
    }
    this.pendingRequests.clear()

    if (this.server) {
      this.server.close()
      this.server = null
    }
  }

  resolveSessionRequest(requestId: string, session: Session): void {
    const pending = this.pendingRequests.get(requestId)
    if (pending) {
      clearTimeout(pending.timer)
      this.pendingRequests.delete(requestId)
      pending.resolve(session)
    }
  }

  rejectSessionRequest(requestId: string, error: string): void {
    const pending = this.pendingRequests.get(requestId)
    if (pending) {
      clearTimeout(pending.timer)
      this.pendingRequests.delete(requestId)
      pending.reject(new Error(error))
    }
  }

  updateSessions(sessions: Session[]): void {
    this.sessions = sessions
  }

  private checkAuth(req: http.IncomingMessage): boolean {
    if (!this.token) return false

    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) return false

    const provided = Buffer.from(authHeader.slice(7))
    if (provided.length !== this.token.length) return false

    return crypto.timingSafeEqual(provided, this.token)
  }

  private async readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      let size = 0

      req.on('data', (chunk: Buffer) => {
        size += chunk.length
        if (size > MAX_BODY_SIZE) {
          req.destroy()
          reject(new Error('Request body too large'))
          return
        }
        chunks.push(chunk)
      })

      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
      req.on('error', reject)
    })
  }

  private json(res: http.ServerResponse, status: number, data: unknown): void {
    const body = JSON.stringify(data)
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    })
    res.end(body)
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = req.url || '/'
    const method = req.method || 'GET'

    try {
      // GET /api/health — no auth required
      if (method === 'GET' && url === '/api/health') {
        this.json(res, 200, { status: 'ok' })
        return
      }

      // All other routes require auth
      if (!this.checkAuth(req)) {
        this.json(res, 401, { error: 'Unauthorized' })
        return
      }

      // POST /api/sessions — create session
      if (method === 'POST' && url === '/api/sessions') {
        await this.handleCreateSession(req, res)
        return
      }

      // GET /api/sessions — list sessions
      if (method === 'GET' && url === '/api/sessions') {
        this.json(res, 200, { sessions: this.sessions })
        return
      }

      // Match /api/sessions/:id/exec and /api/sessions/:id
      const execMatch = url.match(/^\/api\/sessions\/([^/]+)\/exec$/)
      if (method === 'POST' && execMatch) {
        await this.handleExec(req, res, execMatch[1])
        return
      }

      const sessionMatch = url.match(/^\/api\/sessions\/([^/]+)$/)
      if (method === 'DELETE' && sessionMatch) {
        await this.handleDeleteSession(res, sessionMatch[1])
        return
      }

      this.json(res, 404, { error: 'Not found' })
    } catch (err) {
      console.error('API request error:', err)
      this.json(res, 500, { error: 'Internal server error' })
    }
  }

  private async handleCreateSession(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    let cwd: string | undefined
    let command: string | undefined

    const bodyStr = await this.readBody(req)
    if (bodyStr) {
      try {
        const body = JSON.parse(bodyStr)
        cwd = body.cwd
        command = body.command
      } catch {
        this.json(res, 400, { error: 'Invalid JSON' })
        return
      }
    }

    const requestId = `api-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

    try {
      const session = await this.requestSessionCreation(requestId, cwd)

      // If a command was provided, wait a bit for the shell to be ready then write it
      if (command) {
        setTimeout(() => {
          this.ptyManager.write(session.id, command + '\n')
        }, 200)
      }

      this.json(res, 201, { session })
    } catch (err) {
      this.json(res, 500, { error: err instanceof Error ? err.message : 'Session creation failed' })
    }
  }

  private requestSessionCreation(requestId: string, cwd?: string): Promise<Session> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId)
        reject(new Error('Session creation timed out'))
      }, 10000)

      this.pendingRequests.set(requestId, { resolve, reject, timer })

      // Send to renderer to create the session
      this.sendToRenderer('api:create-session', requestId, cwd)
    })
  }

  private async handleExec(req: http.IncomingMessage, res: http.ServerResponse, sessionId: string): Promise<void> {
    // Verify session exists
    const session = this.sessions.find(s => s.id === sessionId)
    if (!session) {
      this.json(res, 404, { error: 'Session not found' })
      return
    }

    const bodyStr = await this.readBody(req)
    if (!bodyStr) {
      this.json(res, 400, { error: 'Request body required' })
      return
    }

    let command: string
    try {
      const body = JSON.parse(bodyStr)
      command = body.command
    } catch {
      this.json(res, 400, { error: 'Invalid JSON' })
      return
    }

    if (!command || typeof command !== 'string') {
      this.json(res, 400, { error: 'command is required' })
      return
    }

    this.ptyManager.write(sessionId, command + '\n')
    this.json(res, 200, { ok: true })
  }

  private async handleDeleteSession(res: http.ServerResponse, sessionId: string): Promise<void> {
    const session = this.sessions.find(s => s.id === sessionId)
    if (!session) {
      this.json(res, 404, { error: 'Session not found' })
      return
    }

    // Send close request to renderer
    this.sendToRenderer('api:close-session', sessionId)
    this.json(res, 200, { ok: true })
  }
}
