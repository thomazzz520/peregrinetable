import { useId, useMemo } from 'react'
import type { GlanceKey, NewsKind } from './data'

/**
 * The moving background behind the glance card.
 *
 * Everything here is SVG shapes and CSS keyframes — no images, no icon
 * font, nothing to load — so the card can carry a sky without carrying a
 * payload.
 */

/**
 * Which conditions each part of the day is allowed to have.
 *
 * The period decides plausibility and NOTHING ELSE. It used to carry the
 * card's colour too, through a per-period flat sky; the condition owns the
 * whole card now (design doc, dashboard top row — weather, rule 1), so a
 * rainy night is the rain ground rather than a night ground with rain on it.
 * Only a clear night is night.
 */
const PERIODS = {
  morning: { from: 5, conditions: ['clear', 'cloudy', 'raining', 'foggy'] as const },
  midday: { from: 11, conditions: ['sunny', 'raining', 'hailing', 'cloudy'] as const },
  twilight: { from: 17, conditions: ['clear', 'cloudy', 'raining', 'hailing'] as const },
  night: { from: 20, conditions: ['stars', 'cloudy', 'raining', 'hailing'] as const },
}

export type Condition = 'sunny' | 'clear' | 'stars' | 'cloudy' | 'raining' | 'hailing' | 'foggy'

export const CONDITION_COPY: Record<Condition, { label: string; temp: [number, number]; desc: string }> = {
  clear: { label: 'Clear', temp: [14, 18], desc: 'Clear start. Full sun on the courtyard by mid-morning.' },
  sunny: { label: 'Sunny', temp: [19, 24], desc: 'Clearing by lunch. Peak rush 12–2pm as the sun brings the courtyard back.' },
  stars: { label: 'Clear', temp: [9, 13], desc: 'Clear and still. A good night to keep the courtyard heaters on.' },
  cloudy: { label: 'Cloudy', temp: [13, 18], desc: 'Overcast through the day, no rain expected.' },
  raining: { label: 'Raining', temp: [11, 15], desc: 'Steady rain rolling through, worth bringing the courtyard tables in.' },
  hailing: { label: 'Hailing', temp: [8, 12], desc: 'Sharp hail passing through, keep an eye on the awning.' },
  foggy: { label: 'Foggy', temp: [9, 13], desc: 'Fog should lift by mid-morning, slow start on the walk-ins.' },
}

/* ------------------------------------------------------------------ *
 * The micro-palette: five grounds, and no others.
 *
 * A scoped exception to §2, logged in the design doc. Every hue is measured
 * clear of all five department grounds, of the sage signal and of navy:
 *
 *   sun    28°  l37  — 12° off Finance's gold, 22° clear of the yellow band.
 *   rain  199°  l36  — 14° off Marketing, and 37 points darker than it.
 *   ice   191°  l86  — 25° off Admin's teal, 22° off Marketing.
 *   cloud  40°  s8   — 1° off Finance; the SATURATION is what separates them.
 *   night 204°  l20  — 15° off Peregrine navy, which §2 reserves for
 *                      structure and action.
 *
 * Two constraints here are load-bearing and easy to undo by eye:
 *
 * - The sun does NOT get gold. §2 bans yellow "in any form" and names gold
 *   in the same sentence, Finance's ground IS gold, and §11's exemption
 *   covers attention rationing, not hue. Depth carries the confidence a
 *   full-card takeover needs; the hue stays where it was locked.
 * - Rain stays DARK. Marketing's ground is itself a pale slate-blue, so
 *   lightening or desaturating rain walks into it. Hue clearance alone was
 *   enough when this was an icon; it is not enough edge to edge.
 *
 * `figure` is the illustration's main tone, `shade` its second value —
 * a flat illustration needs two tones to have any form at all.
 * ------------------------------------------------------------------ */
export const GROUND = {
  sun: { bg: '#A25A1A', figure: '#F7BE80', shade: '#D8872F', mode: 'dark' as const },
  rain: { bg: '#2E6D8A', figure: '#AFD6E5', shade: '#6BA6C2', mode: 'dark' as const },
  ice: { bg: '#C9E7EE', figure: '#2A6A7D', shade: '#7FB9C9', mode: 'light' as const },
  cloud: { bg: '#BBB7AF', figure: '#5B5348', shade: '#8B8579', mode: 'light' as const },
  night: { bg: '#1F3747', figure: '#CBD9E2', shade: '#162834', mode: 'dark' as const },
}

