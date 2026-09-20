/**
 * Chart series palette check.
 *
 * The revenue panel's breakdowns hold the only categorical colour left in
 * the product that is not a ground. That exemption exists because a
 * three-way legend genuinely needs distinguishable swatches; it does not
 * extend to chroma, and it does not suspend Section 2. What it replaced
 * broke three stated rules at once, so those three are checked by number
 * here rather than by eye.
 */
import { SERIES, SEG_SEPARATOR } from '../src/dashboard/data'
import { domain, ink, status } from '../src/theme/tokens'

const px = (h: string) => [0, 2, 4].map((i) => parseInt(h.replace('#', '').slice(i, i + 2), 16))
const hsl = (hex: string) => {
  const [r, g, b] = px(hex).map((v) => v / 255) as [number, number, number]
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  let h = 0
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6
    else if (mx === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60; if (h < 0) h += 360
  }
  const l = (mx + mn) / 2
  return { h, s: d ? (d / (1 - Math.abs(2 * l - 1))) * 100 : 0, l: l * 100 }
}
const lum = (hex: string) => {
  const c = px(hex).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!
}
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
const dist = (a: string, b: string) => {
  const [A, B] = [px(a), px(b)]
  return Math.sqrt(A.reduce((s, v, i) => s + (v - B[i]!) ** 2, 0))
}
const arc = (a: number, b: number) => { const d = Math.abs(a - b); return d > 180 ? 360 - d : d }

/**
 * TIER 1 only. See "Scope of a reservation" in `.antigravity.md`.
 *
 * These are the identity colours: they mean something that travels, so a
 * swatch near one misleads on any screen. The weather and news grounds used
 * to be in this list and should not have been. Section 10 grants each as a
 * SCOPED exception to Section 2, scoped to its own card, and a ground that
 * identifies one card cannot be confused with a bar in a popup that is never
 * on screen beside it. Including them reserved most of the warm band on
 * behalf of colours with no claim to it, which is what drove this palette
 * achromatic.
 */
const RESERVED: Record<string, string> = {
  ...Object.fromEntries(Object.entries(domain).map(([k, v]) => [`${k} ground`, v as string])),
  sage: status.attention, caution: status.caution, navy: ink.base,
}
const PAPER = '#FBF8F2'
let fails = 0
const fail = (m: string) => { fails += 1; console.log(`  FAIL  ${m}`) }
const pass = (m: string) => console.log(`  pass  ${m}`)

console.log('Chart series — muted, and inside every rule the system states\n')

for (const [name, hex] of Object.entries(SERIES)) {
  const { h, s, l } = hsl(hex)
  console.log(`${name.padEnd(6)} ${hex}  h${h.toFixed(1).padStart(6)}  s${s.toFixed(0).padStart(3)}%  l${l.toFixed(0).padStart(3)}%`)

  /* §2: no yellow, in any form, gold included. This is the one that the old
     #F5B942 broke while sitting 0.8deg from Finance's ground. */
  if (h >= 38 && h <= 66 && s > 18) fail(`${name} is in the yellow/gold band at h${h.toFixed(1)} s${s.toFixed(0)}%`)
  /* theme.css: "there is still no red anywhere: nothing here is an emergency." */
  if ((h <= 20 || h >= 348) && s > 30) fail(`${name} reads as red at h${h.toFixed(1)} s${s.toFixed(0)}%`)
  /* The violet that belonged to Booking's old plate was deleted, not parked. */
  if (h >= 258 && h <= 278 && s > 20) fail(`${name} is in the deleted violet's band at h${h.toFixed(1)}`)

  /* Chroma ceiling: these are chart tones on paper, not grounds. */
  /* A ceiling, not a muting rule. It keeps these off the 90-100% SaaS
     primaries that started all this without pinning them to grey. */
  if (s > 65) fail(`${name} is ${s.toFixed(0)}% saturated — above the chart-tone ceiling`)

  /* Separation on ANY of three axes: hue 12deg, lightness 22, saturation 28.
     Calibrated to the two precedents the doc already set, `cloud` clearing
     Finance on 45 points of saturation and `night` clearing Marketing on 25
     of lightness. Hue alone was never the rule, only the axis that got
     checked. */
  for (const [who, rhex] of Object.entries(RESERVED)) {
    const r = hsl(rhex)
    const dh = arc(h, r.h), dl = Math.abs(l - r.l), ds = Math.abs(s - r.s)
    if (dh >= 12) continue
    if (dl >= 22) pass(`${name} is ${dh.toFixed(0)}deg from ${who} but ${dl.toFixed(0)} points apart in lightness`)
    else if (ds >= 28) pass(`${name} is ${dh.toFixed(0)}deg from ${who} but ${ds.toFixed(0)} points apart in saturation`)
    else fail(`${name} is ${dh.toFixed(1)}deg from ${who}, and only ${dl.toFixed(0)} lightness / ${ds.toFixed(0)} saturation from it`)
  }

  /* A swatch is a graphical object: 3:1 on the paper it sits on. */
  const c = contrast(hex, PAPER)
  if (c < 3) fail(`${name} is ${c.toFixed(2)}:1 on paper, under the 3:1 graphical-object threshold`)
  else pass(`${name} ${c.toFixed(2)}:1 on paper`)
  console.log('')
}

