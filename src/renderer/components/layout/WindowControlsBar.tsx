import { memo } from 'react'
import logoPng from '../../../../resources/icon.png'

interface WindowControlsBarProps {
  automationEnabled?: boolean
}

export const WindowControlsBar = memo(function WindowControlsBar({ automationEnabled = false }: WindowControlsBarProps) {
  return (
    <div className="h-9 flex items-center bg-obsidian-surface border-b border-obsidian-border-subtle flex-shrink-0 relative z-10">
      {/* Logo + drag area */}
      <div className="flex-1 h-full app-drag flex items-center gap-2.5 pl-3">
        <img src={logoPng} alt="" className="w-7 h-7 rounded-md flex-shrink-0" draggable={false} />
        <div className="flex flex-col justify-center">
          <span className="text-xs text-obsidian-text-muted font-medium leading-tight">Claude Did What?!</span>
          <span className="text-[9px] text-obsidian-text-muted/50 leading-tight">AI slop by Andrew Orr</span>
        </div>
        {automationEnabled && (
          <div
            className="h-5 px-2 rounded-full border border-obsidian-accent/40 bg-obsidian-accent-subtle text-obsidian-accent text-[9px] font-semibold tracking-wide uppercase flex items-center gap-1 select-none"
            title="Automation API enabled"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-obsidian-accent animate-glow-pulse" />
            API
          </div>
        )}
      </div>

      {/* Window controls */}
      <div className="flex items-center flex-shrink-0">
        {/* Minimize */}
        <button
          className="w-11 h-9 flex items-center justify-center text-obsidian-text-muted hover:bg-obsidian-hover transition-colors"
          onClick={() => window.electronAPI.window.minimize()}
          title="Minimize"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>

        {/* Maximize */}
        <button
          className="w-11 h-9 flex items-center justify-center text-obsidian-text-muted hover:bg-obsidian-hover transition-colors"
          onClick={() => window.electronAPI.window.maximize()}
          title="Maximize"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="4" y="4" width="16" height="16" rx="1" strokeWidth={2} />
          </svg>
        </button>

        {/* Close */}
        <button
          className="w-11 h-9 flex items-center justify-center text-obsidian-text-muted hover:bg-red-600 hover:text-white transition-colors"
          onClick={() => window.electronAPI.window.close()}
          title="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
})
