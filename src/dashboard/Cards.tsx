import { useMemo, useState } from 'react'
import {
  DAY_TOTAL,
  GLANCE,
  HOURS,
  HOUR_DOLLARS,
  HOUR_SHARE,
  INSIGHTS,
  MIX,
  REVIEW,
  type GlanceKey,
  type Slice,
} from './data'
import { GlanceScene, pickWeather } from './GlanceScene'

/* ------------------------------------------------------------------ *
 * Glance card — whatever is worth a look before the day starts.
 * ------------------------------------------------------------------ */

export function GlanceCard({ onOpen }: { onOpen?: (tab: GlanceKey) => void }) {
  const [tab, setTab] = useState<GlanceKey>('weather')
  /* Picked once per load, from what this hour could plausibly do — so the
     card is a different day each time you open the demo rather than the
     same fixed 18° forever. */
  const weather = useMemo(() => pickWeather(), [])
  const g = GLANCE[tab]
  const big = tab === 'weather' ? `${weather.temp}°C` : g.big
  const tag = tab === 'weather' ? weather.copy.label : g.tag
  const sub = tab === 'weather' ? weather.copy.desc : g.sub
  return (
    <section
      className="card card--glance card--open"
      data-tab={tab}
      data-mode={tab === 'weather' ? weather.mode : undefined}
      style={tab === 'weather' ? { background: weather.bg } : undefined}
      onClick={() => onOpen?.(tab)}
    >
      <GlanceScene tab={tab} weather={weather} />
      <nav className="glance__tabs">
        {(Object.keys(GLANCE) as GlanceKey[]).map((k) => (
          <button
            key={k}
            className={`glance__tab${k === tab ? ' is-on' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              setTab(k)
            }}
          >
            {GLANCE[k].label}
          </button>
        ))}
      </nav>
      <div className="glance__head">
        <span className="glance__big">{big}</span>
        <span className="glance__tag">{tag}</span>
      </div>
      {'spark' in g && (
        <div className="glance__spark">
          {g.spark.map((h, i) => (
            <i key={i} style={{ height: `${h}%` }} />
          ))}
        </div>
      )}
      <p className="glance__sub">{sub}</p>
    </section>
  )
}

/* ------------------------------------------------------------------ *
 * Revenue
 * ------------------------------------------------------------------ */

/**
 * The ring around the day's total. Not a pie: the spokes are weighted by
 * category but jittered in length, so it reads as a burst rather than a
 * chart you are meant to measure. The figure in the middle is the point.
 */
function Starburst({ mix }: { mix: Slice[] }) {
  const lines = useMemo(() => {
    const cx = 65, cy = 65, rInner = 32, rOuter = 58, spokes = 36
    let seed = 42
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296
      return seed / 4294967296
    }
    const total = mix.reduce((a, m) => a + m.pct, 0)
    const assigned: Slice[] = []
    mix.forEach((m) => {
      const n = Math.round((m.pct / total) * spokes)
      for (let i = 0; i < n; i++) assigned.push(m)
    })
    while (assigned.length < spokes) assigned.push(mix[mix.length - 1]!)
    assigned.length = spokes

    return assigned.map((m, i) => {
      const a = (i / spokes) * Math.PI * 2 - Math.PI / 2
      const r = rInner + (rOuter - rInner) * (0.6 + rnd() * 0.6)
      return {
        x1: cx + Math.cos(a) * rInner,
        y1: cy + Math.sin(a) * rInner,
        x2: cx + Math.cos(a) * r,
        y2: cy + Math.sin(a) * r,
        color: m.color,
      }
    })
  }, [mix])

  return (
    <svg className="rev__burst" width="92" height="92" viewBox="0 0 130 130" aria-hidden>
      {lines.map((l, i) => (
        <line
          key={i}
          x1={l.x1.toFixed(1)}
          y1={l.y1.toFixed(1)}
          x2={l.x2.toFixed(1)}
          y2={l.y2.toFixed(1)}
          stroke={l.color}
          strokeWidth={2.2}
          strokeLinecap="round"
          opacity={0.92}
        />
      ))}
    </svg>
  )
}

/** Bold runs marked with **…** in the insight copy. */
function Insight({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return (
    <>
      {parts.map((p, i) => (i % 2 ? <b key={i}>{p}</b> : <span key={i}>{p}</span>))}
    </>
  )
}

export function RevenueCard({ onOpen }: { onOpen?: () => void }) {
  const [hover, setHover] = useState<number | null>(null)
  const insight = useMemo(() => INSIGHTS[Math.floor(Math.random() * INSIGHTS.length)]!, [])

  return (
    <section className="card card--revenue card--open" onClick={onOpen}>
      <header className="card__top">
        <span className="card__label">Revenue</span>
        <span className="card__range">Today ▾</span>
        <span className="card__badge">+6.2%</span>
      </header>

      <div className="rev__row">
        <div className="rev__ring">
          <Starburst mix={MIX} />
          <div className="rev__centre">
            <span className="rev__amt">${DAY_TOTAL.toLocaleString()}</span>
            <span className="rev__sub">today</span>
          </div>
        </div>

        <ul className="rev__legend">
          {MIX.map((m) => (
            <li key={m.name}>
              <i style={{ background: m.color }} />
              <span className="rev__name">{m.name}</span>
              <span className="rev__pct">{m.pct}%</span>
            </li>
          ))}
        </ul>

        <div className="rev__bars">
          <div className="bars">
            {HOUR_SHARE.map((h, i) => (
              <button
                key={HOURS[i]}
                className="bars__col"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                aria-label={`${HOURS[i]} — $${HOUR_DOLLARS[i]}`}
              >
                <span className="bars__stack" style={{ height: `${h}%` }}>
                  {MIX.map((m) => (
                    <i key={m.name} style={{ height: `${m.pct}%`, background: m.color }} />
                  ))}
                </span>
              </button>
            ))}
          </div>
          <div className="bars__axis">
            <span>6am</span>
            <span>{hover === null ? '12pm' : `${HOURS[hover]} · $${HOUR_DOLLARS[hover]}`}</span>
            <span>5pm</span>
          </div>
        </div>
      </div>

      <p className="rev__insight">
        <span className="rev__spark">✦</span>
        <Insight text={insight} />
      </p>
    </section>
  )
}

/* ------------------------------------------------------------------ *
 * Review
 * ------------------------------------------------------------------ */

export function ReviewCard() {
  return (
    <section className="card card--review">
      <header className="card__top">
        <span className="card__label">
          New review · {REVIEW.when}
        </span>
        <span className="review__source">{REVIEW.source}</span>
      </header>
      <div className="review__stars" aria-label={`${REVIEW.stars} stars`}>
        {'★'.repeat(REVIEW.stars)}
      </div>
      <blockquote className="review__quote">“{REVIEW.quote}”</blockquote>
      <footer className="review__who">{REVIEW.who}</footer>
    </section>
  )
}
