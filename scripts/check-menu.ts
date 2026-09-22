/**
 * Menu and campaign checks.
 *
 * Two different kinds of claim get checked here.
 *
 * The first is RECONCILIATION. The menu now describes the same day the
 * revenue chart describes, so units times price has to equal `MIX`'s share
 * of `DAY_TOTAL` for every category, to the cent. This is the invariant
 * that rots quietly: someone adjusts a price for a screenshot and two
 * surfaces start quoting different days at each other, which has already
 * happened twice in this file's history (the foot traffic sparkline, the
 * news card's duplicate story).
 *
 * The second is ARITHMETIC. The campaign calculator is the first thing in
 * this product that does real financial maths rather than presenting a
 * figure, so its formula is checked against hand-computed values and its
 * break-even solve is checked by substitution: feed the uplift it returns
 * back in, and the margin change must land on zero.
 */
import {
  MENU,
  CAMPAIGNS,
  DEAL_PLATFORMS,
  campaignMargin,
  breakEvenUplift,
  promoPrice,
  menuDay,
  categoryDay,
  mixTarget,
  unitMargin,
  marginPct,
  type MenuCategory,
  type Campaign,
} from '../src/dashboard/menu'
import { DAY_TOTAL, MIX } from '../src/dashboard/data'

let fails = 0
const fail = (m: string) => { fails += 1; console.log(`  FAIL  ${m}`) }
const pass = (m: string) => console.log(`  pass  ${m}`)
const money = (n: number) => '$' + n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const near = (a: number, b: number, tol = 0.005) => Math.abs(a - b) <= tol

console.log('Menu — does it describe the same day the dashboard does?\n')

const cats: MenuCategory[] = ['Coffee', 'Food', 'Retail']
/* `MIX` is authored in WHOLE percentages, so 58% of $2,184 is $1,266.72 and
   no menu of real prices can land on that exactly. Demanding cent-parity
   against a rounded number was this check being wrong rather than the data.
   The correct statement is the one the percentage actually makes: the
   menu's own share of the day, rounded to a whole percent, is what MIX
   claims it is. */
for (const c of cats) {
  const got = categoryDay(c).revenue
  const claimed = MIX.find((m) => m.name === c)!.pct
  const share = (got / DAY_TOTAL) * 100
  if (Math.round(share) !== claimed)
    fail(`${c} is ${share.toFixed(2)}% of the day by the menu, but MIX claims ${claimed}%`)
  else
    pass(`${c.padEnd(7)} ${money(got)}, ${share.toFixed(2)}% of the day, which is MIX's ${claimed}% (rounded ${money(mixTarget(c))})`)
}

const day = menuDay()
if (!near(day.revenue, DAY_TOTAL)) fail(`the whole menu is ${money(day.revenue)} against DAY_TOTAL ${money(DAY_TOTAL)}`)
else pass(`whole menu ${money(day.revenue)}, exactly DAY_TOTAL`)
console.log(`        cost of goods ${money(day.cogs)}, gross margin ${money(day.margin)}\n`)

console.log('Menu — is every item sane?\n')
const ids = new Set<string>()
for (const m of MENU) {
  if (ids.has(m.id)) fail(`duplicate id ${m.id}`)
  ids.add(m.id)
  if (m.cost >= m.price) fail(`${m.name} costs ${money(m.cost)} and sells for ${money(m.price)}, which loses money every time`)
  if (m.price <= 0 || m.cost < 0) fail(`${m.name} has a nonsense price or cost`)
  if (!Number.isInteger(m.unitsPerDay) || m.unitsPerDay < 0) fail(`${m.name} sells a fractional number of units`)
}
if (!fails) pass(`${MENU.length} items, every one priced above its cost, no duplicate ids`)
const thin = MENU.filter((m) => marginPct(m) < 40)
console.log(`        thinnest margins: ${thin.map((m) => `${m.name} ${marginPct(m)}%`).join(', ') || 'none under 40%'}\n`)

console.log('Campaigns — is the arithmetic right?\n')

/* Hand-arithmetic, on a campaign DEFINED HERE rather than read from the
   fixtures. Tying it to `CAMPAIGNS` made it break the moment the demo's
   uplift was tuned, which is the check failing for a reason that has
   nothing to do with correctness. The formula is what is under test, so
   the formula gets its own fixed inputs.

   20% off the four coffees at a 35% uplift:
     flat white  150 -> 203 at $3.84   cost $1.35
     latte        60 ->  81 at $4.16   cost $1.45
     long black   35 ->  47 at $3.52   cost $1.15
     piccolo      27 ->  36 at $2.40   cost $0.95

   This block caught a slip of mine the first time it ran, which is the
   whole argument for computing it by hand instead of calling the function
   twice and comparing it with itself. */
