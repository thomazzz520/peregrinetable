import { useMemo } from 'react'
import type { GlanceKey } from './data'

/**
 * The moving background behind the glance card.
 *
 * Ported from the standalone demo. Everything here is CSS shapes and
 * keyframes — no images, no icon font, nothing to load — so the card can
 * carry a sky without carrying a payload.
 */

/**
 * Sky by time of day, and what weather that hour is allowed to have.
 *
 * Each sky is ONE FLAT COLOUR (design doc, dashboard top row — weather). The
 * four time-of-day gradients this replaced were the only place in the product
 * where a background animated through a colour ramp, and they are what made
 * the card read as a weather app dropped into a dashboard. The flat grounds
 * are the product's own paper/bone/clay/ink ramp, so the sky introduces no
 * hue of its own and the scene's four tones carry all of the meaning.
 */
const PERIODS = {
  morning: { from: 5, bg: '#EFE9DD', mode: 'light' as const,
    conditions: ['clear', 'cloudy', 'raining', 'foggy'] as const },
  midday: { from: 11, bg: '#F4F0E8', mode: 'light' as const,
    conditions: ['sunny', 'raining', 'hailing', 'cloudy'] as const },
  twilight: { from: 17, bg: '#D9CFBC', mode: 'light' as const,
    conditions: ['clear', 'cloudy', 'raining', 'hailing'] as const },
  night: { from: 20, bg: '#162540', mode: 'dark' as const,
    conditions: ['stars', 'cloudy', 'raining', 'hailing'] as const },
}

export type Condition = 'sunny' | 'clear' | 'stars' | 'cloudy' | 'raining' | 'hailing' | 'foggy'

export const CONDITION_COPY: Record<Condition, { label: string; temp: [number, number]; desc: string }> = {
  clear: { label: 'Clear', temp: [14, 18], desc: 'Clear start — full sun on the courtyard by mid-morning.' },
  sunny: { label: 'Sunny', temp: [19, 24], desc: 'Clearing by lunch. Peak rush 12–2pm as the sun brings the courtyard back.' },
  stars: { label: 'Clear', temp: [9, 13], desc: 'Clear and still. A good night to keep the courtyard heaters on.' },
  cloudy: { label: 'Cloudy', temp: [13, 18], desc: 'Overcast through the day, no rain expected.' },
  raining: { label: 'Raining', temp: [11, 15], desc: 'Steady rain rolling through — worth bringing the courtyard tables in.' },
  hailing: { label: 'Hailing', temp: [8, 12], desc: 'Sharp hail passing through — keep an eye on the awning.' },
  foggy: { label: 'Foggy', temp: [9, 13], desc: 'Fog should lift by mid-morning, slow start on the walk-ins.' },
}

function periodFor(hour: number) {
  if (hour >= 5 && hour < 11) return PERIODS.morning
  if (hour >= 11 && hour < 17) return PERIODS.midday
  if (hour >= 17 && hour < 20) return PERIODS.twilight
  return PERIODS.night
}

/** The weather is picked once per load, from what this hour can plausibly do. */
export function pickWeather() {
  const period = periodFor(new Date().getHours())
  const condition = period.conditions[
    Math.floor(Math.random() * period.conditions.length)
  ] as Condition
  const copy = CONDITION_COPY[condition]
  const temp = copy.temp[0] + Math.floor(Math.random() * (copy.temp[1] - copy.temp[0] + 1))
  return { bg: period.bg, mode: period.mode, condition, copy, temp }
}

export type Weather = ReturnType<typeof pickWeather>

/* ------------------------------------------------------------------ *
 * The isometric weather scene
 *
 * The projection is the office's, not an approximation of it. The office
 * camera sits at [54, 45, 34] — an elevation of 35.19°, within 0.07° of true
 * isometric — and a ground axis at that elevation projects to 29.96° on
 * screen. So the grid below is a 30° isometric one and the two genuinely
 * share an angle. Change the office camera and this has to move with it.
 * ------------------------------------------------------------------ */

/** Deterministic fraction from an index — pure, so the drop positions are
 *  stable across renders without a mutable seed or a call to Math.random. */
const frac = (n: number) => {
  const x = Math.sin(n) * 43758.5453
  return x - Math.floor(x)
}

