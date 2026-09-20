/**
 * Weather card palette check — the colour half of the card's acceptance
 * checks, run against the values rather than against a screenshot.
 *
 * The card's other checks (is it flat, does the icon read, does the motion
 * look considered) need eyes on it. These do not: every one of them is a
 * number, and every one of them is a rule that is easy to break by nudging a
 * swatch. See the design doc, dashboard top row — weather.
 */
import { GROUND, ICON_TONE } from '../src/dashboard/GlanceScene'
import { domain, ink, status } from '../src/theme/tokens'

type HSL = { h: number; s: number; l: number }

const hsl = (hex: string): HSL => {
  const n = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255)
  const mx = Math.max(r, g, b)
  const mn = Math.min(r, g, b)
  const d = mx - mn
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
  const c = [0, 2, 4]
    .map((i) => parseInt(n.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

/** Alpha-composite a translucent foreground over an opaque ground. */
const over = (fg: string, alpha: number, bg: string) => {
  const px = (hex: string) =>
    [0, 2, 4].map((i) => parseInt(hex.replace('#', '').slice(i, i + 2), 16))
  const [F, B] = [px(fg), px(bg)]
  return (
    '#' +
    F.map((v, i) => Math.round(alpha * v + (1 - alpha) * B[i]).toString(16).padStart(2, '0')).join('')
  )
}

/** Shortest distance round the hue circle. */
const arc = (a: number, b: number) => {
  const d = Math.abs(a - b)
  return d > 180 ? 360 - d : d
}

/** The hues this palette has to stay clear of, and the reason each is locked. */
const RESERVED: Record<string, string> = {
  'Finance ground': domain.finance,
  'Marketing ground': domain.marketing,
  'Suppliers ground': domain.suppliers,
  'Roster ground': domain.roster,
  'Admin ground': domain.admin,
  'sage (needs attention)': status.attention,
  'caution (mulberry)': status.caution,
  'Peregrine navy': ink.base,
}

/* The type alphas `dashboard.css` actually sets on this card, per mode. The
   card's own ground decides which pair applies, so the check has to know
   them rather than assume the shared defaults. */
const TYPE = {
  dark: { hero: ['#FBFBF9', 1], caption: ['#FBFBF9', 0.94] },
  light: { hero: ['#0F2A40', 1], caption: ['#0F2A40', 0.82] },
} as const

let fails = 0
const fail = (msg: string) => {
  fails += 1
  console.log(`  FAIL  ${msg}`)
}
const pass = (msg: string) => console.log(`  pass  ${msg}`)

console.log('Weather micro-palette — five grounds\n')

for (const [name, g] of Object.entries(GROUND)) {
  const { h, s, l } = hsl(g.bg)
  console.log(
    `${name.padEnd(6)} ${g.bg}  h${h.toFixed(1).padStart(6)}  s${s.toFixed(0).padStart(3)}%  l${l.toFixed(0).padStart(3)}%  (${g.mode})`,
  )

  /* Check 5: no ground may match a department tone or navy. Hue clearance is
     the primary test; a ground inside 10° has to be separated on another axis
     and say so out loud, which is the case for cloud and night. */
  for (const [who, hex] of Object.entries(RESERVED)) {
    const r = hsl(hex)
    const dh = arc(h, r.h)
    const dl = Math.abs(l - r.l)
    const ds = Math.abs(s - r.s)
    if (dh >= 10) continue
    if (name === 'cloud' && who === 'Finance ground' && s <= 10) {
      pass(`cloud is ${dh.toFixed(0)}° from Finance but ${ds.toFixed(0)} points less saturated — achromatic, as documented`)
    } else if (name === 'night' && who === 'Marketing ground' && dl >= 25) {
      pass(`night is ${dh.toFixed(0)}° from Marketing but ${dl.toFixed(0)} points darker`)
    } else {
      fail(`${name} is only ${dh.toFixed(1)}° from ${who} (${hex}) with no documented second axis`)
    }
  }
  if (Object.values(domain).includes(g.bg as never)) fail(`${name} IS a department tone outright`)

  /* Checks: type has to survive its own ground. 11px captions need 4.5:1. */
  const t = TYPE[g.mode]
  const cap = contrast(over(t.caption[0], t.caption[1], g.bg), g.bg)
  const hero = contrast(over(t.hero[0], t.hero[1], g.bg), g.bg)
  if (cap < 4.5) fail(`${name} caption contrast is ${cap.toFixed(2)}:1, under 4.5:1`)
  else pass(`caption ${cap.toFixed(2)}:1, hero ${hero.toFixed(2)}:1`)

  /* The illustration needs a second value with real separation, or the flat
     shapes have no form. 3:1 is the graphical-object threshold. */
  const fig = contrast(g.figure, g.bg)
  if (fig < 3) fail(`${name} figure/ground is ${fig.toFixed(2)}:1, under 3:1 — the illustration will read as one blob`)
  else pass(`figure/ground ${fig.toFixed(2)}:1, shade/ground ${contrast(g.shade, g.bg).toFixed(2)}:1`)
  console.log('')
}

console.log('Named rules\n')

/* Check 4: the sun is deep warm orange, never gold, amber or yellow. */
const sun = hsl(GROUND.sun.bg)
const finance = hsl(domain.finance)
if (sun.h >= 50 && sun.h <= 65) fail(`sun hue ${sun.h.toFixed(1)}° is inside the 50–65° yellow band`)
else pass(`sun hue ${sun.h.toFixed(1)}° is ${(50 - sun.h).toFixed(0)}° clear of the yellow band`)
if (arc(sun.h, finance.h) < 10) fail(`sun is ${arc(sun.h, finance.h).toFixed(1)}° from Finance's gold — §2 bans gold here`)
else pass(`sun is ${arc(sun.h, finance.h).toFixed(1)}° from Finance's gold`)
if (sun.l > 45) fail(`sun lightness ${sun.l.toFixed(0)} is too pale for the takeover — it was 56 as an icon and the doc asks for depth`)
else pass(`sun lightness ${sun.l.toFixed(0)}, deep enough to carry the card`)

/* Check 6: rain's separation from Marketing is carried by lightness. */
const rain = hsl(GROUND.rain.bg)
const marketing = hsl(domain.marketing)
if (marketing.l - rain.l < 25)
  fail(`rain is only ${(marketing.l - rain.l).toFixed(0)} points darker than Marketing — it must stay dark`)
else pass(`rain is ${(marketing.l - rain.l).toFixed(0)} points darker than Marketing, ${arc(rain.h, marketing.h).toFixed(0)}° off its hue`)

/* Check 7: cloud must not read as the page's own paper. */
const cloud = hsl(GROUND.cloud.bg)
if (cloud.s > 10) fail(`cloud saturation ${cloud.s.toFixed(0)}% is above the 10% ceiling that keeps it off Finance`)
else pass(`cloud saturation ${cloud.s.toFixed(0)}%, at or under the 10% ceiling`)
const clay = hsl('#E4DBCB')
if (clay.l - cloud.l < 8)
  fail(`cloud is only ${(clay.l - cloud.l).toFixed(0)} points below clay — the card will read as a loading state`)
else pass(`cloud is ${(clay.l - cloud.l).toFixed(0)} points below clay, so the takeover reads as deliberate`)

/* Night must not be brand navy: §2 reserves navy for structure and action. */
const night = hsl(GROUND.night.bg)
const navy = hsl(ink.base)
if (arc(night.h, navy.h) < 10)
  fail(`night is ${arc(night.h, navy.h).toFixed(1)}° from Peregrine navy — it would read as brand chrome`)
else pass(`night is ${arc(night.h, navy.h).toFixed(1)}° from Peregrine navy`)

/* ------------------------------------------------------------------ *
 * The list-scale icons
 *
 * One rule, and it is the whole rule: an icon may move its ground's
 * LIGHTNESS as far as legibility needs, and may not move its HUE at all.
 * That is what keeps seven icons down the outlook from introducing a
 * seventh, eighth and ninth colour to a system with five grounds — and it
 * is checked here rather than by eye because a hue drifting four degrees
 * while someone tunes a swatch is invisible until it collides with a
 * department tone.
 * ------------------------------------------------------------------ */

console.log('\nList-scale icons — hue locked to the ground, lightness free\n')

/* The week list's real ground: the panel's translucent list surface over
   --pp-panel. Icons are graphical objects, so 3:1 is the threshold. */
const LIST_PAPER = over('#F8F2E7', 0.55, '#FBF8F2')

for (const [name, tone] of Object.entries(ICON_TONE)) {
  const g = GROUND[name as keyof typeof GROUND]
  const ground = hsl(g.bg)
  const fig = hsl(tone.fig)
  const shade = hsl(tone.shade)

  const dh = arc(fig.h, ground.h)
  if (dh > 2)
    fail(`${name} icon is ${dh.toFixed(1)}deg off its own ground's hue — icons move lightness, never hue`)
  else pass(`${name} icon holds hue ${fig.h.toFixed(1)}deg, its ground's own`)

  if (arc(shade.h, ground.h) > 2)
    fail(`${name} icon's second tone left the hue as well`)

  /* The shade band is painted over the body, so it has to be the darker of
     the two or the illustration reads lit from underneath. */
  if (shade.l >= fig.l) fail(`${name} icon's shade is not darker than its figure — the form will invert`)

  const c = contrast(tone.fig, LIST_PAPER)
  if (c < 3)
    fail(`${name} icon is ${c.toFixed(2)}:1 on the list paper, under the 3:1 graphical-object threshold`)
  else
    pass(`${name} icon ${c.toFixed(2)}:1 on list paper (ground l${ground.l.toFixed(0)} -> icon l${fig.l.toFixed(0)})`)

  /* Moving lightness must not walk the icon into a reserved hue that the
     ground itself was cleared of. Same test, run again at the new value. */
  for (const [who, hex] of Object.entries(RESERVED)) {
    const r = hsl(hex)
    if (arc(fig.h, r.h) < 10 && Math.abs(fig.l - r.l) < 12)
      fail(`${name} icon at l${fig.l.toFixed(0)} is now within reach of ${who}`)
  }
}

/* Cloud's saturation is load-bearing on the card; darkening the icon must
   not have quietly restored the saturation that keeps it off Finance. */
const cloudIcon = hsl(ICON_TONE.cloud.fig)
if (cloudIcon.s > 10)
  fail(`cloud icon saturation ${cloudIcon.s.toFixed(0)}% breaks the 10% ceiling its ground is held to`)
else pass(`cloud icon saturation ${cloudIcon.s.toFixed(0)}%, still achromatic`)

/* The sun icon is the one most likely to be "fixed" toward gold by eye. */
const sunIcon = hsl(ICON_TONE.sun.fig)
if (sunIcon.h >= 50 && sunIcon.h <= 65) fail(`sun icon hue ${sunIcon.h.toFixed(1)}deg is inside the yellow band`)
else if (arc(sunIcon.h, finance.h) < 10) fail(`sun icon has drifted onto Finance's gold`)
else pass(`sun icon hue ${sunIcon.h.toFixed(1)}deg, clear of yellow and of Finance`)

console.log(`\n${fails === 0 ? 'all checks pass' : `${fails} FAILED`}`)
process.exit(fails === 0 ? 0 : 1)
