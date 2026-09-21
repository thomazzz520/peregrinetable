import { useState } from 'react'
import {
  AVG_TICKET,
  CHANNELS,
  COSTS,
  COST_TOTAL,
  COVERS,
  DAY_TOTAL,
  HOURS,
  HOUR_DOLLARS,
  HOUR_SHARE,
  MIX,
  MENU_IS_WIRED,
  perspectiveFor,
  NEWS_IS_LIVE,
  type NewsItem,
  OUTLOOK,
  uvBand,
  windWord,
  OUTLOOK_HOURLY_IS_MEASURED,
  OUTLOOK_HOUR_RANGE,
  outlookHours,
  PAYMENTS,
  TRAFFIC,
  TRAFFIC_RANGES,
  TRAFFIC_RANGES_AVAILABLE,
  TRAFFIC_TODAY,
  type TrafficRange,
  CONTACTS,
  REVIEWS,
  REVIEW_SOURCES,
  REVIEWS_ARE_LIVE,
  mentionsFor,
  ratingFor,
  ratingTrend,
  type ReviewSourceId,
  LOG,
  type Slice,
} from './data'
import { WeatherIcon, WeatherScene, type Weather } from './GlanceScene'

const money = (n: number) => '$' + n.toLocaleString()

function Stats({ items }: { items: { n: string; l: string; accent?: boolean }[] }) {
  return (
    <div className="pg__stats">
      {items.map((s) => (
        <div key={s.l} className="pg__stat">
          <div className={`pg__statN${s.accent ? ' is-accent' : ''}`}>{s.n}</div>
          <div className="pg__statL">{s.l}</div>
        </div>
      ))}
    </div>
  )
}

function Breakdown({ rows, total }: { rows: Slice[]; total: number }) {
  return (
    <ul className="pg__rows">
      {rows.map((r) => (
        <li key={r.name}>
          <i style={{ background: r.color }} />
          <span className="pg__rowName">{r.name}</span>
          <span className="pg__rowAmt">{money(Math.round((total * r.pct) / 100))}</span>
          <span className="pg__rowPct">{r.pct}%</span>
        </li>
      ))}
    </ul>
  )
}

/* ------------------------------------------------------------------ *
 * Revenue — the shape of the day, and what it cost to make
 * ------------------------------------------------------------------ */

/**
 * A croissant, in the weather set's language.
 *
 * Built the way `Cloud` is built, because that is the discipline this
 * product already settled on for flat illustration: a silhouette assembled
 * from overlapping primitives, one second tone clipped to it for form, and
 * nothing else. The first attempt was a single hand-written arc with three
 * stroked lines across it, which read as a blob with scratches on it.
 *
 * The shape comes from seven ellipses set along a shallow arc, largest in
 * the middle and shrinking to the ends. Their union IS the taper: a
 * croissant is fat at the centre and runs to points, and stepping the radii
 * down gets that for free rather than asking a bezier to be persuasive. The
 * same seven give the segments their bulge, and a groove is drawn at each
 * seam so the rolled layers read at 46px.
 *
 * Two tones, one hue. `#815437` was chosen for warmth without going near
 * what Section 2 bans: 26.5deg clear of the 50-65 yellow band and 17.2deg
 * off Finance's gold, so it is a caramel brown and cannot be mistaken for
 * either. The second tone is the same hue 12 points darker, which is what
 * the undersides and the grooves are cut in.
 */
