import ReactDOM from 'react-dom/client'
import App from './App'
import { textMateService } from './lib/textmate'
import './styles/globals.css'

const APP_SETTLE_DELAY_MS = 1200
const WARMUP_IDLE_TIMEOUT_MS = 5000
const HIDDEN_TAB_RETRY_DELAY_MS = 2000

function warmupEditorsAfterLaunchSettles(): void {
  const warmup = () => {
    // Don't spend startup CPU warming editor subsystems in a background tab.
    if (document.hidden) {
      window.setTimeout(warmup, HIDDEN_TAB_RETRY_DELAY_MS)
      return
    }

    const doWarmup = () => {
      void Promise.all([
        textMateService.initialize(),
        // Preload Monaco diff wrapper so first diff open is snappier.
        import('./components/diff/MonacoDiffEditor'),
      ]).catch((err) => {
        console.warn('Editor warmup failed:', err)
      })
    }

    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => doWarmup(), { timeout: WARMUP_IDLE_TIMEOUT_MS })
      return
    }

    window.setTimeout(doWarmup, 0)
  }

  const scheduleWarmup = () => {
    window.setTimeout(warmup, APP_SETTLE_DELAY_MS)
  }

  if (document.readyState === 'complete') {
    scheduleWarmup()
    return
  }

  window.addEventListener('load', scheduleWarmup, { once: true })
}

warmupEditorsAfterLaunchSettles()

// Note: StrictMode removed because xterm.js doesn't handle double-mounting well
ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
