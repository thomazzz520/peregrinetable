import { Navigate, Route, Routes } from 'react-router-dom'
import OwnerShell from './shell/OwnerShell'
import VenueBrain from './brain/VenueBrain'
import Guest from './routes/Guest'
import OwnerFloor from './routes/OwnerFloor'
import OwnerLogin from './routes/OwnerLogin'
import OwnerRunSheet from './routes/OwnerRunSheet'
import { RequireOwner } from './components/OwnerChrome'

/**
 * One app, two front doors.
 *
 * `/` is the owner's dashboard — the product. `/book` is the guest's floor
 * plan, public and per-venue. They share this deployment so the owner's
 * session cookie reaches the API, and they share a database, but they are
 * two different products for two different people and never appear on the
 * same screen.
 */
export default function App() {
  return (
    <Routes>
      {/* ---- owner ---- */}
      <Route path="/" element={<OwnerShell />} />
      <Route path="/owner/login" element={<OwnerLogin />} />
      <Route
        path="/owner"
        element={
          <RequireOwner>
            <OwnerRunSheet />
          </RequireOwner>
        }
      />
      <Route
        path="/owner/floor"
        element={
          <RequireOwner>
            <OwnerFloor />
          </RequireOwner>
        }
      />
      {/* The brain on its own, useful for working on it in isolation. */}
      <Route path="/brain" element={<VenueBrain showScrubber />} />

      {/* ---- guest ---- */}
      <Route path="/book" element={<Guest />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