/** Half-height of an isometric diamond, given its half-width. tan(30°). */
const ISO = Math.tan(Math.PI / 6)

/** The scene's four tones, and no others (design doc). Every hue here is
 *  measured clear of all five department grounds and of the sage signal:
 *  sun 28° (13° off the Finance/caution amber, 22° clear of the yellow band
 *  — it is warm orange, never amber-gold), rain 198° (15° off Marketing),
 *  hail 192°, cloud achromatic at 8% saturation. */
const SKY = {
  sunTop: '#E08A3E',
  sunSide: '#C06F2E',
  rain: '#2E8FB8',
  hail: '#C6E9F2',
  cloudTop: '#C9C6BF',
  cloudSide: '#B3AFA6',
}

/** The ground plate stays neutral, the way every surface standing on a
 *  department plate does (§2). Two ramps so the night sky keeps its
 *  contrast without introducing a colour. */
const PLATE = {
  light: { top: '#E4DBCB', left: '#CFC4AE', right: '#C2B69E' },
  dark: { top: '#2A3A57', left: '#1E2C45', right: '#172338' },
}

/** One isometric block: a lit top face and two shaded sides, hard-edged,
 *  flat-filled. This is the floor plates' own vocabulary at card size. */
function Plate({ mode }: { mode: 'light' | 'dark' }) {
  const cx = 120, cy = 98, a = 64, b = a * ISO, t = 11
  const T = `${cx},${cy - b}`, R = `${cx + a},${cy}`, B = `${cx},${cy + b}`, L = `${cx - a},${cy}`
  const Bd = `${cx},${cy + b + t}`, Rd = `${cx + a},${cy + t}`, Ld = `${cx - a},${cy + t}`
  const c = PLATE[mode]
  return (
    <g>
      <polygon points={`${T} ${R} ${B} ${L}`} fill={c.top} />
      <polygon points={`${L} ${B} ${Bd} ${Ld}`} fill={c.left} />
      <polygon points={`${B} ${R} ${Rd} ${Bd}`} fill={c.right} />
    </g>
  )
}

/** Two flat tones split along the isometric axis, so the disc reads as lit
 *  from the same direction as everything standing on the plate. The darker
 *  half is a half-plane rotated to -30° and clipped to the circle, which is
 *  exact — no arc flags to get wrong. */
function Sun({ id }: { id: string }) {
  const cx = 184, cy = 40, r = 17
  const rays = Array.from({ length: 8 }, (_, i) => {
    const ang = (i * 45 + 22.5) * (Math.PI / 180)
    return {
      x1: cx + Math.cos(ang) * (r + 4), y1: cy + Math.sin(ang) * (r + 4),
      x2: cx + Math.cos(ang) * (r + 10), y2: cy + Math.sin(ang) * (r + 10),
    }
  })
  return (
    <g>
      <defs>
        <clipPath id={id}><circle cx={cx} cy={cy} r={r} /></clipPath>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill={SKY.sunTop} />
      <g clipPath={`url(#${id})`}>
        <rect x={cx - r} y={cy} width={r * 2} height={r}
          transform={`rotate(-30 ${cx} ${cy})`} fill={SKY.sunSide} />
      </g>
      {rays.map((l, i) => (
        <line key={i} x1={l.x1.toFixed(1)} y1={l.y1.toFixed(1)}
          x2={l.x2.toFixed(1)} y2={l.y2.toFixed(1)}
          stroke={SKY.sunTop} strokeWidth={2.4} strokeLinecap="butt" />
      ))}
    </g>
  )
}

/** A flat slab with two puffs, split top/side like everything else. */
function Cloud({ x, y, w, id }: { x: number; y: number; w: number; id: string }) {
  const h = w * 0.3
  return (
    <g>
      <defs>
        {/* Shapes sit directly under clipPath: a <g> here is ignored by the
            spec, and the clip would silently fall back to the union of
            nothing at all. */}
        <clipPath id={id}>
          <rect x={x} y={y} width={w} height={h} rx={h / 2} />
          <circle cx={x + w * 0.32} cy={y + h * 0.18} r={h * 0.62} />
          <circle cx={x + w * 0.63} cy={y + h * 0.26} r={h * 0.5} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <rect x={x - 4} y={y - h} width={w + 8} height={h * 2.4} fill={SKY.cloudTop} />
        <rect x={x - 4} y={y + h * 0.58} width={w + 8} height={h * 1.4} fill={SKY.cloudSide} />
      </g>
    </g>
  )
}