export type GroundKey = keyof typeof GROUND

/** Seven conditions, five grounds. `clear` reads as sun, `foggy` as cloud,
 *  and `stars` is the only thing that gets night. */
const GROUND_FOR: Record<Condition, GroundKey> = {
  sunny: 'sun',
  clear: 'sun',
  stars: 'night',
  cloudy: 'cloud',
  foggy: 'cloud',
  raining: 'rain',
  hailing: 'ice',
}

function periodFor(hour: number) {
  if (hour >= 5 && hour < 11) return PERIODS.morning
  if (hour >= 11 && hour < 17) return PERIODS.midday
  if (hour >= 17 && hour < 20) return PERIODS.twilight
  return PERIODS.night
}

/**
 * Dev-only condition override: `?wx=hailing` pins the card to one condition.
 *
 * The card's acceptance checks are written to be run against a screenshot of
 * each ground, and there is otherwise no way to reach four of the five on
 * demand — the condition is random and `stars` only exists after 8pm. Gated
 * on `import.meta.env.DEV` so it cannot be reached in the deployed build, the
 * same way `window.__auditScene()` is.
 */
function forcedCondition(): Condition | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null
  const q = new URLSearchParams(window.location.search).get('wx')
  return q && q in CONDITION_COPY ? (q as Condition) : null
}

/** The weather is picked once per load, from what this hour can plausibly do.
 *  `mode` follows the ground's lightness, not the clock: paper type on sun,
 *  rain and night, ink on ice and cloud. */
export function pickWeather() {
  const period = periodFor(new Date().getHours())
  const condition = (forcedCondition() ??
    period.conditions[
      Math.floor(Math.random() * period.conditions.length)
    ]) as Condition
  const copy = CONDITION_COPY[condition]
  const temp = copy.temp[0] + Math.floor(Math.random() * (copy.temp[1] - copy.temp[0] + 1))
  const key = GROUND_FOR[condition]
  const g = GROUND[key]
  return { bg: g.bg, mode: g.mode, ground: key, condition, copy, temp }
}

export type Weather = ReturnType<typeof pickWeather>

/* ------------------------------------------------------------------ *
 * The illustration
 *
 * Flat 2D vector, drawn for this product. Not a render, not a glyph, not a
 * stock weather-icon font: flat shapes with a second tone for form. It is
 * sized to dominate the card rather than to sit in a corner of it, which is
 * the point of the takeover — there is no plate, no projection and no third
 * dimension anywhere in here.
 * ------------------------------------------------------------------ */

/** Deterministic fraction from an index — pure, so the drop positions are
 *  stable across renders without a mutable seed or a call to Math.random. */
const frac = (n: number) => {
  const x = Math.sin(n) * 43758.5453
  return x - Math.floor(x)
}

/**
 * A cloud, as one flat silhouette plus a shade band along its underside.
 *
 * The band is the whole shape redrawn in the second tone and clipped to the
 * silhouette's lower part, so the two tones share an edge exactly. Shapes sit
 * directly under `clipPath`: a `<g>` there is ignored by the spec and the clip
 * would silently fall back to the union of nothing at all.
 */
function Cloud({ x, y, w, id, fill, shade }: {
  x: number; y: number; w: number; id: string; fill: string; shade: string
}) {
  const h = w * 0.34
  const body = (
    <>
      <rect x={x} y={y + h * 0.42} width={w} height={h * 0.58} rx={h * 0.29} />
      <circle cx={x + w * 0.31} cy={y + h * 0.4} r={h * 0.4} />
      <circle cx={x + w * 0.55} cy={y + h * 0.28} r={h * 0.52} />
      <circle cx={x + w * 0.76} cy={y + h * 0.46} r={h * 0.34} />
    </>
  )
  return (
    <g>
      <defs>
        <clipPath id={id}>{body}</clipPath>
      </defs>
      <g fill={fill}>{body}</g>
      <rect x={x - 2} y={y + h * 0.72} width={w + 4} height={h} fill={shade}
        clipPath={`url(#${id})`} />
    </g>
  )
}

