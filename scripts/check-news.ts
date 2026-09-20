/**
 * News ground palette check.
 *
 * The news card gained one ground per kind of story, on the same argument
 * the weather card's five grounds were granted: a takeover reads as the
 * subject, so the subject picks the colour. That is a scoped exception to
 * Section 2 and it only holds while the hues stay clear of everything
 * Section 2 actually reserves, which is what this checks.
 */
import { NEWS_GROUND } from '../src/dashboard/GlanceScene'
import { GROUND } from '../src/dashboard/GlanceScene'
import { domain, ink, status } from '../src/theme/tokens'

type HSL = { h: number; s: number; l: number }
const hsl = (hex: string): HSL => {
  const n = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255)
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  let h = 0
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6
    else if (mx === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  const l = (mx + mn) / 2
  return { h, s: d ? (d / (1 - Math.abs(2 * l - 1))) * 100 : 0, l: l * 100 }
}
const lum = (hex: string) => {
  const n = hex.replace('#', '')
  const c = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
const arc = (a: number, b: number) => { const d = Math.abs(a - b); return d > 180 ? 360 - d : d }

const RESERVED: Record<string, string> = {
  'Finance ground': domain.finance,
  'Marketing ground': domain.marketing,
  'Suppliers ground': domain.suppliers,
  'Roster ground': domain.roster,
  'Admin ground': domain.admin,
  'sage (needs attention)': status.attention,
  'caution (mulberry)': status.caution,
  'Peregrine navy': ink.base,
  'weather sun': GROUND.sun.bg,
  'weather rain': GROUND.rain.bg,
  'weather ice': GROUND.ice.bg,
  'weather cloud': GROUND.cloud.bg,
  'weather night': GROUND.night.bg,
  'foot traffic accent': '#7C3A1F',
}

let fails = 0
const fail = (m: string) => { fails += 1; console.log(`  FAIL  ${m}`) }
const pass = (m: string) => console.log(`  pass  ${m}`)

console.log('News grounds — one per kind of story\n')

for (const [name, g] of Object.entries(NEWS_GROUND)) {
  const { h, s, l } = hsl(g.bg)
  console.log(`${name.padEnd(8)} ${g.bg}  h${h.toFixed(1).padStart(6)}  s${s.toFixed(0).padStart(3)}%  l${l.toFixed(0).padStart(3)}%`)

  for (const [who, hex] of Object.entries(RESERVED)) {
    const r = hsl(hex)
    const dh = arc(h, r.h)
    if (dh >= 12) continue
    const dl = Math.abs(l - r.l), ds = Math.abs(s - r.s)
    if (ds >= 25) pass(`${name} is ${dh.toFixed(0)}deg from ${who} but ${ds.toFixed(0)} points less saturated`)
    else if (dl >= 25) pass(`${name} is ${dh.toFixed(0)}deg from ${who} but ${dl.toFixed(0)} points darker/lighter`)
    else fail(`${name} is only ${dh.toFixed(1)}deg from ${who} (${hex}) with no second axis separating them`)
  }

  /* §2 bans yellow in any form, gold included. */
  if (h >= 40 && h <= 65 && s > 15) fail(`${name} sits in the yellow/gold band at ${h.toFixed(1)}deg`)

  /* Paper type has to survive the ground; 11px captions need 4.5:1. */
  const cap = contrast(g.ink, g.bg)
  if (cap < 4.5) fail(`${name} caption contrast is ${cap.toFixed(2)}:1, under 4.5:1`)
  else pass(`paper on ${name} is ${cap.toFixed(2)}:1`)

  /* The art needs to read as a graphical object against its own ground. */
  const art = contrast(g.line, g.bg)
  if (art < 3) fail(`${name} art line is ${art.toFixed(2)}:1, under the 3:1 graphical-object threshold`)
  else pass(`${name} art line ${art.toFixed(2)}:1`)
  console.log('')
}

/* The three have to be told apart from EACH OTHER, not only from the system. */
const keys = Object.keys(NEWS_GROUND) as (keyof typeof NEWS_GROUND)[]
for (let i = 0; i < keys.length; i += 1) {
  for (let j = i + 1; j < keys.length; j += 1) {
    const a = hsl(NEWS_GROUND[keys[i]!].bg), b = hsl(NEWS_GROUND[keys[j]!].bg)
    const d = arc(a.h, b.h), ds = Math.abs(a.s - b.s)
    if (d < 15 && ds < 20) fail(`${keys[i]} and ${keys[j]} are only ${d.toFixed(1)}deg apart — the rotation will not read as different stories`)
    else pass(`${keys[i]} vs ${keys[j]}: ${d.toFixed(1)}deg apart`)
  }
}

console.log(`\n${fails === 0 ? 'all checks pass' : `${fails} FAILED`}`)
process.exit(fails === 0 ? 0 : 1)