export function WeatherScene({ weather }: { weather: Weather }) {
  const bits = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        x: 44 + frac(i * 12.9898 + 1) * 152,
        delay: `${(frac(i * 78.233 + 2) * 1.3).toFixed(2)}s`,
        dur: `${(0.85 + frac(i * 37.719 + 3) * 0.45).toFixed(2)}s`,
      })),
    [],
  )

  const c = weather.condition
  const wet = c === 'raining' || c === 'hailing'
  const uid = `w-${c}`

  return (
    <div className="weatherScene">
      <svg viewBox="0 0 240 150" preserveAspectRatio="xMidYMid meet" aria-hidden>
        {(c === 'sunny' || c === 'clear') && <Sun id={`${uid}-sun`} />}

        {c === 'stars' && (
          <g>
            <circle cx={186} cy={38} r={15} fill={SKY.cloudTop} />
            <circle cx={178} cy={33} r={14} fill="#162540" />
            {[[58, 26], [92, 44], [126, 22], [152, 52], [38, 58], [210, 66], [74, 70]].map(
              ([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2 : 1.4} fill={SKY.cloudTop} />,
            )}
          </g>
        )}

        {c === 'foggy' &&
          [40, 58, 76].map((y, i) => (
            <rect key={y} x={22 + i * 10} y={y} width={190 - i * 16} height={7} rx={3.5}
              fill={i === 1 ? SKY.cloudSide : SKY.cloudTop} />
          ))}

        {(c === 'cloudy' || wet) && (
          <>
            <Cloud x={132} y={22} w={74} id={`${uid}-c1`} />
            <Cloud x={44} y={40} w={54} id={`${uid}-c2`} />
          </>
        )}

        <Plate mode={weather.mode} />

        {/* Rain and hail fall. Nothing else in the scene moves — ambient
            drift communicates nothing and §4 rules it out. */}
        {c === 'raining' &&
          bits.map((d, i) => (
            <rect key={i} className="wx-fall" x={d.x.toFixed(1)} y={-10} width={2} height={11} rx={1}
              fill={SKY.rain} style={{ animationDelay: d.delay, animationDuration: d.dur }} />
          ))}

        {c === 'hailing' &&
          bits.slice(0, 10).map((d, i) => (
            /* The rotate lives on the rect and the fall on the group: a CSS
               transform would otherwise overwrite the transform attribute. */
            <g key={i} className="wx-fall" style={{ animationDelay: d.delay, animationDuration: d.dur }}>
              <rect x={d.x.toFixed(1)} y={-10} width={5} height={5} fill={SKY.hail}
                transform={`rotate(45 ${(d.x + 2.5).toFixed(1)} -7.5)`} />
            </g>
          ))}
      </svg>
    </div>
  )
}

/** A warm pavement, with the office scene's dot-headed silhouettes on it. */
export function TrafficScene() {
  const walkers = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        delay: `${-i * 1.2}s`,
        dur: `${6 + Math.random() * 3}s`,
      })),
    [],
  )
  return (
    <div className="trafficScene">
      <span className="trafficGround" />
      {walkers.map((w, i) => (
        <span
          key={i}
          className="trafficWalk"
          style={{ animationDelay: `${w.delay}, ${w.delay}`, animationDuration: `0.6s, ${w.dur}` }}
        />
      ))}
    </div>
  )
}

/** An editorial navy, with a market line ticking behind the headline. */
export function NewsScene() {
  return (
    <div className="newsScene">
      <svg viewBox="0 0 240 70" preserveAspectRatio="none" className="newsLine">
        <polyline
          points="0,62 28,52 54,58 80,34 106,42 132,18 158,26 184,8 212,14 240,6"
          fill="none"
          stroke="#80D0B8"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.5"
        />
      </svg>
      <span className="newsPulse" />
    </div>
  )
}

export function GlanceScene({ tab, weather }: { tab: GlanceKey; weather: Weather }) {
  if (tab === 'weather') return <WeatherScene weather={weather} />
  if (tab === 'traffic') return <TrafficScene />
  return <NewsScene />
}