/**
 * The sun: a flat disc, eight flat rays, and one shade crescent.
 *
 * The rays rotate once, slowly — §4's animation ban is relaxed for this card
 * to exactly this and to cloud drift, and the doc names quantity as the
 * failure mode, so this is one movement and not a movement plus a pulse.
 */
function Sun({ cx, cy, r, fill, shade, id, gap = 7, len = 9, sw = 4 }: {
  cx: number; cy: number; r: number; fill: string; shade: string; id: string
  /* Ray geometry, in user units: the clear space between disc and ray, the
     ray's own length, and its weight. Defaulted to the numbers this drew
     before they were props, so the card is untouched; `WeatherIcon` passes
     its own set because a ray gap tuned for a 42-unit disc is most of the
     icon at 4.6. */
  gap?: number; len?: number; sw?: number
}) {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * 45) * (Math.PI / 180)
    return {
      x1: cx + Math.cos(a) * (r + gap), y1: cy + Math.sin(a) * (r + gap),
      x2: cx + Math.cos(a) * (r + gap + len), y2: cy + Math.sin(a) * (r + gap + len),
    }
  })
  return (
    <g>
      <defs>
        <clipPath id={id}><circle cx={cx} cy={cy} r={r} /></clipPath>
      </defs>
      {/* The rotation is on its own group so the disc underneath stays put. */}
      <g className="wx-spin" style={{ transformOrigin: `${cx}px ${cy}px` }}>
        {rays.map((l, i) => (
          <line key={i} x1={l.x1.toFixed(1)} y1={l.y1.toFixed(1)}
            x2={l.x2.toFixed(1)} y2={l.y2.toFixed(1)}
            stroke={fill} strokeWidth={sw} strokeLinecap="round" />
        ))}
      </g>
      <circle cx={cx} cy={cy} r={r} fill={fill} />
      <circle cx={cx + r * 0.42} cy={cy + r * 0.46} r={r} fill={shade}
        clipPath={`url(#${id})`} />
    </g>
  )
}

/** A crescent moon: one disc with a second disc cut out of it. Flat, two
 *  tones, no gradient — the cut-out is the shade tone, not transparency,
 *  so nothing behind it shows through. */
function Moon({ cx, cy, r, fill, shade }: {
  cx: number; cy: number; r: number; fill: string; shade: string
}) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={fill} />
      <circle cx={cx - r * 0.44} cy={cy - r * 0.3} r={r * 0.92} fill={shade} />
    </g>
  )
}

/* ------------------------------------------------------------------ *
 * The same illustration, at list scale
 *
 * `WeatherIcon` is the hero's vocabulary shrunk, not a second icon set: it
 * draws the same `Sun`, `Cloud` and `Moon` primitives the card draws, with
 * rain as flat lines and hail as rotated squares exactly as `WeatherScene`
 * builds them. Section 10's check 9 — custom flat vector with a second tone,
 * never a monoline pictogram or a stock glyph — therefore holds here for the
 * same reason it holds on the card: it is literally the same geometry.
 *
 * What does NOT come down unchanged is the figure/shade pair. Those two tones
 * are drawn to sit on their own saturated full-card ground — `#F7BE80` is a
 * sun on `#A25A1A` and nothing at all on bone paper. So the icon keeps its
 * condition's hue and moves only its lightness, which is the whole rule here:
 * **no icon introduces a hue that is not already its own ground's.**
 * ------------------------------------------------------------------ */

