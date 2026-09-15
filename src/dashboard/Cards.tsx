import { useState } from 'react'
import {
  DAY_TOTAL,
  GLANCE,
  HOURS,
  HOUR_DOLLARS,
  HOUR_SHARE,
  HOUR_SHARE_PRIOR,
  REVENUE_RANGES,
  REVENUE_RANGES_AVAILABLE,
  REVENUE_TREND,
  REVIEW,
  type GlanceKey,
  type RevenueRange,
} from './data'
import { GlanceScene, type Weather } from './GlanceScene'

/* ------------------------------------------------------------------ *
 * Glance card — whatever is worth a look before the day starts.
 * ------------------------------------------------------------------ */

export function GlanceCard({
  weather,
  onOpen,
}: {
  weather: Weather
  onOpen?: (tab: GlanceKey) => void
}) {
  const [tab, setTab] = useState<GlanceKey>('weather')
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

/** Out of a tray and up — an escape hatch, not a call to action. */
function ExportIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden focusable="false">
      <path d="M8 1.8v7.4M5.2 4.6 8 1.8l2.8 2.8" fill="none" stroke="currentColor"
        strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.8 10.4v3.2h10.4v-3.2" fill="none" stroke="currentColor"
        strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Revenue.
 *
 * Colour is rationed to the one series that matters: today is the accent,
 * every comparison is neutral grey, and the eye should land on the right line
 * without consulting the key first. That is the whole discipline of this card
 * and the reason the starburst ring it replaced had to go — it spent three
 * saturated hues on a category mix nobody needs at a glance, one of them a
 * 40° amber sitting against §2's hard rule. Category mix is a page question.
 *
 * See the design doc, dashboard top row — revenue.
 */
export function RevenueCard({ onOpen }: { onOpen?: () => void }) {
  const [hover, setHover] = useState<number | null>(null)
  const [range, setRange] = useState<RevenueRange>('Today')
  const stop = (e: React.MouseEvent) => e.stopPropagation()

  return (
    <section className="card card--revenue card--open" onClick={onOpen}>
      <header className="card__top">
        <span className="card__label">Revenue</span>
        <div className="rev__filters" onClick={stop}>
          {REVENUE_RANGES.map((r) => {
            /* A range with no series behind it is shown disabled, not left
               pressable and inert. See REVENUE_RANGES_AVAILABLE. */
            const ready = REVENUE_RANGES_AVAILABLE.includes(r)
            return (
              <button
                key={r}
                type="button"
                className={`rev__pill${r === range ? ' is-on' : ''}`}
                aria-pressed={r === range}
                disabled={!ready}
                title={ready ? undefined : `No ${r.toLowerCase()} figures yet`}
                onClick={() => setRange(r)}
              >
                {r}
              </button>
            )
          })}
        </div>
        <button type="button" className="rev__export" aria-label="Export revenue" onClick={stop}>
          <ExportIcon />
        </button>
      </header>

      {/* The number first, and everything under it in support of it. */}
      <div className="rev__figure">
        <span className="rev__total">${DAY_TOTAL.toLocaleString()}</span>
        <span className="rev__trend">
          {REVENUE_TREND.up ? '+' : '−'}{REVENUE_TREND.pct}% vs {REVENUE_TREND.against}
        </span>
      </div>

      {/* One accent series in front of a neutral comparison behind it. */}
      <div className="rev__chart">
        {HOUR_SHARE.map((h, i) => (
          <button
            key={HOURS[i]}
            type="button"
            className="rev__col"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onClick={stop}
            aria-label={`${HOURS[i]} — $${HOUR_DOLLARS[i]}`}
          >
            <span className="rev__prior" style={{ height: `${HOUR_SHARE_PRIOR[i]}%` }} />
            <span className="rev__today" style={{ height: `${h}%` }} />
          </button>
        ))}
      </div>

      <div className="rev__axis">
        <span>6am</span>
        <span>{hover === null ? '12pm' : `${HOURS[hover]} · $${HOUR_DOLLARS[hover]}`}</span>
        <span>5pm</span>
      </div>

      {/* A dot and a word. With one coloured series there is little to explain,
          which is the intended outcome rather than a missing feature. */}
      <ul className="rev__key">
        <li><i className="rev__dot rev__dot--today" />Today</li>
        <li><i className="rev__dot rev__dot--prior" />{REVENUE_TREND.against}</li>
      </ul>
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
