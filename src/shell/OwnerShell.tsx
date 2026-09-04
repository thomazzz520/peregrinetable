import { useCallback, useEffect, useState } from 'react'
import AgentOffice, { type PlatformId } from '../office/AgentOffice'
import BrainChat from '../brain/BrainChat'
import Popup from './Popup'
import RunSheet from './RunSheet'
import { useBookings } from './useBookings'
import { GlanceCard, RevenueCard, ReviewCard } from '../dashboard/Cards'
import TaskPanel from '../dashboard/TaskPanel'
import '../dashboard/dashboard.css'
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
  /* Bumped on close so the office lets go of the platform it flew to;
     without it the same department could only ever be opened once. */
  const [resetFocus, setResetFocus] = useState(0)
  const [brainOpen, setBrainOpen] = useState(false)
  const { bookings, covers, unseen, loading, error, markSeen } = useBookings()

  const openBookings = useCallback(() => {
    setDept('bookings')
    markSeen()
  }, [markSeen])

  const closeDept = useCallback(() => {
    setDept(null)
    setResetFocus((n) => n + 1)
  }, [])

  const openDept = useCallback((id: PlatformId) => setDept(id), [])

  /* Opening the runsheet is what "reading" a booking means, however you got
     there — the tab, the office platform, or the notification itself. */
  useEffect(() => {
    if (dept === 'bookings') markSeen()
  }, [dept, markSeen])

  return (
    <div className="shell">
      <header className="shell__bar">
        {/* The lockup from the standalone demo: the firm's name, a rule, and
            what the product is. It is the first thing anyone sees, so it says
            what this is rather than just who made it. */}
        <span className="shell__lockup">
          <span className="shell__firm">
            Peregrine
            <br />
            Partners
          </span>
          <span className="shell__rule" />
          <span className="shell__product">
            The <em>Venue Brain</em>
            <i>Operating system</i>
          </span>
        </span>
        <nav className="shell__nav">
          <button
            className={`shell__tab${tab === 'office' && !dept ? ' is-on' : ''}`}
            onClick={() => {
              setTab('office')
              closeDept()
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
        <div className="dash">
          <GlanceCard />
          <RevenueCard onOpen={() => setDept('finance')} />
          <ReviewCard />
        </div>
        <div className="floor">
          <div className="floor__scene">
            <AgentOffice
              daysLearned={DAYS_LEARNED}
              onOpenBrain={() => setBrainOpen(true)}
              onOpenDepartment={openDept}
              resetFocus={resetFocus}
            />
          </div>
          <TaskPanel />
        </div>
      </main>

      {dept && (
        <Popup
          eyebrow={dept === 'bookings' ? 'Today · The Peacock' : 'Department'}
          title={DEPARTMENTS[dept].title}
          onClose={closeDept}
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
