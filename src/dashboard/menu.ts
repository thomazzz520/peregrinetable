import { CHANNELS, DAY_TOTAL, MIX, PAYMENTS } from './data'

/* ------------------------------------------------------------------ *
 * The menu, and what a campaign does to it
 *
 * This is the Menu system that the break-even line asked for twice and
 * that both times got deferred with a note. It is deliberately small:
 * a name, a price, a cost, and how many go out on a normal day. Nothing
 * else, because everything else is a different feature.
 *
 * WHAT IS REAL HERE AND WHAT IS NOT. The arithmetic is real: every figure
 * the campaign panel prints is computed from these items by the functions
 * below, and none of it is a number somebody typed into a card. The ITEMS
 * are authored, the way the rest of this demo's day is authored, and
 * `unitsPerDay` is a stated baseline rather than a measured one, because
 * nothing in this product counts units. What the calculator does with them
 * is honest; what they are is a plausible Tuesday at a South Yarra cafe.
 *
 * `unitsPerDay` is the fourth field on a "name, price, cost" model and it
 * is not padding: a margin calculator with no volume has nothing to
 * multiply, so a campaign could only ever report a per-unit figure. It is
 * the smallest addition that makes the rest of this work.
 *
 * The menu reconciles to the dashboard exactly. Units times price sums to
 * $1,267 of coffee, $677 of food and $240 of retail, which are `MIX`'s own
 * shares of `DAY_TOTAL` to the cent, so the menu and the revenue chart
 * cannot drift into disagreeing about the same day. `check:menu` asserts
 * it, because that is the kind of thing that silently rots.
 * ------------------------------------------------------------------ */

export type MenuCategory = 'Coffee' | 'Food' | 'Retail'

export type MenuItem = {
  id: string
  name: string
  /** For sentences that count them: "226 croissants". */
  plural: string
  category: MenuCategory
  /** What the guest pays. */
  price: number
  /** What it costs to put in front of them. Ingredients, not overhead:
   *  wages and rent are the day's costs, and live in `COSTS`. */
  cost: number
  /** Units on an ordinary day. A stated baseline, not a measurement. */
  unitsPerDay: number
}

export const MENU: MenuItem[] = [
  { id: 'flat-white', name: 'Flat white', plural: 'flat whites', category: 'Coffee', price: 4.8, cost: 1.35, unitsPerDay: 150 },
  { id: 'latte', name: 'Latte', plural: 'lattes', category: 'Coffee', price: 5.2, cost: 1.45, unitsPerDay: 60 },
  { id: 'long-black', name: 'Long black', plural: 'long blacks', category: 'Coffee', price: 4.4, cost: 1.15, unitsPerDay: 35 },
  { id: 'piccolo', name: 'Piccolo', plural: 'piccolos', category: 'Coffee', price: 3.0, cost: 0.95, unitsPerDay: 27 },

  { id: 'croissant', name: 'Croissant', plural: 'croissants', category: 'Food', price: 6.5, cost: 2.1, unitsPerDay: 40 },
  { id: 'banana-bread', name: 'Banana bread', plural: 'slices of banana bread', category: 'Food', price: 5.5, cost: 1.6, unitsPerDay: 30 },
  { id: 'bacon-egg-roll', name: 'Bacon and egg roll', plural: 'bacon and egg rolls', category: 'Food', price: 12.0, cost: 4.4, unitsPerDay: 18 },
  { id: 'sourdough', name: 'Sourdough toast', plural: 'rounds of sourdough', category: 'Food', price: 6.0, cost: 1.75, unitsPerDay: 6 },

  { id: 'beans-250', name: 'Beans, 250g', plural: 'bags of beans', category: 'Retail', price: 18.0, cost: 9.5, unitsPerDay: 10 },
  { id: 'keep-cup', name: 'Keep cup', plural: 'keep cups', category: 'Retail', price: 22.0, cost: 12.0, unitsPerDay: 2 },
  { id: 'chocolate', name: 'Chocolate bar', plural: 'chocolate bars', category: 'Retail', price: 4.0, cost: 1.5, unitsPerDay: 4 },
]

const round2 = (n: number) => Math.round(n * 100) / 100

/** Price less cost, per unit. */
export const unitMargin = (m: MenuItem) => round2(m.price - m.cost)
/** As a share of price. The number an owner argues about. */
export const marginPct = (m: MenuItem) => (m.price === 0 ? 0 : round2(((m.price - m.cost) / m.price) * 100))

/** What one item contributes on an ordinary day. */
export const itemDay = (m: MenuItem) => ({
  revenue: round2(m.price * m.unitsPerDay),
  cogs: round2(m.cost * m.unitsPerDay),
  margin: round2((m.price - m.cost) * m.unitsPerDay),
})

/** The whole menu's ordinary day. */
export function menuDay(menu: MenuItem[] = MENU) {
  return menu.reduce(
    (a, m) => {
      const d = itemDay(m)
      return { revenue: round2(a.revenue + d.revenue), cogs: round2(a.cogs + d.cogs), margin: round2(a.margin + d.margin) }
    },
    { revenue: 0, cogs: 0, margin: 0 },
  )
}

