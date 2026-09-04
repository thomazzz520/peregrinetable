import { useEffect, useState } from 'react'

/**
 * The cover, shown once while the office and its scenes compile.
 *
 * The standalone demo used the wordmark PNG from peregrinepartners.space.
 * The CSP in vercel.json admits no third-party origin — deliberately, so a
 * guest's IP is never handed to another server — so the lockup is set in
 * type here. Drop the wordmark into /public/brand and it can be an image
 * again.
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
        <span className="splash__firm">
          Peregrine
          <br />
          Partners
        </span>
        <span className="splash__rule" />
        <span className="splash__product">
          The <em>Venue Brain</em>
          <i>Operating system</i>
        </span>
      </div>
    </div>
  )
}