function Croissant() {
  const fig = '#815437'
  const shade = '#563825'
  const uid = 'cro'

  /* cx, cy, rx, ry along the arc. Symmetric about the middle, and the end
     pair is deliberately much smaller than a linear step would make it:
     that is what turns the ends into points rather than two more beads on
     a string. */
  const lobes: [number, number, number, number][] = [
    [7.6, 24.4, 2.7, 3.0],
    [12.4, 20.4, 4.1, 4.9],
    [18.2, 16.7, 5.0, 6.4],
    [24.0, 15.4, 5.4, 7.0],
    [29.8, 16.7, 5.0, 6.4],
    [35.6, 20.4, 4.1, 4.9],
    [40.4, 24.4, 2.7, 3.0],
  ]

  /* The underside follows the ARC, not the horizon. A straight band across
     the bottom cut a level line through both tips and read as a pastry
     dipped in something. This is the centre line of the lobes pushed down
     and stroked wide, then clipped to the silhouette, so the second tone
     curves with the shape the way `Cloud`'s does. */
  const belly =
    'M6.2 26.8 Q11.2 25.0 18.2 21.9 Q24 20.6 29.8 21.9 Q36.8 25.0 41.8 26.8'

  /* Seams sit on the lit upper surface and stop short of the underside.
     Run full height they read as bars laid across the pastry rather than
     as the seams between its rolls. */
  const seams: [number, number, number, number][] = [
    [10.3, 19.2, 10.0, 21.9],
    [15.5, 15.2, 15.2, 19.6],
    [21.1, 11.2, 21.0, 18.0],
    [26.9, 11.2, 27.0, 18.0],
    [32.5, 15.2, 32.8, 19.6],
    [37.7, 19.2, 38.0, 21.9],
  ]

  const body = (
    <>
      {lobes.map(([cx, cy, rx, ry], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} />
      ))}
    </>
  )

  return (
    <svg className="pg__perspArt" width="62" height="44" viewBox="0 0 48 34" aria-hidden>
      <g className="croissantRise">
        <defs>
          {/* Shapes sit directly under clipPath: a <g> here is ignored by the
              spec and the clip falls back to the union of nothing. Same note
              as `Cloud`. */}
          <clipPath id={`${uid}-c`}>{body}</clipPath>
        </defs>
        <g fill={fig}>{body}</g>
        {/* Both second-tone passes are clipped to the silhouette, so neither
            the underside nor a groove can run off the edge of the pastry. */}
        <g clipPath={`url(#${uid}-c)`}>
          <path d={belly} fill="none" stroke={shade} strokeWidth={5}
            strokeLinecap="round" strokeLinejoin="round" />
          {seams.map(([x1, y1, x2, y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={shade} strokeWidth={1.2} strokeLinecap="round" />
          ))}
        </g>
      </g>
    </svg>
  )
}

/** One hovered thing, reported exactly. `value` is already formatted, because
 *  some rows carry dollars and some carry a share. */
function Tip({ title, rows, note }: {
  title: string
  rows: { name: string; value: string; color?: string }[]
  note?: string
}) {
  return (
    <div className="pg__tip" role="status">
      <div className="pg__tipHead">{title}</div>
      {rows.map((r) => (
        <div key={r.name} className="pg__tipRow">
          {r.color && <i style={{ background: r.color }} />}
          <span className="pg__tipName">{r.name}</span>
          <span className="pg__tipAmt">{r.value}</span>
        </div>
      ))}
      {note && <div className="pg__tipNote">{note}</div>}
    </div>
  )
}