/** One category's ordinary day, for reconciling against `MIX`. */
export const categoryDay = (c: MenuCategory, menu: MenuItem[] = MENU) =>
  menuDay(menu.filter((m) => m.category === c))

/** What `MIX` says that category should be worth. The two must agree. */
export const mixTarget = (c: MenuCategory) => {
  const row = MIX.find((s) => s.name === c)
  return row ? round2((DAY_TOTAL * row.pct) / 100) : 0
}

/* ------------------------------------------------------------------ *
 * Campaigns
 * ------------------------------------------------------------------ */

/** Either a percentage off, or a price the item is set to. */
export type Discount =
  | { kind: 'percent'; pct: number }
  | { kind: 'price'; price: number }

export type Campaign = {
  id: string
  name: string
  /** What it runs on. Empty means the whole menu. */
  itemIds: string[]
  discount: Discount
  /**
   * How much more the owner expects to sell, as a percentage.
   *
   * AN INPUT, NOT A FORECAST. There is no demand model in this product and
   * this number is not predicted from anything: it is the owner's own
   * assumption, and the calculator's job is to say what that assumption is
   * worth, not to supply it. Demand forecasting is a separate piece of
   * work and deliberately not attempted here.
   */
  upliftPct: number
  /**
   * What the platform takes, as a percentage of promo revenue.
   *
   * Stubbed at 0 and held there. No deal platform is connected, so there
   * is no rate to read and inventing one would put a made-up number in the
   * middle of an otherwise real calculation. The term stays in the formula
   * so that wiring a platform later changes a value rather than a shape.
   */
  commissionPct: number
  note: string
}

export const CAMPAIGNS: Campaign[] = [
  {
    id: 'happy-hour',
    name: 'Happy hour',
    itemIds: ['flat-white', 'latte', 'long-black', 'piccolo'],
    discount: { kind: 'percent', pct: 20 },
    upliftPct: 50,
    commissionPct: 0,
    note: 'Twenty per cent off coffee after 2pm, when the room is quiet and the machine is on anyway.',
  },
  {
    id: 'pastry-wednesday',
    name: 'Pastry Wednesday',
    itemIds: ['croissant', 'banana-bread'],
    discount: { kind: 'price', price: 4.5 },
    upliftPct: 35,
    commissionPct: 0,
    note: 'One flat price on pastries through Wednesday, to move the counter before it goes stale.',
  },
]

export type CampaignResult = {
  /** Items the campaign actually touches. */
  scope: MenuItem[]
  /** The same items, left alone. */
  baseRevenue: number
  baseCogs: number
  baseMargin: number
  /** The same items, on promo, at the assumed uplift. */
  promoUnits: number
  promoRevenue: number
  promoCogs: number
  commission: number
  /** revenue less cost of goods less commission. */
  netMargin: number
  /** What the campaign changes, which is the number the decision turns on. */
  marginChange: number
  revenueChange: number
  /** The break-even uplift: how much more you must sell to not go backwards.
   *  Null when the discount cannot be recovered at any volume. */
  breakEvenUpliftPct: number | null
}

/** The promo price of one item under one discount. Never below zero. */
export function promoPrice(item: MenuItem, d: Discount) {
  const p = d.kind === 'percent' ? item.price * (1 - d.pct / 100) : d.price
  return round2(Math.max(0, p))
}

/**
 * What a campaign is worth.
 *
 *   revenue at promo pricing
 *     less cost of goods on the units actually sold
 *     less platform commission
 *   = net margin
 *
 * and then the only figure that decides anything: that net margin against
 * the margin those same items would have made left alone.
 */
export function campaignMargin(c: Campaign, menu: MenuItem[] = MENU): CampaignResult {
  const scope = c.itemIds.length ? menu.filter((m) => c.itemIds.includes(m.id)) : menu

  let baseRevenue = 0, baseCogs = 0, promoUnits = 0, promoRevenue = 0, promoCogs = 0
  for (const m of scope) {
    const units = Math.round(m.unitsPerDay * (1 + c.upliftPct / 100))
    baseRevenue += m.price * m.unitsPerDay
    baseCogs += m.cost * m.unitsPerDay
    promoUnits += units
    promoRevenue += promoPrice(m, c.discount) * units
    promoCogs += m.cost * units
  }
  const commission = round2(promoRevenue * (c.commissionPct / 100))
  const netMargin = round2(promoRevenue - promoCogs - commission)
  const baseMargin = round2(baseRevenue - baseCogs)

  return {
    scope,
    baseRevenue: round2(baseRevenue),
    baseCogs: round2(baseCogs),
    baseMargin,
    promoUnits,
    promoRevenue: round2(promoRevenue),
    promoCogs: round2(promoCogs),
    commission,
    netMargin,
    marginChange: round2(netMargin - baseMargin),
    revenueChange: round2(promoRevenue - baseRevenue),
    breakEvenUpliftPct: breakEvenUplift(c, menu),
  }
}