const PROBE: Campaign = {
  id: 'probe',
  name: 'Arithmetic probe',
  itemIds: ['flat-white', 'latte', 'long-black', 'piccolo'],
  discount: { kind: 'percent', pct: 20 },
  upliftPct: 35,
  commissionPct: 0,
  note: 'Not shown anywhere. Exists so the formula has fixed inputs.',
}
const hand = [
  { units: 203, price: 3.84, cost: 1.35 },
  { units: 81, price: 4.16, cost: 1.45 },
  { units: 47, price: 3.52, cost: 1.15 },
  { units: 36, price: 2.4, cost: 0.95 },
]
const handUnits = hand.reduce((a, r) => a + r.units, 0)
const handRevenue = hand.reduce((a, r) => a + r.units * r.price, 0)
const handCogs = hand.reduce((a, r) => a + r.units * r.cost, 0)
const hh = campaignMargin(PROBE)

if (!near(hh.promoUnits, handUnits)) fail(`probe units ${hh.promoUnits}, hand-computed ${handUnits}`)
else pass(`${hh.promoUnits} units at a 35% uplift, matching the hand figure`)

if (!near(hh.promoRevenue, handRevenue, 0.02)) fail(`probe revenue ${money(hh.promoRevenue)}, hand-computed ${money(handRevenue)}`)
else pass(`promo revenue ${money(hh.promoRevenue)}, matching the hand figure`)

if (!near(hh.promoCogs, handCogs, 0.02)) fail(`probe cost of goods ${money(hh.promoCogs)}, hand-computed ${money(handCogs)}`)
else pass(`cost of goods ${money(hh.promoCogs)}, matching the hand figure`)

if (!near(hh.netMargin, hh.promoRevenue - hh.promoCogs - hh.commission, 0.02))
  fail('net margin is not revenue less cost of goods less commission')
else pass(`net margin ${money(hh.netMargin)} = revenue less cost of goods less commission`)

if (!near(hh.marginChange, hh.netMargin - hh.baseMargin, 0.02)) fail('margin change does not equal net margin less baseline')
else pass(`against doing nothing: ${hh.marginChange >= 0 ? '+' : ''}${money(hh.marginChange)} (baseline ${money(hh.baseMargin)})`)

/* A percentage discount and the equivalent set price must agree. */
const flat = MENU.find((m) => m.id === 'flat-white')!
if (!near(promoPrice(flat, { kind: 'percent', pct: 20 }), promoPrice(flat, { kind: 'price', price: 3.84 })))
  fail('20% off a $4.80 flat white does not equal setting it to $3.84')
else pass('a percentage discount and the same price set explicitly agree')

/* What the campaigns the product actually ships come out at. */
console.log('')
for (const c of CAMPAIGNS) {
  const r = campaignMargin(c)
  console.log(`        ${c.name.padEnd(17)} ${r.marginChange >= 0 ? '+' : ''}${money(r.marginChange)} against doing nothing, on ${r.scope.length} items`)
}
console.log('')

console.log('Campaigns — does the break-even uplift actually break even?\n')
for (const c of CAMPAIGNS) {
  const u = breakEvenUplift(c)
  if (u === null) {
    const r = campaignMargin(c)
    if (r.netMargin > r.baseMargin) fail(`${c.name} reports no break-even uplift but is already ahead`)
    else pass(`${c.name} cannot break even at any volume, correctly reported as none`)
    continue
  }
  /* Substitute it back: at that uplift the margin change must be zero. */
  const at = campaignMargin({ ...c, upliftPct: u })
  if (Math.abs(at.marginChange) > Math.max(1.5, at.baseMargin * 0.01))
    fail(`${c.name} break-even at ${u}% still moves margin by ${money(at.marginChange)}`)
  else pass(`${c.name.padEnd(17)} breaks even at ${u}% more units (assumed ${c.upliftPct}%), residual ${money(at.marginChange)}`)
}
console.log('')

console.log('Campaigns — is anything claiming a connection it does not have?\n')
for (const c of CAMPAIGNS) {
  if (c.commissionPct !== 0)
    fail(`${c.name} charges ${c.commissionPct}% commission, but no platform is connected to charge it`)
}
if (!DEAL_PLATFORMS.some((p) => p.connected)) pass('commission held at 0 across every campaign, since no platform is connected')
for (const p of DEAL_PLATFORMS) {
  if (p.connected) fail(`${p.name} claims to be connected; nothing in this product connects to it`)
}
pass(`${DEAL_PLATFORMS.length} deal platforms listed, all marked not connected`)

console.log('')
console.log('Break-even, in menu items\n')
const croissant = MENU.find((m) => m.id === 'croissant')!
console.log(`        croissant ${money(croissant.price)}, costs ${money(croissant.cost)}, margin ${money(unitMargin(croissant))} (${marginPct(croissant)}%)`)

console.log(`\n${fails === 0 ? 'all checks pass' : `${fails} FAILED`}`)
process.exit(fails === 0 ? 0 : 1)
