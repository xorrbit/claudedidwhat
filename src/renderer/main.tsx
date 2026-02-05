import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'

// Note: StrictMode removed because xterm.js doesn't handle double-mounting well
ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
