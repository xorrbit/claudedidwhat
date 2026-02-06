# Security

Last updated: 2026-02-06

## Overview

claudedidwhat is an Electron-based terminal emulator with integrated git UI. The threat model has three tiers:

1. **Main process** (privileged) — spawns PTY shells, reads/writes the filesystem, runs git commands
2. **Renderer process** (sandboxed) — React UI + xterm.js terminal, communicates with main only through a typed IPC bridge
3. **Child shells** (user-controlled) — arbitrary command execution is the product's purpose

The security goal is to keep the privileged boundary tight: the renderer should never gain capabilities beyond the explicitly exposed IPC surface, and the IPC surface should validate all inputs. Terminal emulator behaviors (arbitrary shell execution, environment inheritance, clipboard paste) are intentional and documented in [Known False Positives](#known-false-positives-expected-terminal-behavior).

---

## Security Architecture

### Process Isolation

| Control | Location |
|---|---|
| `nodeIntegration: false` | `src/main/index.ts:73` |
| `contextIsolation: true` | `src/main/index.ts:72` |
| `sandbox: true` | `src/main/index.ts:74` |
| Structured `contextBridge` API (no raw `ipcRenderer` exposure) | `src/preload/index.ts:132` |
| `app.isPackaged` gate prevents dev server URL loading in production | `src/main/index.ts:19-21` |

### Content Security Policy

| Control | Location |
|---|---|
| Production CSP: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; form-action 'self'` | `src/main/index.ts:224-233` |
| CSP applied via `onHeadersReceived` (not meta tag — cannot be bypassed by renderer) | `src/main/index.ts:224` |
| All permissions denied by default | `src/main/index.ts:238` |

### IPC Hardening

| Control | Location |
|---|---|
| All 22 IPC handlers validate sender origin via `validateIpcSender()` | `src/main/security/validate-sender.ts` |
| All IPC parameters validated at runtime via assertion functions | `src/main/ipc/git.ts`, `pty.ts`, `fs.ts` |
| IPC listeners return cleanup functions (no listener leaks) | `src/preload/index.ts` |
| Session-scoped event dispatchers prevent cross-session data leaks | `src/renderer/lib/eventDispatchers.ts` |

### Navigation and Window Guards

| Control | Location |
|---|---|
| `will-navigate` blocks non-`file://` navigation | `src/main/index.ts:87-90` |
| `setWindowOpenHandler` denies all new windows | `src/main/index.ts:91` |
| `openExternal` validates `^https?://` scheme before opening | `src/main/index.ts:203-215` |

### Safe Process Spawning

| Control | Location |
|---|---|
| `execFile` (not `exec`) used everywhere — no shell injection | `src/main/index.ts:12,211`, `src/main/services/pty-manager.ts:6,281` |
| `simple-git` uses `execFile` internally (array args, no shell) | `src/main/services/git.ts` |
| Git ref arguments validated against `isValidRef` regex (`/^[\w\-./]+$/`) | `src/main/services/git.ts:13-14` |

### Path Safety

| Control | Location |
|---|---|
| `resolveRepoPath()` traversal guard keeps paths within git root | `src/main/services/git.ts:21-27` |
| `followSymlinks: false` in file watcher | `src/main/services/watcher.ts:54` |
| Grammar paths verified to stay under extension directory | `src/main/services/grammar-scanner.ts:204` |
| Shell integration scripts use `app.getPath('userData')` with symlink rejection | `src/main/services/pty-manager.ts:39` |

### Output Rendering

| Control | Location |
|---|---|
| xterm.js renders to HTML canvas (no DOM XSS from terminal output) | `src/renderer/hooks/useTerminal.ts:213` |
| React JSX auto-escapes all interpolated values | All renderer components |
| Zero usage of `dangerouslySetInnerHTML`, `innerHTML`, `eval()`, `new Function()` | Codebase-wide |

### Build and Tooling

| Control | Location |
|---|---|
| `asar: true` (ASAR packing enabled) | `electron-builder.json:14` |
| `sourcemap: false` on all build targets | `vite.config.ts:24,40,51` |
| `eslint-plugin-security` with `recommended-legacy` config | `.eslintrc.json:13` |
| `@typescript-eslint/no-explicit-any` set to `"error"` | `.eslintrc.json` |
| `"strict": true` in TypeScript config | `tsconfig.json:13` |
| Dev server explicitly bound to `localhost` | `vite.config.ts:48` |
| No custom protocol handlers (`registerProtocol`/`interceptProtocol`) | N/A |
| No auto-updater dependency — no update attack surface | N/A |
| `.env` files gitignored | `.gitignore` |
| Electron 40 (Chromium 144, Node 24) — ASAR integrity CVE resolved | `package.json` |

---

## Known False Positives (Expected Terminal Behavior)

These were evaluated during the security audit and confirmed to be intentional, expected behavior for a terminal emulator. They are **not vulnerabilities** and should not be "fixed." This section exists to save future assessors from investigating these patterns.

### PTY Spawning Arbitrary Shells and Commands

The renderer can specify a shell path via `PtySpawnOptions.shell`, and the PTY executes arbitrary commands typed by the user. This is the core purpose of a terminal emulator.

### `process.env` Passed to Child Shells

**File:** `src/main/services/pty-manager.ts:164`

The entire `process.env` is spread into the PTY environment. Every terminal emulator (iTerm, Terminal.app, Windows Terminal, VS Code) does this. Stripping environment variables would break `PATH`, `HOME`, `SSH_AUTH_SOCK`, `LANG`, and other necessary variables.

### Clipboard Paste into Terminal

**File:** `src/renderer/hooks/useTerminal.ts:192-194`

Pasted clipboard content is written to the PTY. "Pastejacking" (malicious clipboard content executing commands) is a known risk in all terminal emulators and is not specific to this application.

### User-Specified CWD for Shell Spawn

**File:** `src/renderer/context/SessionContext.tsx:84`

Users can open a terminal in any directory they have access to. The main process validates the directory exists before spawning.

### Reading Files Within Git Repositories

The git service reads files and diffs within repositories the user has opened. This is intended feature functionality, protected by path traversal guards (`resolveRepoPath()`).

### Broad macOS Entitlements

**File:** `resources/entitlements.mac.plist`

`allow-jit`, `allow-unsigned-executable-memory`, and `disable-library-validation` are all required for Electron apps with native addons (node-pty). These are standard for this class of application.

### Non-Cryptographic Session IDs

**File:** `src/renderer/context/SessionContext.tsx:25-26`

Session IDs use `Date.now()` + `Math.random()`. These are local-only identifiers for routing PTY data — never used for authentication or transmitted externally.

---

## Open Items

### macOS Code Signing

**File:** `electron-builder.json:24` — `"identity": null`

macOS code signing is explicitly disabled. The app has `hardenedRuntime: true` and entitlements configured, but with `identity: null` these are not enforced. Users will see Gatekeeper warnings. Acceptable for local development; must be addressed before public distribution.

---

## Audit Changelog

All issues were identified and resolved in a single audit session on 2026-02-06.

| # | Issue | Severity | Resolution |
|---|---|---|---|
| 1 | Outdated Electron (28 → 40) | HIGH | Upgraded to Electron 40; ASAR integrity CVE resolved |
| 2 | Packaged app could load remote URL via `VITE_DEV_SERVER_URL` | HIGH | Gated on `app.isPackaged` |
| 3 | Missing `will-navigate` / `setWindowOpenHandler` | MEDIUM | Added navigation and window-open guards |
| 4 | IPC handlers did not validate sender origin | MEDIUM-HIGH | All 22 handlers validate via `validateIpcSender()` |
| 5 | `sandbox: false` was unnecessary | MEDIUM | Enabled `sandbox: true` |
| 6 | Vulnerable `electron-builder` transitive deps (`tar`) | MEDIUM | Upgraded electron-builder to ^26.0.0 |
| 7 | No macOS code signing | MEDIUM | **Open** — deferred until distribution |
| 8 | Predictable `/tmp` shell integration path | MEDIUM | Moved to `app.getPath('userData')` with symlink rejection |
| 9 | Grammar scanner missing path containment | LOW-MEDIUM | Added extension directory containment check |
| 10 | External font blocked by CSP (dead import) | LOW | Removed dead `@import`; using fallback fonts |
| 11 | No permission request handler | LOW | Deny-all handler added |
| 12 | CSP missing `object-src`, `base-uri`, `form-action` | LOW | Added defense-in-depth directives |
| 13 | No IPC runtime input validation | LOW | All parameters validated via assertion functions |
| 14 | Git ref/baseBranch argument injection | LOW | `isValidRef` regex validation added |
| 15 | No security-focused ESLint plugins | LOW | `eslint-plugin-security` added |
| 16 | `no-explicit-any` was warning, not error | LOW | Promoted to error |
| 17 | No explicit dev server host binding | LOW | Bound to `localhost` |
