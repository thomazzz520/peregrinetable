import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { restoreSession } from './data'
import { installAuditStub } from './scene/auditStub'
import './index.css'

// Before any floor plan exists, __auditScene() should say so rather than be
// missing. FloorPlan overwrites this the moment its canvas is created.
installAuditStub()

// With the API live the session lives in a cookie script cannot read, so the
// guard has to ask the server before it can decide anything.
await restoreSession()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
