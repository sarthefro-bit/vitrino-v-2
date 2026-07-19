import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ensureAnonymousSession } from './lib/supabaseClient'

// Start the per-device anonymous auth session as early as possible so
// it's already established by the time the user saves anything (see db.ts).
ensureAnonymousSession();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