/* Adjacent segments in a stacked bar have to be tellable apart. */
const keys = Object.keys(SERIES) as (keyof typeof SERIES)[]
let min = Infinity
for (let i = 0; i < keys.length; i += 1) {
  for (let j = i + 1; j < keys.length; j += 1) {
    const d = dist(SERIES[keys[i]!], SERIES[keys[j]!])
    min = Math.min(min, d)
    if (d < 25) fail(`${keys[i]} and ${keys[j]} are only ${d.toFixed(1)} apart — a stacked bar will read as one block`)
  }
}
pass(`closest pair is ${min.toFixed(1)} RGB units apart`)

/**
 * The edge test, and the one this file was missing.
 *
 * RGB distance says nothing about whether two colours have an edge where
 * they meet. `stone` and `moss` measured 40 units apart and 1.01:1 in
 * luminance, which is no boundary at all, and it was the boundary under 58%
 * of the panel's revenue. Adjacent means adjacent AS RENDERED: these are
 * stacked in declaration order by MIX, COSTS, CHANNELS and PAYMENTS alike,
 * and the legend lists them in the same order.
 */
console.log('\nStacking edges\n')
/* The hairline the chart draws between segments; see SEG_SEPARATOR. */
const SEPARATOR = '#F9F5EC'
const EDGE_MIN = 1.6

if (SEG_SEPARATOR) {
  /* The edge is drawn, so the test is whether the DRAWN line is visible
     against what sits on either side of it. A hairline the same value as
     its neighbours is no more use than no hairline at all. */
  console.log('  (segments are separated by a drawn hairline, so the edge is')
  console.log('   tested against the separator rather than between the tones)\n')
  for (let i = 0; i < keys.length - 1; i += 1) {
    const a = keys[i]!, b = keys[i + 1]!
    console.log(`  info  ${a} / ${b} tone-to-tone ${contrast(SERIES[a], SERIES[b]).toFixed(2)}:1 (floor ${EDGE_MIN} would apply without the hairline)`)
  }
  console.log('')
  for (const k of keys) {
    const r = contrast(SERIES[k], SEPARATOR)
    if (r < 3)
      fail(`${k} is ${r.toFixed(2)}:1 against the separator — the hairline will vanish along that segment`)
    else pass(`${k} against the separator ${r.toFixed(2)}:1`)
  }
} else {
  for (let i = 0; i < keys.length - 1; i += 1) {
    const a = keys[i]!, b = keys[i + 1]!
    const r = contrast(SERIES[a], SERIES[b])
    if (r < EDGE_MIN)
      fail(`${a} against ${b} is ${r.toFixed(2)}:1 — stacked together they will render as one block with no edge`)
    else pass(`${a} / ${b} edge ${r.toFixed(2)}:1`)
  }
}

/* And none may be mistaken for the one colour this panel rations. */
for (const [name, hex] of Object.entries(SERIES)) {
  const d = dist(hex, '#266d6c')
  if (d < 30) fail(`${name} is ${d.toFixed(1)} from the revenue accent — it will read as the rationed colour`)
}
pass('every series tone is clear of the revenue accent')

console.log(`\n${fails === 0 ? 'all checks pass' : `${fails} FAILED`}`)
process.exit(fails === 0 ? 0 : 1)