/**
 * How much more you have to sell for the discount to pay for itself.
 *
 * Solved rather than searched: at uplift u, margin is
 * `baseUnits x (1 + u) x (promoPrice - cost - promoPrice x commission)`,
 * and setting that equal to the untouched margin gives
 * `1 + u = baseMargin / promoUnitMargin`. If a unit loses money on promo
 * there is no volume that fixes it, and the answer is null rather than a
 * large number.
 */
export function breakEvenUplift(c: Campaign, menu: MenuItem[] = MENU): number | null {
  const scope = c.itemIds.length ? menu.filter((m) => c.itemIds.includes(m.id)) : menu
  let baseMargin = 0, promoUnitMargin = 0
  for (const m of scope) {
    baseMargin += (m.price - m.cost) * m.unitsPerDay
    const p = promoPrice(m, c.discount)
    promoUnitMargin += (p - m.cost - p * (c.commissionPct / 100)) * m.unitsPerDay
  }
  if (promoUnitMargin <= 0) return null
  return round2((baseMargin / promoUnitMargin - 1) * 100)
}

/* ------------------------------------------------------------------ *
 * Deal platforms
 *
 * None of these is connected, and the product has no integration with any
 * of them: no client, no credentials, no sync. They are listed because a
 * campaign is the thing you would push to them, and a list that says "not
 * connected" tells the owner more than no list at all. §11 rule 14.
 *
 * `commissionPct` is what each platform is generally understood to take.
 * It is NOT read from anywhere and nothing calculates with it: the
 * campaign calculator holds commission at zero until a real rate arrives
 * from a real connection. It sits here as the shape the data will have.
 * ------------------------------------------------------------------ */

export type DealPlatform = { id: string; name: string; what: string; connected: boolean }

export const DEAL_PLATFORMS: DealPlatform[] = [
  { id: 'eatclub', name: 'EatClub', what: 'Last-minute table deals', connected: false },
  { id: 'doordash-deals', name: 'DoorDash Deals', what: 'Promoted offers in the app', connected: false },
  { id: 'tgtg', name: 'Too Good To Go', what: 'End-of-day surplus bags', connected: false },
]

export const DEALS_ARE_WIRED = DEAL_PLATFORMS.some((p) => p.connected)


/* ------------------------------------------------------------------ *
 * Break-even, in something you can picture
 *
 * This asked for a Menu twice and was stubbed twice, with a hardcoded
 * croissant and a note saying so. The Menu exists now, so the stub goes:
 * the item is looked up by id, its price is the menu's price, and editing
 * that price in the panel above moves this sentence.
 * ------------------------------------------------------------------ */

/** True now that a Menu exists for it to read. */
export const MENU_IS_WIRED = true

/** Which item the break-even line counts in. A menu id, not a literal. */
export const BREAKEVEN_ITEM_ID = 'croissant'

export type Perspective = { eyebrow: string; line: string; foot: string }

const money0 = (n: number) => '$' + Math.round(n).toLocaleString()

/**
 * The same figure said three ways, one per breakdown.
 *
 * Each dimension gets the translation that suits it rather than the same
 * sentence with the nouns swapped: a category reader is thinking in menu
 * items, a channel reader in who takes a cut, a payment reader in what has
 * to be counted at the end of the night.
 */
export const perspectiveFor = (
  dim: 'category' | 'channel' | 'payment',
  costTotal: number,
  dayTotal: number,
  menu: MenuItem[] = MENU,
): Perspective => {
  if (dim === 'category') {
    const item = menu.find((m) => m.id === BREAKEVEN_ITEM_ID) ?? menu[0]
    if (!item) {
      return { eyebrow: 'In menu items', line: 'The menu is empty, so there is nothing to count the day in.', foot: 'Add an item above.' }
    }
    const n = Math.ceil(costTotal / item.price)
    /* Margin, not price, is what actually covers a cost. Both are shown
       because the first is the sentence people expect and the second is
       the one that is true. */
    const atMargin = Math.ceil(costTotal / Math.max(0.01, unitMargin(item)))
    return {
      eyebrow: `In ${item.plural}`,
      line: `About ${n} ${item.plural} at ${'$' + item.price.toFixed(2)} covers the day before anything is kept.`,
      foot: `That counts the whole price. On margin alone, at ${'$' + unitMargin(item).toFixed(2)} an item, it takes ${atMargin}. Priced from your menu.`,
    }
  }
  if (dim === 'channel') {
    const till = Math.round((CHANNELS[0]!.pct / 100) * dayTotal)
    const apps = dayTotal - till
    return {
      eyebrow: 'In who takes a cut',
      line: `${CHANNELS[0]!.pct}% came through your own till, ${money0(till)}. The delivery apps carried ${money0(apps)} and charge on all of it.`,
      foot: 'Commission rates are not modelled here, so no fee is deducted from that figure.',
    }
  }
  const cash = Math.round((PAYMENTS[1]!.pct / 100) * dayTotal)
  return {
    eyebrow: 'In what you count',
    line: `${money0(cash)} of today came in as cash, so that is what is in the drawer to count, bank and reconcile.`,
    foot: 'Card settles on its own; cash is the part that costs you time after close.',
  }
}
