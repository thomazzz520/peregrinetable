import { useState } from 'react'
import {
  DAY_TOTAL,
  GLANCE,
  OUTLOOK,
  TRAFFIC,
  TRAFFIC_TODAY,
  type NewsItem,
  HOURS,
  HOUR_DOLLARS,
  HOUR_SHARE,
  HOUR_SHARE_PRIOR,
  REVENUE_RANGES,
  REVENUE_RANGES_AVAILABLE,
  REVENUE_TREND,
  overallRating,
  ratingTrend,
  latestReview,
  type GlanceKey,
  type RevenueRange,
} from './data'
import { GlanceScene, type Weather } from './GlanceScene'

/* ------------------------------------------------------------------ *
 * Glance card — whatever is worth a look before the day starts.
 * ------------------------------------------------------------------ */

export function GlanceCard({
  weather,
  news,
  onOpen,
}: {
  weather: Weather
  /** The story the news tab leads with. Rotates on each open; see
   *  `rotateNews` in `data.ts`. */
  news: NewsItem
  onOpen?: (tab: GlanceKey) => void
}) {
  const [tab, setTab] = useState<GlanceKey>('weather')
  /* Weather and news both carry live-ish values now, so `GLANCE` holds only
     the tab's label for them and the figures come from the source of truth.
     Foot traffic is the one tab still reading its copy straight out of it. */
  const { big, tag, sub } =
    tab === 'weather'
      ? { big: `${weather.temp}°C`, tag: weather.copy.label, sub: weather.copy.desc }
      : tab === 'news'
        ? { big: news.figure, tag: `${news.who} · ${news.category}`, sub: news.cardSub }
        : { big: GLANCE.traffic.big, tag: GLANCE.traffic.tag, sub: GLANCE.traffic.sub }
  const today = OUTLOOK[0]!
  const trafficPeak = Math.max(...TRAFFIC.map((t) => t.idx))
  return (
    <section
      className="card card--glance card--open"
      data-tab={tab}
      data-news={tab === 'news' ? news.kind : undefined}
      data-mode={tab === 'weather' ? weather.mode : undefined}
      style={tab === 'weather' ? { background: weather.bg } : undefined}
      onClick={() => onOpen?.(tab)}
    >
      <GlanceScene tab={tab} weather={weather} newsKind={news.kind} />
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
      {/* Weather trades the bare hero number for three facts in the same
          space. The temperature keeps the display serif and stays the
          headline — §11 rule 4 is about which number is the headline, not
          about how many other facts may sit beside it in sans — and the low
          and the condition are captions on it rather than rivals to it.
          Every other tab keeps the single big figure it was built around. */}
      {tab === 'weather' ? (
        <div className="glance__head glance__head--metrics">
          <div className="glance__metric">
            <span className="glance__big">{weather.temp}°</span>
            <span className="glance__metricL">Now</span>
          </div>
          <div className="glance__metric">
            <span className="glance__metricN">{today.low}°</span>
            <span className="glance__metricL">Overnight low</span>
          </div>
          <div className="glance__metric">
            <span className="glance__metricN">{weather.copy.label}</span>
            <span className="glance__metricL">Conditions</span>
          </div>
        </div>
      ) : (
        <div className="glance__head">
          {tab === 'news' ? (
            <span className="glance__figure">
              <span className="glance__big">{big}</span>
              <span className="glance__unit">{news.figureUnit}</span>
            </span>
          ) : (
            <span className="glance__big">{big}</span>
          )}
          <span className="glance__tag">{tag}</span>
        </div>
      )}
      {/* Foot traffic's week, in the revenue chart's structural format:
          flat bars off a clean baseline, the day labels as the axis, and
          colour marking one thing only — today. The palette is this card's
          own warm ink rather than revenue's teal; it is the discipline that
          carries across, not the hue. */}
      {tab === 'traffic' && (
        <div className="glance__traffic">
          <div className="glance__trafficBars">
            {TRAFFIC.map((t) => (
              <span
                key={t.day}
                className={`glance__trafficCol${t.day === TRAFFIC_TODAY ? ' is-today' : ''}`}
                style={{ height: `${(t.idx / trafficPeak) * 100}%` }}
              />
            ))}
          </div>
          <div className="glance__trafficAxis">
            {TRAFFIC.map((t) => (
              <span key={t.day} className={t.day === TRAFFIC_TODAY ? 'is-today' : ''}>
                {t.day[0]}
              </span>
            ))}
          </div>
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
            aria-label={`${HOURS[i]} · $${HOUR_DOLLARS[i]}`}
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

/** A stars row that can show a half. Flat glyphs, no new colour. */
function Stars({ value, label }: { value: number; label?: string }) {
  const full = Math.floor(value)
  const half = value - full >= 0.25 && value - full < 0.75
  const up = value - full >= 0.75
  return (
    <span className="review__starRow" aria-label={label ?? `${value} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => {
        const on = i < full + (up ? 1 : 0)
        const isHalf = half && i === full
        return (
          <span key={i} className={`review__star${on ? ' is-on' : isHalf ? ' is-half' : ''}`} aria-hidden>
            ★
          </span>
        )
      })}
    </span>
  )
}

export function ReviewCard({ onOpen }: { onOpen?: () => void }) {
  const o = overallRating()
  const t = ratingTrend()
  const l = latestReview()

  return (
    <section className="card card--review card--open" onClick={onOpen}>
      <header className="card__top">
        <span className="card__label">Reviews</span>
        {/* The trend pill, in the shape revenue's already uses: a direction
            and a figure, no colour of its own. */}
        <span className={`review__trend${t.up ? '' : ' is-down'}`}>
          <span className="review__arrow" aria-hidden>{t.up ? '↑' : '↓'}</span>
          {t.up ? '+' : ''}{t.delta.toFixed(1)} vs earlier
        </span>
      </header>

      {/* The venue's rating, not one reviewer's. Display serif, per §11
          rule 4: this is the card's hero number. */}
      <div className="review__figure">
        <span className="review__big">{o.stars.toFixed(1)}</span>
        <Stars value={o.stars} label={`${o.stars} out of 5 across ${o.count} reviews`} />
        <span className="review__count">{o.count} reviews</span>
      </div>

      <blockquote className="review__quote">“{l.review.text}”</blockquote>
      <footer className="review__who">
        {l.review.who} · {l.source}
      </footer>
    </section>
  )
}
