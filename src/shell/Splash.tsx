import { useEffect, useState } from 'react'

/**
 * The cover, shown once while the office and its scenes compile.
 *
 * The wordmark is served from this origin, not peregrinepartners.space:
 * the CSP in vercel.json admits no third-party origin, deliberately, so a
 * visitor's IP is never handed to another server.
 */
export default function Splash() {
  const [gone, setGone] = useState(false)
  const [hiding, setHiding] = useState(false)

  useEffect(() => {
    const fade = window.setTimeout(() => setHiding(true), 1400)
    const drop = window.setTimeout(() => setGone(true), 2100)
    return () => {
      window.clearTimeout(fade)
      window.clearTimeout(drop)
    }
  }, [])

  if (gone) return null

  return (
    <div className={`splash${hiding ? ' is-hiding' : ''}`} aria-hidden>
      <div className="splash__lockup">
        <img className="splash__logo" src="/brand/wordmark.png" alt="Peregrine Partners" />
        <span className="splash__rule" />
        <span className="splash__product">
          The <em>Venue Brain</em>
          <i>Operating system</i>
        </span>
      </div>
    </div>
  )
}
