import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { setExplainProvider } from './api/interactions.js'
import { askGemini } from './api/gemini.js'

// Set up the plain language explanation provider for interaction check
setExplainProvider((prompt) => askGemini(prompt));

const root = createRoot(document.getElementById('root'));
root.render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);

// Remove initial loader
const initialLoader = document.getElementById('initial-loader');
if (initialLoader) {
  initialLoader.remove();
}

