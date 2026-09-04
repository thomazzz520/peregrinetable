import { useMemo } from 'react'
import type { GlanceKey } from './data'

/**
 * The moving background behind the glance card.
 *
 * Ported from the standalone demo. Everything here is CSS shapes and
 * keyframes — no images, no icon font, nothing to load — so the card can
 * carry a sky without carrying a payload.
 */

/** Sky by time of day, and what weather that hour is allowed to have. */
const PERIODS = {
  morning: {
    from: 5,
    bg: 'linear-gradient(165deg, #FFDCA6 0%, #FFEFD3 40%, #DCEEFB 100%)',
    mode: 'light' as const,
    conditions: ['clear', 'cloudy', 'raining', 'foggy'] as const,
  },
  midday: {
    from: 11,
    bg: 'linear-gradient(165deg, #6BB6E8 0%, #8FCBEE 38%, #D9EFFB 78%, #F3FAFD 100%)',
    mode: 'light' as const,
    conditions: ['sunny', 'raining', 'hailing', 'cloudy'] as const,
  },
  twilight: {
    from: 17,
    bg: 'linear-gradient(165deg, #FF9A6C 0%, #F7768F 42%, #6A56A8 100%)',
    mode: 'dark' as const,
    conditions: ['clear', 'cloudy', 'raining', 'hailing'] as const,
  },
  night: {
    from: 20,
    bg: 'linear-gradient(165deg, #1B2740 0%, #131B30 45%, #0A1122 100%)',
    mode: 'dark' as const,
    conditions: ['stars', 'cloudy', 'raining', 'hailing'] as const,
  },
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

function Sun() {
  return (
    <div className="sunGroup">
      <div className="sunRays">
        {Array.from({ length: 12 }, (_, i) => (
          <i key={i} style={{ transform: `rotate(${i * 30}deg)` }} />
        ))}
      </div>
      <div className="sunCore" />
    </div>
  )
}

/** A pill with two puffs — a flat rounded rect on its own reads as a UI bug. */
function Cloud({ style, heavy }: { style: React.CSSProperties; heavy?: boolean }) {
  return <div className={`weatherCloud${heavy ? ' heavy' : ''}`} style={style} />
}

export function WeatherScene({ weather }: { weather: Weather }) {
  const bits = useMemo(() => {
    const rnd = (n: number) => Math.random() * n
    return {
      drops: Array.from({ length: 16 }, () => ({
        left: `${rnd(100)}%`,
        delay: `${rnd(1.4)}s`,
        dur: `${0.7 + rnd(0.5)}s`,
      })),
      stars: Array.from({ length: 22 }, () => ({
        left: `${rnd(100)}%`,
        top: `${rnd(70)}%`,
        size: `${1 + rnd(1.6)}px`,
        delay: `${rnd(3)}s`,
        dur: `${2 + rnd(2.5)}s`,
      })),
    }
  }, [])

  const c = weather.condition
  const wet = c === 'raining' || c === 'hailing'

  return (
    <div className="weatherScene">
      {(c === 'sunny' || c === 'clear') && <Sun />}
      {c === 'stars' && (
        <>
          <div className="moonCrescent" />
          {bits.stars.map((s, i) => (
            <span
              key={i}
              className="star"
              style={{
                left: s.left,
                top: s.top,
                width: s.size,
                height: s.size,
                animationDelay: s.delay,
                animationDuration: s.dur,
              }}
            />
          ))}
        </>
      )}
      {(c === 'cloudy' || wet) && (
        <>
          <Cloud style={{ right: 18, top: 14, width: 74, height: 20 }} heavy={wet} />
          <Cloud style={{ right: 84, top: 34, width: 52, height: 15 }} heavy={wet} />
        </>
      )}
      {c === 'raining' &&
        bits.drops.map((d, i) => (
          <span
            key={i}
            className="rainDrop"
            style={{ left: d.left, animationDelay: d.delay, animationDuration: d.dur }}
          />
        ))}
      {c === 'hailing' &&
        bits.drops.slice(0, 11).map((d, i) => (
          <span
            key={i}
            className="hailDot"
            style={{ left: d.left, animationDelay: d.delay, animationDuration: d.dur }}
          />
        ))}
      {c === 'foggy' &&
        [30, 58, 84].map((top, i) => (
          <span
            key={top}
            className="fogBand"
            style={{ top, animationDuration: `${5 + i * 1.6}s`, animationDelay: `${i * 0.6}s` }}
          />
        ))}
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
