import { useCallback, useEffect, useState } from 'react'
import type { PlatformId } from '../office/AgentOffice'
import { RealFloorScene } from '../office/RealFloor3D'
import BrainChat from '../brain/BrainChat'
import Popup from './Popup'
import Splash from './Splash'
import RunSheet from './RunSheet'
import { useBookings } from './useBookings'
import { GlanceCard, RevenueCard, ReviewCard } from '../dashboard/Cards'
import {
  ContactPanel,
  HistoryPanel,
  NewsPanel,
  RevenuePanel,
  TrafficPanel,
  WeatherPanel,
} from '../dashboard/Panels'
import VenueFloor from '../dashboard/VenueFloor'
import TaskPanel from '../dashboard/TaskPanel'
import '../dashboard/dashboard.css'
import './shell.css'
import '../brain/brain.css'

/**
 * The owner side of the product: one frame, one navigation, one entry
 * point. The office is the home screen; everything else is something you
 * click into and close again.
 *
 * The guest-facing floor plan is not in here on purpose. It is a different
 * product for a different person that happens to share this database —
 * see `/book` for that.
 */

/** Everything that can open over the office. */
type View =
  | { kind: 'dept'; id: PlatformId }
  | { kind: 'revenue' }
  | { kind: 'weather' }
  | { kind: 'traffic' }
  | { kind: 'news' }
  | { kind: 'room' }
  | { kind: 'history' }
  | { kind: 'contact' }

const DEPT_COPY: Record<PlatformId, { title: string; blurb: string }> = {
  bookings: { title: 'Bookings', blurb: '' },
  finance: { title: 'Finance', blurb: 'Takings, reconciliation, GST set aside, BAS.' },
  suppliers: { title: 'Suppliers & stock', blurb: 'Ordering, price watch, and what runs out next.' },
  roster: { title: 'Roster', blurb: 'Next week built from availability, skills and your labour budget.' },
  marketing: { title: 'Marketing', blurb: 'Posts, reviews and reputation.' },
  admin: { title: 'Admin', blurb: 'Compliance, insurance, licences and the paperwork nobody enjoys.' },
}

export default function OwnerShell() {
  const [view, setView] = useState<View | null>(null)
  const [brainOpen, setBrainOpen] = useState(false)
  /* Bumped on close so the office lets go of the platform it flew to;
     without it the same department could only ever be opened once. */
  const [resetFocus, setResetFocus] = useState(0)
  const { bookings, covers, unseen, loading, error, markSeen } = useBookings()

  const close = useCallback(() => {
    setView(null)
    setResetFocus((n) => n + 1)
  }, [])

  const openDept = useCallback((id: PlatformId) => setView({ kind: 'dept', id }), [])
  const openRunSheet = useCallback(() => setView({ kind: 'dept', id: 'bookings' }), [])

  /* Opening the runsheet is what "reading" a booking means, however you got
     there — the office platform or the notification itself. */
  const onRunSheet = view?.kind === 'dept' && view.id === 'bookings'
  useEffect(() => {
    if (onRunSheet) markSeen()
  }, [onRunSheet, markSeen])

  const head = (): { eyebrow: string; title: string } => {
    if (!view) return { eyebrow: '', title: '' }
    switch (view.kind) {
      case 'dept':
        return {
          eyebrow: view.id === 'bookings' ? 'Today · The Peacock' : 'Department',
          title: DEPT_COPY[view.id].title,
        }
      case 'revenue':
        return { eyebrow: 'Today · The Peacock · Square till', title: 'Revenue' }
      case 'weather':
        return { eyebrow: 'South Yarra · seven days', title: 'Weather' }
      case 'traffic':
        return { eyebrow: 'Chapel Street · this week', title: 'Foot traffic' }
      case 'news':
        return { eyebrow: 'What lands on you anyway', title: 'Related news' }
      case 'room':
        return { eyebrow: 'Today · The Peacock', title: 'The room' }
      case 'history':
        return { eyebrow: 'Today and yesterday', title: 'History log' }
      case 'contact':
        return { eyebrow: 'What the brain is plugged into', title: 'Contact' }
    }
  }

  const body = () => {
    if (!view) return null
    switch (view.kind) {
      case 'dept':
        return view.id === 'bookings' ? (
          <RunSheet bookings={bookings} covers={covers} loading={loading} error={error} />
        ) : (
          <p className="pg__lede">{DEPT_COPY[view.id].blurb}</p>
        )
      case 'revenue':
        return <RevenuePanel />
      case 'weather':
        return <WeatherPanel />
      case 'traffic':
        return <TrafficPanel />
      case 'news':
        return <NewsPanel />
      case 'room':
        return <VenueFloor bookings={bookings} />
      case 'history':
        return <HistoryPanel />
      case 'contact':
        return <ContactPanel />
    }
  }

  const { eyebrow, title } = head()

  return (
    <div className="shell">
      <header className="shell__bar">
        {/* The firm's name, a rule, and what the product is. It is the first
            thing anyone sees, so it says what this is rather than just who
            made it. */}
        <span className="shell__lockup">
          <img className="shell__logo" src="/brand/wordmark.png" alt="Peregrine Partners" />
          <span className="shell__rule" />
          <span className="shell__product">
            The <em>Venue Brain</em>
            <i>Operating system</i>
          </span>
        </span>
        {/* The tabs from the old bar. Bookings is deliberately not among
            them — the runsheet belongs to its platform in the office. */}
        <nav className="shell__nav">
          {(
            [
              ['Revenue', 'revenue'],
              ['History log', 'history'],
              ['Contact', 'contact'],
            ] as const
          ).map(([label, kind]) => (
            <button
              key={kind}
              className={`shell__tab${view?.kind === kind ? ' is-on' : ''}`}
              onClick={() => setView({ kind })}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="shell__venue">
          <b>The Peacock</b>
          <span>Jenny's Café · South Yarra</span>
        </div>
      </header>

      <main className="shell__body">
        <div className="dash">
          <GlanceCard onOpen={(tab) => setView({ kind: tab })} />
          <RevenueCard onOpen={() => setView({ kind: 'revenue' })} />
          <ReviewCard />
        </div>
        <div className="floor">
          <div className="floor__scene">
            {/* The coloured islands from the original demo, rather than the
                monochrome hexagon. Same three targets: an island opens its
                department, the house opens the room, the brain opens the
                chat. */}
            <RealFloorScene
              onOpenBrain={() => setBrainOpen(true)}
              onOpenDepartment={(id) => openDept(id as PlatformId)}
              onEnterVenue={() => setView({ kind: 'room' })}
              waitingByDept={{ bookings: unseen }}
              resetFocus={resetFocus}
            />
          </div>
          <TaskPanel />
        </div>
      </main>

      {view && (
        <Popup eyebrow={eyebrow} title={title} onClose={close}>
          {body()}
        </Popup>
      )}

      {/* Bottom-right, and only when something has actually arrived. The
          runsheet has no tab of its own: it belongs to the Bookings platform
          in the office, and to this. */}
      {unseen > 0 && !onRunSheet && (
        <button className="ping" onClick={openRunSheet}>
          <span className="ping__n">{unseen}</span>
          {unseen === 1 ? 'New booking' : 'New bookings'}
          <span className="ping__go">open the runsheet</span>
        </button>
      )}

      {brainOpen && <BrainChat onClose={() => setBrainOpen(false)} />}

      <Splash />
    </div>
  )
}