/**
 * The list-scale icon palette. One hue per condition — its own locked
 * ground's — at two lightnesses, and no second colour family anywhere.
 *
 * Measured against the week list's actual paper, `#F9F5EC` (the panel's
 * `rgba(248,242,231,0.55)` over `--pp-panel`):
 *
 *   sun    #A25A1A  h28   4.81:1  locked value, unchanged
 *   rain   #2E6D8A  h199  5.26:1  locked value, unchanged
 *   night  #1F3747  h204 11.38:1  locked value, unchanged
 *   ice    #3798AF  h191  3.08:1  l86 → l45, its own hue
 *   cloud  #938D80  h40   3.03:1  l71 → l54, its own hue
 *
 * Three of the five already clear 4.5:1 at the value §10 locks, so they are
 * used exactly as locked. Only the two pale grounds needed moving, and both
 * moved down their own hue rather than across to another one — ice stays at
 * 191° and cloud stays at 40°, saturation untouched, so cloud's load-bearing
 * 8% and the clearances `check:weather` enforces are unaffected.
 *
 * **The sun stays at 28°.** It is not gold, amber or yellow — §10's check 4
 * requires deep warm orange at exactly this hue and `check:weather` enforces
 * 12.5° of clearance from Finance's gold and 22° from the 50–65° yellow band.
 * §2's ban is on yellow and on gold as a loophole, and 28° at lightness 37 is
 * neither. Darkening it further was considered and refused: it already clears
 * 4.5:1, so the only argument for moving it would be the yellow rule, and the
 * yellow rule does not reach it.
 *
 * `shade` is 14 points below `fig` on the same hue. It is drawn OVER the body
 * as an underside band, so it has to be the darker of the two or the form
 * reads inverted — lit from below.
 */
export const ICON_TONE: Record<GroundKey, { fig: string; shade: string }> = {
  sun: { fig: '#A25A1A', shade: '#643810' },
  rain: { fig: '#2E6D8A', shade: '#1C4354' },
  ice: { fig: '#3798AF', shade: '#266978' },
  cloud: { fig: '#938D80', shade: '#6E695E' },
  night: { fig: '#1F3747', shade: '#091015' },
}

/**
 * The outlook's forecast words, in the vocabulary the illustration speaks.
 *
 * `OUTLOOK` is written in a reader's language ('Showers', 'Part cloud') and
 * the shapes are drawn against `Condition`, so the translation lives here
 * beside the shapes rather than making `data.ts` import a type from the
 * component that renders it.
 *
 * Two of these collapse: 'Part cloud' draws the cloud, and 'Showers' and
 * 'Rain' draw the same cloud under a different number of lines. Neither is a
 * new shape — see `drops` below.
 */
const CONDITION_FOR_LABEL: Record<string, Condition> = {
  Sunny: 'sunny',
  Clear: 'clear',
  Cloudy: 'cloudy',
  'Part cloud': 'cloudy',
  Foggy: 'foggy',
  Showers: 'raining',
  Rain: 'raining',
  Hail: 'hailing',
}

export const conditionForLabel = (label: string): Condition =>
  CONDITION_FOR_LABEL[label] ?? 'cloudy'

/**
 * A weather icon at list scale, drawn in a 24-unit box and sized by `size`.
 *
 * Colour comes from `currentColor`, so the icon darkens with the row it sits
 * in rather than carrying a palette of its own.
 */
export function WeatherIcon({ label, size = 18 }: { label: string; size?: number }) {
  /* clipPath ids are document-global, and this renders seven times in the
     week list plus twelve more in every open day. A duplicated id would
     silently clip every later copy to the first one's shape. */
  const raw = useId()
  const uid = `wxi-${raw.replace(/[^a-zA-Z0-9]/g, '')}`
  const c = conditionForLabel(label)
  /* The icon's hue is its condition's own ground, routed through the same
     `GROUND_FOR` table the card uses, so a condition can never pick up a
     hue the card would not have given it. */
  const { fig: ICON_FIG, shade: ICON_SHADE } = ICON_TONE[GROUND_FOR[c]]
  const cloudy = c === 'cloudy' || c === 'raining' || c === 'hailing'
  /* 'Showers' is lighter than 'Rain', and that is the only thing separating
     them in the outlook. Two lines against three, same lines. */
  const drops = label === 'Showers' ? [8.5, 14.5] : [6.5, 12, 17.5]

  return (
    <svg
      className="pg__wx"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
    >
      {(c === 'sunny' || c === 'clear') && (
        <Sun cx={12} cy={12} r={4.6} gap={2.1} len={2.7} sw={1.7}
          fill={ICON_FIG} shade={ICON_SHADE} id={`${uid}-s`} />
      )}

      {/* The moon is the one icon whose second tone is not its own hue.
          `Moon` carves its crescent with an opaque disc rather than a mask,
          so on the card that disc is the night ground and here it has to be
          the paper under the row — night's darker tone would draw a blot
          where the crescent's bite belongs. */}
      {c === 'stars' && (
        <Moon cx={13.2} cy={11.6} r={6.4} fill={ICON_FIG} shade="var(--pp-panel)" />
      )}

      {c === 'foggy' &&
        [7.5, 12, 16.5].map((y, i) => (
          <rect key={y} x={3} y={y} width={i === 1 ? 18 : 14} height={2.4} rx={1.2}
            fill={i === 1 ? ICON_SHADE : ICON_FIG} />
        ))}

      {cloudy && (
        <Cloud x={2.4} y={c === 'cloudy' ? 9.4 : 6.2} w={19.2} id={`${uid}-c`}
          fill={ICON_FIG} shade={ICON_SHADE} />
      )}

      {c === 'raining' &&
        drops.map((x) => (
          <line key={x} x1={x} y1={15.2} x2={x - 1.4} y2={20.4}
            stroke={ICON_SHADE} strokeWidth={1.7} strokeLinecap="round" />
        ))}

      {c === 'hailing' &&
        [7.4, 13.4].map((x) => (
          <rect key={x} x={x} y={15.6} width={3.4} height={3.4} rx={0.7}
            fill={ICON_SHADE} transform={`rotate(45 ${x + 1.7} 17.3)`} />
        ))}
    </svg>
  )
}

