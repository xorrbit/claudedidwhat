import * as pty from 'node-pty'
import { platform } from 'os'
import { existsSync, readlinkSync } from 'fs'
import { execSync } from 'child_process'
import { detectShell } from './shell'

interface PtyCallbacks {
  onData: (data: string) => void
  onExit: (code: number) => void
}

interface PtyInstance {
  pty: pty.IPty
  callbacks: PtyCallbacks
}

export class PtyManager {
  private instances: Map<string, PtyInstance> = new Map()

  /**
   * Spawn a new PTY for a session.
   */
  spawn(
    sessionId: string,
    cwd: string,
    shell?: string,
    callbacks?: PtyCallbacks
  ): void {
    // Kill any existing PTY for this session
    this.kill(sessionId)

    const shellInfo = shell ? { path: shell, name: shell } : detectShell()
    const isWindows = platform() === 'win32'

    // Validate cwd exists
    if (!existsSync(cwd)) {
      throw new Error(`Directory does not exist: ${cwd}`)
    }

    console.log(`Spawning PTY: shell=${shellInfo.path}, cwd=${cwd}`)

    let ptyProcess: pty.IPty
    try {
      ptyProcess = pty.spawn(shellInfo.path, [], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
        },
        useConpty: isWindows,
      })
    } catch (err) {
      console.error('node-pty spawn failed:', err)
      throw new Error(`Failed to spawn shell: ${err instanceof Error ? err.message : err}`)
    }

    const instance: PtyInstance = {
      pty: ptyProcess,
      callbacks: callbacks || { onData: () => {}, onExit: () => {} },
    }

    // Set up event handlers
    ptyProcess.onData((data) => {
      instance.callbacks.onData(data)
    })

    ptyProcess.onExit(({ exitCode }) => {
      instance.callbacks.onExit(exitCode)
      this.instances.delete(sessionId)
    })

    this.instances.set(sessionId, instance)
  }

  /**
   * Write data to a PTY.
   */
  write(sessionId: string, data: string): void {
    const instance = this.instances.get(sessionId)
    if (instance) {
      instance.pty.write(data)
    }
  }

  /**
   * Resize a PTY.
   */
  resize(sessionId: string, cols: number, rows: number): void {
    const instance = this.instances.get(sessionId)
    if (instance) {
      instance.pty.resize(cols, rows)
    }
  }

  /**
   * Kill a PTY and clean up.
   */
  kill(sessionId: string): void {
    const instance = this.instances.get(sessionId)
    if (instance) {
      instance.pty.kill()
      this.instances.delete(sessionId)
    }
  }

  /**
   * Kill all PTYs (for cleanup on app exit).
   */
  killAll(): void {
    for (const [sessionId] of this.instances) {
      this.kill(sessionId)
    }
  }

  /**
   * Get the current working directory of a PTY process.
   */
  getCwd(sessionId: string): string | null {
    const instance = this.instances.get(sessionId)
    if (!instance) return null

    const pid = instance.pty.pid
    if (!pid) return null

    // On Linux, read the cwd from /proc/<pid>/cwd
    if (platform() === 'linux') {
      try {
        return readlinkSync(`/proc/${pid}/cwd`)
      } catch {
        return null
      }
    }

    // On macOS, use lsof to get the cwd
    if (platform() === 'darwin') {
      try {
        // -a = AND conditions, -d cwd = only cwd file descriptor, -p = process ID
        // -F n = output format with 'n' prefix for name field
        const output = execSync(`lsof -a -d cwd -p ${pid} -F n`, {
          encoding: 'utf-8',
          timeout: 1000,
        })
        // Output format: "p<pid>\nn<path>\n" - extract line starting with 'n'
        const match = output.match(/^n(.+)$/m)
        return match ? match[1] : null
      } catch {
        return null
      }
    }

    return null
  }
}
