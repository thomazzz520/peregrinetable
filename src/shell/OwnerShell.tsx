import { useCallback, useEffect, useState } from 'react'
import AgentOffice, { type PlatformId } from '../office/AgentOffice'
import BrainChat from '../brain/BrainChat'
import Popup from './Popup'
import RunSheet from './RunSheet'
import { useBookings } from './useBookings'
import './shell.css'
import '../brain/brain.css'

/**
 * The owner side of the product: one frame, one navigation, one entry
 * point. The office is the home screen; departments open as click-in
 * popups over it; the brain opens a conversation.
 *
 * The guest-facing floor plan is not in here on purpose. It is a different
 * product for a different person that happens to share this database —
 * see `/` for that.
 */

const DAYS_LEARNED = 120

/** Copy for each department popup. Bookings is the one with a live panel. */
const DEPARTMENTS: Record<PlatformId, { title: string; blurb: string }> = {
  bookings: { title: 'Bookings', blurb: "Today's runsheet, straight off the diary guests book into." },
  finance: { title: 'Finance', blurb: 'Takings, reconciliation, GST set aside, BAS.' },
  suppliers: { title: 'Suppliers & stock', blurb: 'Ordering, price watch, and what runs out next.' },
  roster: { title: 'Roster', blurb: 'Next week built from availability, skills and your labour budget.' },
  marketing: { title: 'Marketing', blurb: 'Posts, reviews and reputation.' },
  admin: { title: 'Admin', blurb: 'Compliance, insurance, licences and the paperwork nobody enjoys.' },
}

type Tab = 'office' | 'bookings'

export default function OwnerShell() {
  const [tab, setTab] = useState<Tab>('office')
  const [dept, setDept] = useState<PlatformId | null>(null)
  const [brainOpen, setBrainOpen] = useState(false)
  const { bookings, covers, unseen, loading, error, markSeen } = useBookings()

  const openBookings = useCallback(() => {
    setDept('bookings')
    markSeen()
  }, [markSeen])

  /* Opening the runsheet is what "reading" a booking means, however you got
     there — the tab, the office platform, or the notification itself. */
  useEffect(() => {
    if (dept === 'bookings') markSeen()
  }, [dept, markSeen])

  return (
    <div className="shell">
      <header className="shell__bar">
        <span className="shell__mark">
          Peregrine Partners
          <i>Venue brain · operating system</i>
        </span>
        <nav className="shell__nav">
          <button
            className={`shell__tab${tab === 'office' && !dept ? ' is-on' : ''}`}
            onClick={() => {
              setTab('office')
              setDept(null)
            }}
          >
            Office
          </button>
          <button
            className={`shell__tab${dept === 'bookings' ? ' is-on' : ''}`}
            onClick={openBookings}
          >
            Bookings
            {unseen > 0 && <span className="shell__badge">{unseen}</span>}
          </button>
        </nav>
        <div className="shell__venue">
          <b>The Peacock</b>
          <span>Jenny's Café · South Yarra</span>
        </div>
      </header>

      <main className="shell__body">
        <AgentOffice
          daysLearned={DAYS_LEARNED}
          onOpenBrain={() => setBrainOpen(true)}
          onOpenDepartment={(id) => setDept(id)}
        />
      </main>

      {dept && (
        <Popup
          eyebrow={dept === 'bookings' ? 'Today · The Peacock' : 'Department'}
          title={DEPARTMENTS[dept].title}
          onClose={() => setDept(null)}
        >
          {dept === 'bookings' ? (
            <RunSheet bookings={bookings} covers={covers} loading={loading} error={error} />
          ) : (
            <p className="sheet__note">{DEPARTMENTS[dept].blurb}</p>
          )}
        </Popup>
      )}

      {brainOpen && <BrainChat onClose={() => setBrainOpen(false)} />}
    </div>
  )
}
