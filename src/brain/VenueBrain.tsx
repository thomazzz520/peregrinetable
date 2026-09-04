import { useState } from 'react'
import BrainScene from './BrainScene'
import BrainChat from './BrainChat'
import { nodesForDays } from './nodeCloud'
import './brain.css'

/**
 * The venue brain: a constellation that thickens as the system learns the
 * venue, and the department chat you reach by clicking into the middle of it.
 *
 * `daysLearned` is a prop so the density can be driven from outside — the
 * office scene will pass it down in step 4. `showScrubber` is demo furniture
 * for showing people the growth; off by default.
 */
export default function VenueBrain({
  daysLearned = 14,
  ownerName = 'Jenny',
  showScrubber = false,
}: {
  daysLearned?: number
  ownerName?: string
  showScrubber?: boolean
}) {
  const [days, setDays] = useState(daysLearned)
  const [zoomed, setZoomed] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  const close = () => {
    setChatOpen(false)
    setZoomed(false)
  }

  return (
    <div className="brain-root">
      <BrainScene
        days={showScrubber ? days : daysLearned}
        zoomed={zoomed}
        onOpen={() => setZoomed(true)}
        onArrive={() => setChatOpen(true)}
      />

      {!chatOpen && (
        <div className="brain-hint">
          <span className="brain-hint__count">
            {nodesForDays(showScrubber ? days : daysLearned)} connections
          </span>
          <span className="brain-hint__cta">click the centre to talk to your team</span>
        </div>
      )}

      {showScrubber && !chatOpen && (
        <label className="brain-scrub">
          <span className="brain-scrub__n">day {days}</span>
          <input
            type="range"
            min={1}
            max={180}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          />
          <span className="brain-scrub__note">denser every day →</span>
        </label>
      )}

      {chatOpen && <BrainChat ownerName={ownerName} onClose={close} />}
    </div>
  )
}
