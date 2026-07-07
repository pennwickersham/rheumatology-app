import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { setExplainProvider } from './api/interactions.js'
import { askGemini } from './api/gemini.js'

// Set up the plain language explanation provider for interaction check
setExplainProvider((prompt) => askGemini(prompt));

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
