import ReactDOM from 'react-dom/client'
import App from './App'
import { textMateService } from './lib/textmate'
import './styles/globals.css'

// Load TextMate grammars in the background (non-blocking)
textMateService.initialize().catch(err => {
  console.warn('TextMate initialization failed:', err)
})

// Note: StrictMode removed because xterm.js doesn't handle double-mounting well
ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
