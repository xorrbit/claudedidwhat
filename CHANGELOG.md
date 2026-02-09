# Changelog

## 1.2.2 (2026-02-08)

### Features

- **Settings modal** — New settings panel (Ctrl/Cmd+,) with UI scale control (75%–150%), automation API toggle with confirmation dialog, default diff view mode selector, and an about section with version info
- **Close tab confirmation** — Prompts before closing a tab when Claude or Codex is actively running, preventing accidental process termination
- **Collapsible file list** — Added a height toggle button to the file list panel so it can be collapsed out of the way

### Fixes

- **Terminal scrollbar** — Moved to the left side and fixed targeting for xterm.js v6's custom scrollbar element, which was not responding to the previous CSS approach

### Performance

- **Reduced re-renders and GPU waste** — Shallow equality check in `setFiles` skips redundant render cascades; hoisted `languageMap` to module scope; removed `willChange: 'opacity'` from pooled editor divs; stabilized callbacks with `useCallback` throughout App and FileListItem
- **Faster file-change detection** — Removed chokidar `awaitWriteFinish` and reduced the useGitDiff debounce from 500 ms to 300 ms, cutting perceived latency from ~1.1 s to ~600 ms
- **Lifted diff view mode state** — Moved from per-tab localStorage reads + window event listeners to top-level props, eliminating redundant I/O on every tab switch
- **Optimized prompt scoring** — Pre-normalize text once in `scorePromptLikelihood` instead of three times per call

### Tests

- 126 new tests for AutomationApiService (lifecycle, config validation, filesystem security, HTTP routing/auth/rate-limiting, payload validation, bootstrap execution) and SettingsModal (rendering, UI scale controls, close behavior, automation toggle confirmation flow)
- Updated tests for context menu selected text and diff view mode cycling