export function WeatherScene({ weather }: { weather: Weather }) {
  /* Rain lines and hail shards. Deterministic, so a re-render does not
     reshuffle the sky under the reader. Held to x 104–226 so nothing falls
     through the type column on the left. */
  const bits = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        x: 104 + frac(i * 12.9898 + 1) * 122,
        len: 13 + frac(i * 21.44 + 7) * 9,
        delay: `${(frac(i * 78.233 + 2) * 1.4).toFixed(2)}s`,
        dur: `${(1.1 + frac(i * 37.719 + 3) * 0.5).toFixed(2)}s`,
      })),
    [],
  )

  const c = weather.condition
  const g = GROUND[weather.ground]
  const uid = `wx-${weather.ground}-${c}`

  /* The scene is full-bleed — the ground is the card, edge to edge — but the
     composition is weighted right, because the type column occupies the left.
     That is layout, not a plate: there is no frame, no inset and no second
     background anywhere in here.

     `xMaxYMid`, not `xMidYMid`, and for the same reason the bell on the foot
     traffic tab needed it. The figures are drawn into the right of a 240x150
     box, but the card is wider than that ratio, so centring the box
     pillarboxes it and carries everything inside back toward the middle of
     the card — far enough to put the cloud over the metrics column on the
     left. Pinning the box's right edge to the card's right edge keeps the
     illustration where it was composed to be at every card width. Only the
     figures move; the ground is the card's own background and is unaffected. */
  return (
    <div className="weatherScene">
      <svg viewBox="0 0 240 150" preserveAspectRatio="xMaxYMid meet" aria-hidden>
        {/* Everything is drawn at its original coordinates and then placed as
            one group, so the figures keep their proportions to each other and
            only the composition moves. The scale accounts for the ±7 of
            `wxDrift`: the cloud's real left extent is x 89, not the x 96 it
            is drawn at, and sizing to the drawn edge would let a drifting
            cloud reach back into the type column a second and a half later. */}
        <g transform="translate(51.4 23.2) scale(0.785)">
        {(c === 'sunny' || c === 'clear') && (
          <Sun cx={168} cy={66} r={42} fill={g.figure} shade={g.shade} id={`${uid}-sun`} />
        )}

        {c === 'stars' && (
          <g>
            <Moon cx={172} cy={62} r={38} fill={g.figure} shade={g.shade} />
            {[[112, 26], [224, 40], [104, 112], [214, 124], [138, 132]].map(([x, y], i) => (
              <circle key={i} className="wx-twinkle" cx={x} cy={y} r={i % 3 === 0 ? 3 : 2}
                fill={g.figure} style={{ animationDelay: `${(i * 0.9).toFixed(1)}s` }} />
            ))}
          </g>
        )}

        {/* Fog is the cloud ground's other state: flat bands, no blur. §4's
            ban on blur is not relaxed, only its ban on ambient motion is,
            so these drift rather than soften. */}
        {c === 'foggy' &&
          [
            { y: 40, w: 120, tone: g.figure, dur: '24s', delay: '0s' },
            { y: 68, w: 148, tone: g.shade, dur: '30s', delay: '-9s' },
            { y: 96, w: 104, tone: g.figure, dur: '27s', delay: '-16s' },
          ].map((b) => (
            <rect key={b.y} className="wx-drift" x={100} y={b.y} width={b.w} height={12} rx={6}
              fill={b.tone} style={{ animationDuration: b.dur, animationDelay: b.delay }} />
          ))}

        {/* One large cloud, one small, both drifting slowly. Two moving shapes
            is the whole budget — the doc's failure mode for motion is
            quantity, not speed. */}
        {(c === 'cloudy' || c === 'raining' || c === 'hailing') && (
          <g>
            <g className="wx-drift" style={{ animationDuration: '26s' }}>
              <Cloud x={112} y={26} w={116} id={`${uid}-c1`} fill={g.figure} shade={g.shade} />
            </g>
            <g className="wx-drift" style={{ animationDuration: '34s', animationDelay: '-13s' }}>
              <Cloud x={96} y={62} w={72} id={`${uid}-c2`} fill={g.shade} shade={g.figure} />
            </g>
          </g>
        )}

        {/* Rain is a few flat lines, not a particle system. Nine of them. */}
        {c === 'raining' &&
          bits.map((d, i) => (
            <line key={i} className="wx-fall"
              x1={d.x.toFixed(1)} y1={96} x2={(d.x - 4).toFixed(1)} y2={(96 + d.len).toFixed(1)}
              stroke={g.figure} strokeWidth={3} strokeLinecap="round"
              style={{ animationDelay: d.delay, animationDuration: d.dur }} />
          ))}

        {/* Hail: flat diamonds. The rotate lives on the shape and the fall on
            the group, because a CSS transform would overwrite the transform
            attribute outright. */}
        {c === 'hailing' &&
          bits.slice(0, 7).map((d, i) => (
            <g key={i} className="wx-fall"
              style={{ animationDelay: d.delay, animationDuration: d.dur }}>
              <rect x={d.x.toFixed(1)} y={96} width={8} height={8} rx={1.5} fill={g.figure}
                transform={`rotate(45 ${(d.x + 4).toFixed(1)} 100)`} />
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}

/**
 * The shop door's bell, on the warm pavement ground.
 *
 * This replaces a row of walking dot-headed silhouettes. Those were isotype
 * — a pictogram of a person standing in for a count of people — and the card
 * now draws the count itself as a bar chart, so a second, vaguer picture of
 * the same fact was both redundant and the weaker of the two. §11 rule 10
 * wants an icon to be a mark, not a picture of the data.
 *
 * Drawn in the same language as the weather set: flat silhouette, one second
 * tone for form, no gradient, no bevel, nothing photographic. It sits
 * top-right where the weather card's condition illustration sits, at
 * comparable weight, so the two tabs share a composition rather than each
 * inventing one.
 *
 * Motion follows §10's weather rule literally: ONE movement, and quantity is
 * the failure mode. The bell swings, and that is all it does — no ring
 * lines, no pulse, no second animated part. The swing is also mostly rest:
 * the keyframe spends roughly four fifths of its nine seconds still, so what
 * reads is a bell that is occasionally knocked rather than a bell that never
 * stops. See `bellSwing` in `dashboard.css`.
 */
export function TrafficScene() {
  /* One warm ink at two values, matching the card's own locked palette —
     the same #3A2014 the walkers were drawn in, not a new colour. */
  const fig = 'rgba(58,32,20,0.40)'
  const shade = 'rgba(58,32,20,0.62)'

  /* `xMaxYMin`, not `xMidYMid`. The scene box is 240x150 and the card is
     wider than that ratio, so centring the content pillarboxes it and drags
     the bell inward — far enough, at the card's real width, to land on top
     of Saturday's bar and Sunday's label at the right end of the chart.
     Pinning the content's top-right corner to the card's top-right corner
     puts the bell where it was asked to be at every card width instead of
     only at the one ratio where centring happened to look right. */
  return (
    <div className="trafficScene">
      <svg viewBox="0 0 240 150" preserveAspectRatio="xMaxYMin meet" aria-hidden>
        {/* The mount the bell hangs from stays put; only the bell swings. */}
        <rect x={172} y={12} width={40} height={4.5} rx={2.25} fill={shade} />
        <g className="bellSwing" style={{ transformOrigin: '192px 14px' }}>
          <line x1={192} y1={16} x2={192} y2={29} stroke={shade} strokeWidth={3.5}
            strokeLinecap="round" />
          <circle cx={192} cy={31} r={4.5} fill={shade} />
          {/* The dome: a crown, a skirt widening under it, closed by the
              flat rim. One silhouette, drawn as one path. */}
          <path
            d="M192 36
               c -15 0 -24 12.5 -26 27
               c -1.4 10.6 -3.6 16 -7 19.6
               h 66
               c -3.4 -3.6 -5.6 -9 -7 -19.6
               c -2 -14.5 -11 -27 -26 -27 z"
            fill={fig}
          />
          {/* The second tone: the dome's right flank, giving the flat shape
              form the way the weather clouds get theirs. */}
          <path
            d="M192 36
               c 15 0 24 12.5 26 27
               c 1.4 10.6 3.6 16 7 19.6
               h -33 z"
            fill={shade}
          />
          <rect x={158} y={81.5} width={68} height={5.5} rx={2.75} fill={shade} />
          {/* The clapper, below the rim. Part of the same swinging group, so
              it moves with the bell rather than against it — one movement. */}
          <circle cx={192} cy={93.5} r={6} fill={fig} />
        </g>
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * News grounds: one per kind of story, not one backdrop reused
 *
 * Same principle as the weather micro-palette, and held to the same checks.
 * Every hue is measured clear of all five department grounds, the sage
 * signal, caution, navy, the five weather grounds and foot traffic's warm:
 *
 *   rate    236.3deg  l24  — markets. 17.7deg off Peregrine navy.
 *   award   266.7deg  l24  — clear of every reserved hue by more than 12deg.
 *   council 205.7deg  s6   — asphalt. 1.7deg off the weather's night ground,
 *                            and separated from it by 33 points of SATURATION,
 *                            the same way cloud is separated from Finance.
 *
 * **The rate ground is not the navy this card used to carry.** It was
 * `#1C2A42`, which measures 0.7deg from Peregrine navy with 1.6 points of
 * lightness between them: not "near" navy, effectively navy itself, on a
 * card that is neither structure nor an action. Section 2 reserves that hue
 * for the wordmark and for real commands, so a full-card takeover in it read
 * as brand chrome. Moving to 236deg keeps the deep editorial blue a markets
 * story wants and gets off the reserved hue to do it.
 * ------------------------------------------------------------------ */
export const NEWS_GROUND: Record<NewsKind, { bg: string; ink: string; line: string; dim: string }> = {
  rate: { bg: '#252856', ink: '#FBFBF9', line: '#8FA8E8', dim: 'rgba(143,168,232,0.26)' },
  award: { bg: '#3B2B4F', ink: '#FBFBF9', line: '#C3A6DC', dim: 'rgba(195,166,220,0.24)' },
  council: { bg: '#34383B', ink: '#FBFBF9', line: '#A8B0B4', dim: 'rgba(168,176,180,0.26)' },
}

/**
 * The cash rate over twelve meetings, as an actual chart.
 *
 * This replaces a ten-point polyline with no axis, no baseline and no scale,
 * drawn at 0.5 opacity behind the headline. It read as a squiggle because it
 * was one: nothing about it was legible as a rate, and a shape that gestures
 * at "finance" without carrying a figure is decoration standing where
 * information should be.
 *
 * Built to the revenue chart's discipline. Flat bars off a real baseline, a
 * gridline at the series' own floor, no gradient, no fill under a curve, and
 * colour rationed to the one bar that matters: the current rate, held. The
 * step is what a cash rate actually does, so the series steps and holds
 * rather than wandering between points.
 */
function RateChart({ g }: { g: (typeof NEWS_GROUND)[NewsKind] }) {
  /* Twelve meetings of a tightening cycle flattening out, in basis points
     above the floor. Fixture, like every number on this card. */
  const bars = [0, 0, 25, 25, 50, 75, 75, 100, 110, 110, 110, 110]
  const peak = 110
  const w = 13
  const gap = 6
  const base = 58
  const top = 10

  return (
    <svg viewBox="0 0 240 70" preserveAspectRatio="xMaxYMax meet" className="newsArt" aria-hidden>
      {/* The baseline, and one gridline at the level the series holds at. */}
      <line x1={12} y1={base} x2={236} y2={base} stroke={g.line} strokeWidth={1} opacity={0.5} />
      <line x1={12} y1={top + 2} x2={236} y2={top + 2} stroke={g.line} strokeWidth={0.75}
        strokeDasharray="2 4" opacity={0.3} />
      {bars.map((b, i) => {
        const h = ((b / peak) * (base - top - 2)) || 1.5
        const held = i >= 8
        return (
          <rect key={i} x={14 + i * (w + gap)} y={base - h} width={w} height={h} rx={1}
            fill={held ? g.line : g.dim} />
        )
      })}
    </svg>
  )
}

/**
 * Award rates: the classification ladder stepping up.
 *
 * A different visual family from the chart on purpose. A wage review is not
 * a time series, it is a set of pay grades all lifted at once, so this draws
 * the grades as a ladder of rows with the lift shown on the end of each,
 * rather than borrowing the rate story's bars and implying a trend the story
 * does not have.
 */
function AwardLadder({ g }: { g: (typeof NEWS_GROUND)[NewsKind] }) {
  const rows = [46, 58, 70, 82, 94, 106]
  return (
    <svg viewBox="0 0 240 70" preserveAspectRatio="xMaxYMax meet" className="newsArt" aria-hidden>
      {rows.map((wd, i) => {
        const y = 10 + i * 9.4
        return (
          <g key={i}>
            <rect x={14} y={y} width={wd} height={5} rx={2.5} fill={g.dim} />
            {/* The uplift, on the end of every grade: the point of the story
                is that it applies to all of them, not to the top one. */}
            <rect x={14 + wd + 3} y={y} width={12} height={5} rx={2.5} fill={g.line} />
          </g>
        )
      })}
    </svg>
  )
}

/**
 * Street works: the block, in plan.
 *
 * The third family, and the one furthest from a chart, because the story is
 * a place rather than a number. Two kerb lines, the cross streets the works
 * run between, and the closed section hatched between them.
 */
function StreetPlan({ g }: { g: (typeof NEWS_GROUND)[NewsKind] }) {
  return (
    <svg viewBox="0 0 240 70" preserveAspectRatio="xMaxYMax meet" className="newsArt" aria-hidden>
      <defs>
        <pattern id="wk-hatch" width={7} height={7} patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={7} stroke={g.line} strokeWidth={2.5} opacity={0.55} />
        </pattern>
      </defs>
      {/* The street: two kerbs running the width. */}
      <rect x={10} y={26} width={226} height={2} rx={1} fill={g.dim} />
      <rect x={10} y={50} width={226} height={2} rx={1} fill={g.dim} />
      {/* The two cross streets the works run between. */}
      {[70, 186].map((x) => (
        <rect key={x} x={x} y={10} width={2} height={50} rx={1} fill={g.dim} />
      ))}
      {/* The closed block, hatched. */}
      <rect x={72} y={28} width={114} height={22} fill="url(#wk-hatch)" />
      <rect x={72} y={28} width={114} height={22} fill="none" stroke={g.line} strokeWidth={1.2} />
    </svg>
  )
}

/** The news ground's art, chosen by what the story actually is. */
export function NewsScene({ kind }: { kind: NewsKind }) {
  const g = NEWS_GROUND[kind]
  return (
    <div className="newsScene">
      {kind === 'rate' && <RateChart g={g} />}
      {kind === 'award' && <AwardLadder g={g} />}
      {kind === 'council' && <StreetPlan g={g} />}
    </div>
  )
}

export function GlanceScene({ tab, weather, newsKind }: {
  tab: GlanceKey; weather: Weather; newsKind: NewsKind
}) {
  if (tab === 'weather') return <WeatherScene weather={weather} />
  if (tab === 'traffic') return <TrafficScene />
  return <NewsScene kind={newsKind} />
}