export function RevenuePanel() {
  const [dim, setDim] = useState<'category' | 'channel' | 'payment'>('category')
  const [hourAt, setHourAt] = useState<number | null>(null)
  const [costAt, setCostAt] = useState<number | null>(null)
  const [evenAt, setEvenAt] = useState<'cost' | 'kept' | null>(null)
  const rows = dim === 'category' ? MIX : dim === 'channel' ? CHANNELS : PAYMENTS
  const peak = Math.max(...HOUR_SHARE)
  const evenPct = Math.min(100, (COST_TOTAL / DAY_TOTAL) * 100)
  const profit = DAY_TOTAL - COST_TOTAL
  const persp = perspectiveFor(dim, COST_TOTAL, DAY_TOTAL)

  /**
   * What the tooltip may honestly say about one hour.
   *
   * It shows the hour's TAKINGS, which are real, and the mix as the day's
   * OWN PERCENTAGES, which are also real. It deliberately does not multiply
   * the two into a per-hour dollar figure.
   *
   * An earlier cut did exactly that and captioned it "the day's mix applied
   * to this hour". The caption was true and the numbers still were not:
   * `HOUR_SHARE` is twelve totals, `MIX` is three day-level percentages, and
   * there is no hour-by-category series anywhere in this product. Printing
   * "Coffee $186" against 11a states a fact nothing measured, and this
   * fixture contradicts the flat-mix assumption in its own copy, where an
   * INSIGHTS line has coffee-only orders up in the 8 to 10 rush. A share
   * labelled as the day's share is the largest true thing available.
   */
  const splitFor = () =>
    rows.map((r) => ({ name: r.name, color: r.color, value: `${r.pct}%` }))

  return (
    <div className="pg pg--revenue">
      <Stats
        items={[
          { n: money(DAY_TOTAL), l: 'Total today' },
          { n: '+6.2%', l: 'vs yesterday' },
          { n: '$' + AVG_TICKET.toFixed(2), l: 'Avg ticket' },
          { n: String(COVERS), l: 'Covers' },
        ]}
      />

      <div className="pg__tabs">
        {(['category', 'channel', 'payment'] as const).map((k) => (
          <button key={k} className={`pg__tab${dim === k ? ' is-on' : ''}`} onClick={() => setDim(k)}>
            {k[0]!.toUpperCase() + k.slice(1)}
          </button>
        ))}
      </div>

      <div className="pg__split">
        <div className="pg__chart">
          <div className="pg__bars" onMouseLeave={() => setHourAt(null)}>
            {HOUR_SHARE.map((h, i) => (
              <button
                key={HOURS[i]}
                type="button"
                className={`pg__barCol${hourAt === i ? ' is-on' : ''}`}
                onMouseEnter={() => setHourAt(i)}
                onFocus={() => setHourAt(i)}
                onBlur={() => setHourAt(null)}
                aria-label={`${HOURS[i]}, ${money(HOUR_DOLLARS[i]!)}`}
              >
                <span className="pg__barStack" style={{ height: `${(h / peak) * 100}%` }}>
                  {rows.map((r) => (
                    <i key={r.name} style={{ height: `${r.pct}%`, background: r.color }} />
                  ))}
                </span>
                {hourAt === i && (
                  <Tip
                    title={`${HOURS[i]} · ${money(HOUR_DOLLARS[i]!)}`}
                    rows={splitFor()}
                    note={`Takings for the hour are measured. The ${dim} split is the whole day's and is not broken down hourly.`}
                  />
                )}
              </button>
            ))}
          </div>
          <div className="pg__hrs">
            {HOURS.map((h) => (
              <span key={h}>{h}</span>
            ))}
          </div>
        </div>

        <div className="pg__log">
          {HOURS.map((h, i) => (
            <div key={h} className="pg__logRow">
              <span className="pg__logHr">{h}</span>
              <span className="pg__logTrack">
                <span className="pg__logFill" style={{ width: `${(HOUR_SHARE[i]! / peak) * 100}%` }}>
                  {rows.map((r) => (
                    <i key={r.name} style={{ width: `${r.pct}%`, background: r.color }} />
                  ))}
                </span>
              </span>
              <span className="pg__logAmt">{money(HOUR_DOLLARS[i]!)}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="pg__note pg__tillNote">
        No till is connected. Every figure on this panel is an example day, and
        the eyebrow above no longer names a system, because naming one implied
        the numbers had come from it.
      </p>

      <h3 className="pg__head">By {dim}</h3>
      <Breakdown rows={rows} total={DAY_TOTAL} />

      <h3 className="pg__head">Today's costs</h3>
      <div className="pg__stack" onMouseLeave={() => setCostAt(null)}>
        {COSTS.map((c, i) => (
          <button
            key={c.name}
            type="button"
            className={`pg__stackSeg${costAt === i ? ' is-on' : ''}`}
            style={{ width: `${(c.amt / COST_TOTAL) * 100}%`, background: c.color }}
            onMouseEnter={() => setCostAt(i)}
            onFocus={() => setCostAt(i)}
            onBlur={() => setCostAt(null)}
            aria-label={`${c.name}, ${money(c.amt)}`}
          >
            {costAt === i && (
              <Tip
                title={c.name}
                rows={[
                  { name: 'Today', value: money(c.amt), color: c.color },
                  { name: 'Share of costs', value: `${Math.round((c.amt / COST_TOTAL) * 100)}%` },
                ]}
              />
            )}
          </button>
        ))}
      </div>
      <ul className="pg__rows">
        {COSTS.map((c) => (
          <li key={c.name}>
            <i style={{ background: c.color }} />
            <span className="pg__rowName">{c.name}</span>
            <span className="pg__rowAmt">{money(c.amt)}</span>
            <span className="pg__rowPct">{Math.round((c.amt / COST_TOTAL) * 100)}%</span>
          </li>
        ))}
      </ul>

      {/* One bar the whole width of the day's takings, with the point where
          costs are covered marked on it. Everything past that line is what
          the day was actually worth. */}
      <h3 className="pg__head">Revenue against costs, today's break-even</h3>
      <div className="pg__even" onMouseLeave={() => setEvenAt(null)}>
        <button
          type="button"
          className={`pg__evenSeg pg__evenCost${evenAt === 'cost' ? ' is-on' : ''}`}
          style={{ width: `${evenPct}%` }}
          onMouseEnter={() => setEvenAt('cost')}
          onFocus={() => setEvenAt('cost')}
          onBlur={() => setEvenAt(null)}
          aria-label={`Cost of the day, ${money(COST_TOTAL)}`}
        >
          {evenAt === 'cost' && (
            <Tip
              title="Cost of the day"
              rows={COSTS.map((c) => ({ name: c.name, value: money(c.amt), color: c.color }))}
              note={`${money(COST_TOTAL)} in total, ${Math.round(evenPct)}% of what came in.`}
            />
          )}
        </button>
        <button
          type="button"
          className={`pg__evenSeg pg__evenKept${evenAt === 'kept' ? ' is-on' : ''}`}
          style={{ width: `${100 - evenPct}%` }}
          onMouseEnter={() => setEvenAt('kept')}
          onFocus={() => setEvenAt('kept')}
          onBlur={() => setEvenAt(null)}
          aria-label={`Kept, ${money(profit)}`}
        >
          {evenAt === 'kept' && (
            <Tip
              title="Kept"
              rows={[
                { name: 'Takings', value: money(DAY_TOTAL) },
                { name: 'Less costs', value: `-${money(COST_TOTAL)}` },
                { name: 'Kept', value: money(profit) },
              ]}
              note={`${Math.round(100 - evenPct)}% of what came in.`}
            />
          )}
        </button>
        {/* The tick and its label are separate things now. The label used to
            be one inline run starting 8px off the marker, so the text sat on
            the line at most widths. It reads as a figure with an eyebrow
            over it, at the same weight as the panel's other key numbers. */}
        <div className="pg__evenMark" style={{ left: `${evenPct}%` }} aria-hidden />
        <div className="pg__evenLabel" style={{ left: `${evenPct}%` }}>
          <span className="pg__evenLabelEyebrow">Break-even</span>
          <span className="pg__evenLabelN">{money(COST_TOTAL)}</span>
        </div>
      </div>
      <div className="pg__evenKey">
        <span><i style={{ background: '#D7DACC' }} />Cost of the day · {money(COST_TOTAL)}</span>
        <span><i style={{ background: 'var(--rev-accent)' }} />Kept · {money(profit)}</span>
      </div>

      {/* The same figure, said in something the owner can picture. The copy
          changes with the breakdown above it rather than repeating one
          sentence with the nouns swapped. */}
      <div className="pg__persp">
        <Croissant />
        <div className="pg__perspBody">
          <span className="pg__perspEyebrow">{persp.eyebrow}</span>
          <p className="pg__perspLine">{persp.line}</p>
          <p className={`pg__perspFoot${MENU_IS_WIRED ? '' : ' is-stub'}`}>{persp.foot}</p>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Weather, foot traffic, news
 * ------------------------------------------------------------------ */

/** Points at the row it sits on; turns a quarter-turn when that row opens.
 *  Flat, monochrome, line-based — §11 rule 10's shape for a structural mark. */
function Chevron() {
  return (
    <svg className="pg__weekChev" width="11" height="11" viewBox="0 0 16 16"
      aria-hidden focusable="false">
      <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * One day's hours, as a flat strip.
 *
 * Built to the revenue chart's discipline: no gradient, no fill under the
 * line, no second scale, and colour rationed to one thing. That one thing is
 * the current hour, and only when the open day is today — every other hour on
 * every other day is ink. See `outlookHours` in `data.ts` for what these
 * numbers are and, more to the point, what they are not.
 */
function HourStrip({ day, isToday }: { day: (typeof OUTLOOK)[number]; isToday: boolean }) {
  const hours = outlookHours(day)
  const now = new Date().getHours()
  const [from, to] = OUTLOOK_HOUR_RANGE
  /* The accent is spent only if today's clock is actually inside the
     trading day. At 9pm there is no "now" on this strip to mark. */
  const nowHour = isToday && now >= from && now <= to ? now : null

  return (
    <div className="pg__hourWrap">
      <ol className="pg__hours">
        {hours.map((h) => (
          <li key={h.hour} className={h.hour === nowHour ? 'is-now' : ''}>
            <span className="pg__hourT">{h.temp}°</span>
            <WeatherIcon label={day.label} size={15} />
            <span className="pg__hourH">{h.hour === nowHour ? 'Now' : h.label}</span>
          </li>
        ))}
      </ol>
      <p className="pg__hourNote">
        {OUTLOOK_HOURLY_IS_MEASURED
          ? `Hourly readings, ${hourWindow(from, to)}.`
          : `No hourly forecast is wired up yet. This is ${day.day === 'Today' ? "today's" : `${day.day}'s`} high and low drawn across the trading day, and it says ${day.label.toLowerCase()} every hour because the day does, not because the hour was checked.`}
      </p>
    </div>
  )
}

const hourWindow = (from: number, to: number) =>
  `${from > 12 ? from - 12 : from}${from < 12 ? 'am' : 'pm'}–${to > 12 ? to - 12 : to}${to < 12 ? 'am' : 'pm'}`

export function WeatherPanel({ weather }: { weather: Weather }) {
  /* One day open at a time: opening a second closes the first, and clicking
     the open day closes it. §11 rule 7 sends an expanded item to a side
     panel, and this list is already inside one — a second panel over the
     first would bury the week the reader came here to read, so the day opens
     in place instead. */
  const [open, setOpen] = useState<string | null>(null)
  const today = OUTLOOK[0]!

  return (
    <div className="pg">
      {/* The same live sky the card carries, given room to breathe. The page
          was the one place the weather stopped being weather and went back
          to being a table. */}
      <div className="pg__sky" data-mode={weather.mode} style={{ background: weather.bg }}>
        <WeatherScene weather={weather} />
        <div className="pg__skyNow">
          <span className="pg__skyTemp">{weather.temp}°</span>
          <span className="pg__skyLabel">{weather.copy.label}</span>
        </div>
      </div>
      {/* The band above already says the temperature and the condition, at
          46px and in a pill. Restating both here as "NOW 15°" and
          "CONDITIONS Raining" spent the panel's most prominent row on two
          facts the reader had just read. It carries what the sky cannot
          show instead: how cold it gets after close, and the two figures
          that decide whether the courtyard is usable. */}
      <Stats
        items={[
          { n: `${today.low}°`, l: 'Overnight low' },
          { n: `${today.wind.kph} km/h`, l: `${windWord(today.wind.kph)} ${today.wind.dir}` },
          { n: String(today.uv), l: `UV ${uvBand(today.uv).toLowerCase()}` },
        ]}
      />
      <p className="pg__lede">{weather.copy.desc}</p>
      <h3 className="pg__head">The week ahead</h3>
      <ul className="pg__week">
        {OUTLOOK.map((d, i) => {
          const isOpen = open === d.day
          return (
            <li key={d.day} className={i === 0 ? 'is-now' : ''}>
              <button
                type="button"
                className="pg__weekRow"
                aria-expanded={isOpen}
                aria-controls={`wk-${d.day}`}
                onClick={() => setOpen(isOpen ? null : d.day)}
              >
                <WeatherIcon label={d.label} size={18} />
                <span className="pg__weekDay">{d.day}</span>
                <span className="pg__weekTemp">{d.temp}°</span>
                <span className="pg__weekLow">{d.low}°</span>
                <span className="pg__weekLabel">{d.label}</span>
                <span className="pg__weekNote">{d.note}</span>
                <Chevron />
              </button>
              {isOpen && (
                <div className="pg__weekOpen" id={`wk-${d.day}`}>
                  {/* The day's range, given the display face now that the
                      day is the thing being read. A high and a low are one
                      fact in two halves, not two competing headlines. */}
                  <div className="pg__weekFig">
                    <span className="pg__weekFigN">{d.temp}°</span>
                    <span className="pg__weekFigL">High</span>
                    <span className="pg__weekFigN pg__weekFigN--low">{d.low}°</span>
                    <span className="pg__weekFigL">Low</span>
                  </div>
                  <p className="pg__weekFull">{d.note}</p>
                  <HourStrip day={d} isToday={i === 0} />
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <p className="pg__note">
        Weather is here because it moves covers. Sunday's rain is the one to plan
        a roster around.
      </p>
    </div>
  )
}

export function TrafficPanel() {
  const peak = Math.max(...TRAFFIC.map((t) => t.idx))
  const [range, setRange] = useState<TrafficRange>('Week')

  /* `pg--traffic` carries the chart's two tones. It has to sit on the panel
     root because the legend is the chart's sibling, not its child. */
  return (
    <div className="pg pg--traffic">
      <Stats
        items={[
          { n: '+18%', l: 'vs usual Tuesday' },
          { n: 'Busy', l: 'Right now' },
          { n: 'Sat', l: 'Busiest day' },
        ]}
      />
      <p className="pg__lede">
        Counted from foot traffic on the street near you, indexed against a usual
        week. 100 is ordinary.
      </p>

      <div className="pg__rangeRow">
        <h3 className="pg__head pg__head--inline">{range}</h3>
        {/* A month and a quarter would both have to be invented; they are
            shown disabled rather than pressable and inert, the same way the
            revenue card handles the ranges it has no series for. */}
        <div className="rev__filters">
          {TRAFFIC_RANGES.map((r) => {
            const ready = TRAFFIC_RANGES_AVAILABLE.includes(r)
            return (
              <button
                key={r}
                type="button"
                className={`rev__pill${r === range ? ' is-on' : ''}`}
                aria-pressed={r === range}
                disabled={!ready}
                title={ready ? undefined : `No ${r.toLowerCase()} of foot traffic yet`}
                onClick={() => setRange(r)}
              >
                {r}
              </button>
            )
          })}
        </div>
      </div>

      {/* One coloured bar, six neutral. The reader should find today without
          consulting a key — the same rationing the revenue card runs on, and
          the check this chart was not built against the first time. */}
      <div className="pg__traffic">
        {TRAFFIC.map((t) => {
          const isToday = t.day === TRAFFIC_TODAY
          return (
            <div key={t.day} className={`pg__trafficCol${isToday ? ' is-today' : ''}`}>
              <span className="pg__trafficN">{t.idx}</span>
              {/* The bar's height is a percentage, so it needs a parent whose
                  height is exactly the space bars may use. Sizing it against
                  the whole column instead made every tall bar overflow and
                  get flex-shrunk back to the same clamped height — 118, 104,
                  131 and 147 all drew at 90px, so Saturday looked like a
                  Wednesday and the chart stopped encoding its own data. */}
              <span className="pg__trafficTrack">
                <span className="pg__trafficBar" style={{ height: `${(t.idx / peak) * 100}%` }} />
              </span>
              <span className="pg__trafficDay">{t.day}</span>
            </div>
          )
        })}
      </div>
      <ul className="rev__key pg__trafficKey">
        <li><i className="rev__dot pg__trafficDot--today" />Today</li>
        <li><i className="rev__dot pg__trafficDot--rest" />Rest of the week</li>
      </ul>
      <p className="pg__note">
        Saturday runs about half again on an ordinary day. Monday is the one worth
        trimming.
      </p>
    </div>
  )
}

/** Out of the page and away: the mark for a link that leaves the product. */
function OutIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" aria-hidden focusable="false">
      <path d="M6.6 2.6H2.8v10.6h10.6V9.4" fill="none" stroke="currentColor"
        strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.6 2.6h3.8v3.8M13.4 2.6 7.6 8.4" fill="none" stroke="currentColor"
        strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function NewsPanel({ news }: { news: NewsItem[] }) {
  return (
    <div className="pg">
      <p className="pg__lede">
        Things happening outside the venue that land on you anyway. Rates, awards,
        and the street itself.
      </p>
      {/* Each story is its own surface rather than a row divided off from the
          one above it: its own container, its own ground, and its own kind's
          hue. Scrolling reads as moving between stories instead of down one
          list. `data-news` is what carries the ground, the same attribute the
          card uses, so a kind is styled once for both surfaces. */}
      <ul className="pg__news">
        {news.map((n) => (
          <li key={n.head} data-news={n.kind}>
            <header className="pg__newsTop">
              {/* The category first and largest: what KIND of news this is,
                  which is what a reader scanning the list is sorting on. The
                  body that issued it follows it, and the clock time follows
                  that, per §11 rule 12's order. */}
              <span className="pg__newsCat">{n.category}</span>
              <span className="pg__newsWho">{n.who}</span>
              <span className="pg__newsWhen">{n.when}</span>
            </header>
            <h4 className="pg__newsHead">{n.head}</h4>
            <p className="pg__newsBody">{n.body}</p>
            <p className="pg__newsHits">
              <span className="pg__spark">✦</span>
              {n.hits}
            </p>
            {/* Visible, and deliberately quieter than the headline: a source
                is something you check, not something you read first. */}
            <a className="pg__newsSrc" href={n.source.url} target="_blank" rel="noreferrer noopener">
              <OutIcon />
              {n.source.name}
            </a>
          </li>
        ))}
      </ul>
      <p className="pg__note">
        {NEWS_IS_LIVE
          ? 'Updated as stories land.'
          : 'Nothing here is ingested yet. These are curated examples, and each source link goes to the body that issues the story rather than to an article, because there is no article behind it.'}
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * History and contacts
 * ------------------------------------------------------------------ */

export function HistoryPanel() {
  return (
    <div className="pg">
      <p className="pg__lede">
        Everything the team did, and everything it is still holding. Nothing on
        this list went out in your name without your say-so.
      </p>
      <ul className="pg__log2">
        {LOG.map((l, i) => (
          <li key={i}>
            <span className="pg__log2Time">{l.time}</span>
            <span className="pg__log2Body">
              <span className="pg__log2Dept">{l.dept}</span>
              <span className="pg__log2Note">{l.note}</span>
              <span className={`pg__log2State${l.done ? '' : ' is-waiting'}`}>
                {l.done ? (
                  '✓ Done'
                ) : (
                  <>
                    <i className="pg__log2Dot" />
                    Waiting on you
                  </>
                )}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Five flat glyphs. No colour, no new token. */
function Stars({ value }: { value: number }) {
  const full = Math.floor(value)
  const half = value - full >= 0.25 && value - full < 0.75
  const up = value - full >= 0.75
  return (
    <span className="review__starRow" aria-label={`${value} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => {
        const on = i < full + (up ? 1 : 0)
        const isHalf = half && i === full
        return (
          <span key={i} className={`review__star${on ? ' is-on' : isHalf ? ' is-half' : ''}`} aria-hidden>★</span>
        )
      })}
    </span>
  )
}

/** One counted theme list. Prints the count beside every phrase, because
 *  the count is the whole claim. */
function Themes({ title, from, band, items, tone }: {
  title: string
  from: number
  band: string
  items: { phrase: string; n: number }[]
  /** Which of the two neutral grounds this box sits on. */
  tone: 'high' | 'low'
}) {
  return (
    <div className="pg__mentions" data-tone={tone}>
      <span className="pg__mentionsHead">{title}</span>
      {items.length === 0 ? (
        <p className="pg__mentionsNone">
          Nothing comes up more than once across the {from} {band} {from === 1 ? 'review' : 'reviews'}, so there is no recurring theme to report.
        </p>
      ) : (
        <ul className="pg__mentionsList">
          {items.map((t) => (
            <li key={t.phrase}>
              <span className="pg__mentionsPhrase">{t.phrase}</span>
              {/* The share, drawn as well as written. A column of bare
                  right-aligned fractions makes you read every one to find
                  the biggest; a bar is read at a glance and the number
                  stays for the exact value. Neutral, never the accent:
                  colour on this panel marks one figure only. */}
              <span className="pg__mentionsBar" aria-hidden>
                <span style={{ width: `${(t.n / Math.max(from, 1)) * 100}%` }} />
              </span>
              <span className="pg__mentionsN">
                {t.n} of {from}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function ReviewsPanel() {
  const [src, setSrc] = useState<ReviewSourceId>('google')
  const rows = REVIEWS[src]
  const r = ratingFor(src)
  const t = ratingTrend(src)
  const m = mentionsFor(src)
  const label = REVIEW_SOURCES.find((s) => s.id === src)!.label

  return (
    <div className="pg pg--reviews">
      {/* The rating is the one figure carrying colour, on the card and here
          both. `accent` marks it; the other two stats stay ink. */}
      <Stats
        items={[
          { n: r.stars.toFixed(1), l: `${label} rating`, accent: true },
          { n: String(r.count), l: 'Reviews held' },
          { n: `${t.up ? '+' : ''}${t.delta.toFixed(1)}`, l: 'Newer half vs older' },
        ]}
      />
      <p className="pg__lede">
        What people are saying, by the place they said it. The themes under each
        source are counted from the reviews on this page, not summarised by
        anything.
      </p>

      {/* Exactly the revenue panel's dimension tabs: same class, same states,
          no colour per platform. A source is told apart by its name. */}
      <div className="pg__rangeRow">
        <h3 className="pg__head pg__head--inline">{label}</h3>
        <div className="rev__filters">
          {REVIEW_SOURCES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`rev__pill${s.id === src ? ' is-on' : ''}`}
              aria-pressed={s.id === src}
              onClick={() => setSrc(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pg__mentionsRow">
        <Themes tone="high" title="In the 4 and 5 star reviews" from={m.highFrom} band="four and five star" items={m.high} />
        <Themes tone="low" title="In the 1 to 3 star reviews" from={m.lowFrom} band="one to three star" items={m.low} />
      </div>
      <p className="pg__note pg__mentionsFoot">
        Counted across the {m.total} {label} reviews shown, by stripping filler
        words and counting the phrases that recur. A phrase has to appear in at
        least two reviews to be listed. These are MENTIONS, not sentiment: a
        phrase under the lower band is one those reviewers brought up, which is
        not always a complaint.
      </p>

      <h3 className="pg__head">Every {label} review held</h3>
      <ul className="pg__reviews">
        {rows.map((rv, i) => (
          <li key={i}>
            <header className="pg__reviewTop">
              <Stars value={rv.stars} />
              <span className="pg__reviewWho">{rv.who}</span>
              <span className="pg__reviewWhen">{rv.ago === 0 ? 'today' : `${rv.ago}d ago`}</span>
            </header>
            <p className="pg__reviewText">{rv.text}</p>
          </li>
        ))}
      </ul>

      <p className="pg__note">
        {REVIEWS_ARE_LIVE
          ? 'Synced from each platform.'
          : 'No review platform is connected, including Google. Every review on this page was written for the demo. Connecting one means an approved app, an API client, rate limits, a store to sync into and a job to sync on, five times over for five platforms.'}
      </p>
    </div>
  )
}

export function ContactPanel() {
  return (
    <div className="pg">
      <p className="pg__lede">
        What the brain is plugged into. It reads from these; it writes nothing
        back without you approving it first.
      </p>
      <ul className="pg__rows">
        {CONTACTS.map((c) => (
          <li key={c.name}>
            {/* Sage only where something is actually connected. A row with
                no `live` at all is not an integration, so it takes the
                neutral too rather than claiming a state it has no place in. */}
            <i
              className={`pg__contactDot${c.live ? ' is-live' : ''}`}
              title={c.live === undefined ? undefined : c.live ? 'Connected' : 'Not connected'}
            />
            <span className="pg__rowName">
              <b>{c.name}</b> · {c.kind}
            </span>
            <span className="pg__rowPctWide">{c.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
