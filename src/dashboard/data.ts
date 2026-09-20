/**
 * The venue's day, as the dashboard reports it.
 *
 * Ported from the standalone desktop demo. Still fixture data: the numbers
 * belong to The Peacock's demo day and nothing here talks to a till yet.
 * Bookings are the exception — those come from the real diary through
 * `src/data`, which is why they live nowhere near this file.
 */

export type Slice = { name: string; pct: number; color: string }

/**
 * The series palette: five muted tones, and no saturated primaries.
 *
 * What was here was the standalone demo's chart colours, kept on the
 * argument that "those wash a whole platform, these have to carry a bar
 * chart on white". Measured, three of them broke rules this product states
 * outright:
 *
 *   #F5B942  h39.9 s90%  — 0.8deg from Finance's LOCKED GOLD GROUND. §2 bans
 *                          yellow "anywhere, in any form" and names gold in
 *                          the same sentence. It was in four places.
 *   #FF6F5E  h6.3  s100% — red. `theme.css`: "there is still no red
 *   #FF8A65  h14.4 s100%   anywhere: nothing here is an emergency."
 *   #5B8CFF  h222  s100% — 8.9deg from Marketing's ground, at full chroma.
 *   #B39DDB  h261         — violet. The change log records the sixth token,
 *                          "a violet that belonged to Booking's old plate",
 *                          as DELETED rather than left for someone to reach
 *                          for later. It also lands 5.4deg from the news
 *                          `award` ground.
 *
 * These five replace them. Colour-coding stays, because a three-way legend
 * genuinely needs it and that exemption is the same one the weather grounds
 * and the department tones already hold. What does not stay is the chroma.
 * Every tone here is muted into the paper-toned family, every one clears
 * 3:1 on paper as a graphical object, the closest pair is 40 RGB units
 * apart, and the two that sit near a reserved hue are achromatic enough
 * (s<=13%) that saturation separates them, which is the same argument
 * `cloud` uses against Finance.
 *
 * `stone` leads every breakdown deliberately: the largest slice takes the
 * NEUTRAL, so the colour that remains is spent on the smaller things a
 * reader actually has to pick out.
 */
/**
 * How the segments get their edges.
 *
 * A stacked segment needs a boundary against the one beside it. That comes
 * either from the TONES (a luminance step) or from the CHART (a hairline
 * drawn between them). It cannot come from the tones here, and that is
 * arithmetic rather than preference: every tone must clear 3:1 against a
 * near-white card, which caps the brightest at luminance 0.272, and a
 * five-step 1.6:1 ladder under that ceiling drives the last tone past black.
 * Bright and self-separating cannot both hold with five tones.
 *
 * So the chart draws the edge. `check:series` does not drop the requirement,
 * it moves it: every tone must clear 3:1 against the SEPARATOR's own colour,
 * which is what keeps the hairline visible along both of its neighbours. The
 * tone-to-tone figures are still printed, as information.
 */
export const SEG_SEPARATOR = true

/**
 * The series palette, drawn inside the warm band as Section 2 now scopes it.
 *
 * These were achromatic greys and browns, because the warm band looked fully
 * occupied and every attempt at a warm tone was pushed out of it. The band
 * was not occupied. Of its four warm neighbours only Finance's gold and
 * Roster are Tier 1 and reserve product-wide, and both are PALE, at lightness
 * 68 and 72. The weather sun and cloud grounds and foot traffic's gradient
 * are Tier 2, scoped to their own cards by the same Section 10 exception that
 * created them. See "Scope of a reservation" in `.antigravity.md`.
 *
 * So hues 20 to 37 at mid lightness were free the whole time, and that is
 * where Coffee and Retail now sit:
 *
 *   Coffee  #9A6B3C  h30.0 s44 l42  caramel, 11deg off Finance and 26 below it
 *   Food    #849339  h70.0 s44 l40  olive, 4deg clear of the yellow corridor
 *   Retail  #AB602B  h24.8 s60 l42  terracotta, saturated rather than dusty
 *
 * Food's lightness is capped by the 3:1 floor, not by a reservation: olive
 * carries most of its luminance in the green channel, so it hits the contrast
 * limit against pale paper at about lightness 40 while still looking bright.
 */
export const SERIES = {
  stone: '#9A6B3C',
  moss: '#849339',
  mauve: '#AB602B',
  rose: '#AC825D',
  slate: '#66793E',
} as const

export const MIX: Slice[] = [
  { name: 'Coffee', pct: 58, color: SERIES.stone },
  { name: 'Food', pct: 31, color: SERIES.moss },
  { name: 'Retail', pct: 11, color: SERIES.mauve },
]

/** Takings by hour, 6am to 5pm, as a share of the busiest hour. */
export const HOURS = ['6a', '7a', '8a', '9a', '10a', '11a', '12p', '1p', '2p', '3p', '4p', '5p']
export const HOUR_SHARE = [18, 32, 48, 66, 84, 100, 90, 76, 64, 50, 34, 20]
export const DAY_TOTAL = 2184

const shareSum = HOUR_SHARE.reduce((a, b) => a + b, 0)

/**
 * Today's takings by hour, in dollars, summing EXACTLY to `DAY_TOTAL`.
 *
 * Rounding each hour independently left the twelve at $2,183 against a
 * headline of $2,184. Invisible while nothing printed the hours, and wrong
 * the moment the chart's tooltip does. Largest remainder puts the missing
 * cent-rounding back on the hours that lost the most to it.
 */
export const HOUR_DOLLARS = (() => {
  const exact = HOUR_SHARE.map((h) => (DAY_TOTAL * h) / shareSum)
  const out = exact.map(Math.floor)
  let short = DAY_TOTAL - out.reduce((a, b) => a + b, 0)
  const order = exact
    .map((v, i) => ({ i, rem: v - Math.floor(v) }))
    .sort((a, b) => b.rem - a.rem)
  for (const { i } of order) {
    if (short <= 0) break
    out[i] += 1
    short -= 1
  }
  return out
})()

/**
 * The same twelve hours a week ago, on HOUR_SHARE's own basis so the revenue
 * card can put today against a comparison without a second scale. This is the
 * only series on that card allowed to be neutral grey — and the only one that
 * has to be, since colour there is rationed to today (design doc, dashboard
 * top row — revenue).
 */
export const HOUR_SHARE_PRIOR = [15, 28, 44, 58, 76, 92, 86, 74, 58, 44, 30, 17]

export const REVENUE_TREND = { pct: 6.2, up: true, against: 'last Tue' }
export const REVENUE_RANGES = ['Today', 'Week', 'Month'] as const
export type RevenueRange = (typeof REVENUE_RANGES)[number]

/**
 * Which of those ranges there is actually a series behind.
 *
 * Only today is broken down: HOUR_SHARE against HOUR_SHARE_PRIOR, twelve
 * hours, one demo day. Nothing in this file carries a week or a month, so
 * the card renders those two pills disabled rather than letting them be
 * pressed and change nothing. Add the series and add the name here — the
 * card reads this list and needs no other change.
 */
export const REVENUE_RANGES_AVAILABLE: readonly RevenueRange[] = ['Today']

/* ------------------------------------------------------------------ *
 * Reviews
 *
 * NO PLATFORM IS CONNECTED. Not Uber Eats, not DoorDash, not TripAdvisor,
 * not Instagram, AND NOT GOOGLE. The card used to show one hardcoded Google
 * review, which read as a live feed and was not one: the only network calls
 * in this product are the booking adapter, a typeface fetch and the server's
 * KV store. Every review below was written for this demo.
 *
 * What a real integration needs, per platform: an OAuth app and approval,
 * an API client, rate-limit handling, a store to sync into and a job to
 * sync on. Five platforms, five times over. That is its own project.
 *
 * ONE SOURCE OF TRUTH. Every rating and count in the product is derived
 * from this corpus by the helpers below. Nothing restates a figure. The
 * venue's rating used to be asserted separately in `CONTACTS` and again in
 * the brain's Marketing panel, which is three numbers free to drift, and
 * this file has already been bitten twice by exactly that (the foot traffic
 * sparkline, and the news card's duplicate of one story).
 * ------------------------------------------------------------------ */

export const REVIEWS_ARE_LIVE = false

export type ReviewSourceId = 'google' | 'ubereats' | 'doordash' | 'tripadvisor' | 'instagram'

export type Review = {
  stars: number
  text: string
  who: string
  /** Days ago. Drives ordering and the trend comparison. */
  ago: number
}

export const REVIEW_SOURCES: { id: ReviewSourceId; label: string }[] = [
  { id: 'google', label: 'Google' },
  { id: 'ubereats', label: 'Uber Eats' },
  { id: 'doordash', label: 'DoorDash' },
  { id: 'tripadvisor', label: 'TripAdvisor' },
  { id: 'instagram', label: 'Instagram' },
]

export const REVIEWS: Record<ReviewSourceId, Review[]> = {
  google: [
    { stars: 5, ago: 0, who: 'Maddie R.', text: 'Best flat white on the street, and they remembered my order.' },
    { stars: 5, ago: 2, who: 'Tom H.', text: 'The staff remembered my order from last week. Flat white was excellent again.' },
    { stars: 4, ago: 4, who: 'Priya N.', text: 'Lovely courtyard and a very good flat white. Long wait on a Saturday though.' },
    { stars: 5, ago: 6, who: 'Jen W.', text: 'Staff are genuinely warm. Coffee is consistently good.' },
    { stars: 3, ago: 9, who: 'Dan K.', text: 'Coffee is good but the wait on weekends is getting silly. Twenty minutes for two coffees.' },
    { stars: 5, ago: 12, who: 'Alice B.', text: 'Flat white is the best in South Yarra. The staff know regulars by name.' },
    { stars: 4, ago: 15, who: 'Marco P.', text: 'Good coffee and a nice courtyard. Wait was a bit long mid morning.' },
    { stars: 5, ago: 19, who: 'Sana I.', text: 'They remembered my order and had it ready. Wonderful staff.' },
    { stars: 3, ago: 23, who: 'Rhys T.', text: 'Fine coffee, but the weekend wait put me off coming back soon.' },
    { stars: 5, ago: 27, who: 'Elena V.', text: 'Consistently excellent flat white and the courtyard is a treat.' },
  ],
  ubereats: [
    { stars: 4, ago: 1, who: 'Order #4471', text: 'Coffee arrived hot and the packaging held up well.' },
    { stars: 5, ago: 3, who: 'Order #4418', text: 'Packaging was excellent, nothing spilled. Pastry still warm.' },
    { stars: 2, ago: 5, who: 'Order #4390', text: 'Missing item again. Ordered two pastries and one arrived.' },
    { stars: 4, ago: 8, who: 'Order #4352', text: 'Arrived hot, good packaging. Driver was quick.' },
    { stars: 3, ago: 11, who: 'Order #4310', text: 'Missing item from the order. Coffee itself was good.' },
    { stars: 5, ago: 14, who: 'Order #4277', text: 'Everything arrived hot and the packaging was spill proof.' },
    { stars: 2, ago: 18, who: 'Order #4231', text: 'Missing item, and no way to flag it easily.' },
    { stars: 4, ago: 22, who: 'Order #4180', text: 'Good packaging, arrived hot. Would order again.' },
  ],
  doordash: [
    { stars: 4, ago: 2, who: 'Order #8812', text: 'Arrived quickly and the coffee was still hot.' },
    { stars: 2, ago: 4, who: 'Order #8770', text: 'Coffee arrived cold. Long delivery time.' },
    { stars: 5, ago: 7, who: 'Order #8731', text: 'Fast delivery and the pastry was excellent.' },
    { stars: 3, ago: 10, who: 'Order #8699', text: 'Cold by the time it arrived. Long delivery on a wet day.' },
    { stars: 4, ago: 13, who: 'Order #8650', text: 'Good pastry, arrived hot enough. Delivery was fast.' },
    { stars: 2, ago: 17, who: 'Order #8601', text: 'Arrived cold again. The food itself is good when it is hot.' },
    { stars: 5, ago: 21, who: 'Order #8544', text: 'Quick delivery, everything hot, pastry excellent.' },
    { stars: 3, ago: 25, who: 'Order #8490', text: 'Long delivery time but the coffee was fine.' },
  ],
  tripadvisor: [
    { stars: 5, ago: 3, who: 'Wanderer_88', text: 'The courtyard is a lovely spot for breakfast. Excellent service.' },
    { stars: 4, ago: 6, who: 'JBTravels', text: 'Good breakfast and a charming courtyard. A little pricey.' },
    { stars: 5, ago: 9, who: 'Kate_Melb', text: 'Breakfast was excellent and the courtyard is a hidden gem.' },
    { stars: 3, ago: 13, who: 'Ronan_D', text: 'Pricey for what it is, though the courtyard is lovely.' },
    { stars: 5, ago: 16, who: 'SofiaG', text: 'Wonderful breakfast, attentive service, beautiful courtyard.' },
    { stars: 4, ago: 20, who: 'PeterWL', text: 'Service was excellent. Slightly pricey but worth it for breakfast.' },
    { stars: 5, ago: 24, who: 'Amara_K', text: 'The courtyard and the breakfast both live up to the reviews.' },
    { stars: 3, ago: 29, who: 'TravelBug_R', text: 'Nice enough, a bit pricey, courtyard was full when we came.' },
  ],
  instagram: [
    { stars: 5, ago: 1, who: '@melbcoffeeruns', text: 'The pastry display alone is worth the visit. Beautiful room.' },
    { stars: 5, ago: 4, who: '@sy_eats', text: 'Beautiful room and the pastry selection is excellent.' },
    { stars: 4, ago: 7, who: '@chapelstfood', text: 'Gorgeous pastry counter. The queue moves slowly though.' },
    { stars: 5, ago: 11, who: '@flatwhitediary', text: 'Beautiful room, great light, excellent pastry.' },
    { stars: 3, ago: 14, who: '@brunchbandit', text: 'The queue was out the door. Pastry was worth it in the end.' },
    { stars: 5, ago: 18, who: '@mel_mornings', text: 'Pastry counter is a work of art and the room is beautiful.' },
    { stars: 4, ago: 22, who: '@southyarrabites', text: 'Lovely room, excellent pastry, long queue at peak.' },
    { stars: 5, ago: 26, who: '@coffee_cartel', text: 'Beautiful space. The pastry is the reason I keep coming back.' },
  ],
}

const round1 = (n: number) => Math.round(n * 10) / 10

/** Rating and count for one source, computed from its reviews. */
export const ratingFor = (id: ReviewSourceId) => {
  const rs = REVIEWS[id]
  return { stars: round1(rs.reduce((a, r) => a + r.stars, 0) / rs.length), count: rs.length }
}

/** Rating and count across every source. The venue's headline figure. */
export const overallRating = () => {
  const all = REVIEW_SOURCES.flatMap((s) => REVIEWS[s.id])
  return { stars: round1(all.reduce((a, r) => a + r.stars, 0) / all.length), count: all.length }
}

/**
 * Which way the rating is moving, computed rather than asserted: the newer
 * half of the corpus against the older half, by `ago`.
 */
export const ratingTrend = (id?: ReviewSourceId) => {
  const all = (id ? REVIEWS[id] : REVIEW_SOURCES.flatMap((s) => REVIEWS[s.id])).slice().sort((a, b) => a.ago - b.ago)
  const half = Math.floor(all.length / 2)
  const mean = (xs: Review[]) => xs.reduce((a, r) => a + r.stars, 0) / (xs.length || 1)
  const recent = mean(all.slice(0, half))
  const older = mean(all.slice(half))
  const delta = round1(recent - older)
  return { delta, up: delta >= 0, recent: round1(recent), older: round1(older), half }
}

/** The newest review anywhere, for the collapsed card. */
export const latestReview = () => {
  let best: { review: Review; source: string } | null = null
  for (const s of REVIEW_SOURCES)
    for (const r of REVIEWS[s.id])
      if (!best || r.ago < best.review.ago) best = { review: r, source: s.label }
  return best!
}

/* ------------------------------------------------------------------ *
 * What the reviews keep saying
 *
 * This COUNTS, it does not summarise. There is no sentiment model and no
 * language model anywhere in this product, so the honest version of "most
 * mentioned" is the one that can be checked by hand: strip the filler
 * words, count what is left across the reviews on screen, and report the
 * phrases that actually recur with the number of times they do.
 *
 * A theme has to appear at least twice to count as recurring. If nothing
 * does, the panel says so rather than inventing a theme, and the caption
 * always names the corpus it counted, because these are example reviews and
 * a count over example reviews is a fact about the example.
 *
 * The same function runs unchanged over a real feed.
 * ------------------------------------------------------------------ */

const STOP = new Set(('a an and the is was are were be been being of to in on at for with from by it its this that these those i my we our you your they them their he she his her ' +
  'but or if then than so as not no nor too very just really quite bit little much more most some any all again back out up down over under here there when while ' +
  'have has had do does did done get got go goes went come came would could should will can may might must ' +
  'me us him one two three what which who whom about into through during before after above below off again once').split(' '))

const words = (t: string) =>
  t.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w))

/** Phrases that recur, with their counts, over a set of reviews. */
function themes(rs: Review[], top = 3) {
  const counts = new Map<string, number>()
  for (const r of rs) {
    const ws = words(r.text)
    const seen = new Set<string>()
    /* Unigrams and bigrams, each counted once per review so one wordy
       reviewer cannot invent a theme on their own. */
    for (let i = 0; i < ws.length; i += 1) {
      for (const g of [ws[i]!, i + 1 < ws.length ? `${ws[i]} ${ws[i + 1]}` : '']) {
        if (!g || seen.has(g)) continue
        seen.add(g)
        counts.set(g, (counts.get(g) ?? 0) + 1)
      }
    }
  }
  /* Drop a unigram when a bigram containing it is just as common: "flat
     white" is the theme, "flat" on its own is the same reviews counted
     again. */
  const out = [...counts.entries()].filter(([g, n]) => {
    if (n < 2) return false
    if (g.includes(' ')) return true
    return ![...counts.entries()].some(([o, m]) => o !== g && o.includes(' ') && o.split(' ').includes(g) && m >= n)
  })
  out.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  return out.slice(0, top).map(([phrase, n]) => ({ phrase, n }))
}

/**
 * What each half of the ratings keeps mentioning, for one source.
 *
 * Note the names: `high` and `low`, not "praised" and "flagged". The
 * function counts MENTIONS, and mentions are not sentiment. TripAdvisor's
 * three-star reviews mention the courtyard twice, favourably both times,
 * and calling that "most flagged" would put a compliment under a complaint
 * heading. The panel labels these by the star band they come from, which is
 * exactly what was measured and needs no model to be true.
 */
export const mentionsFor = (id: ReviewSourceId) => {
  const rs = REVIEWS[id]
  const praised = rs.filter((r) => r.stars >= 4)
  const flagged = rs.filter((r) => r.stars <= 3)
  return {
    high: themes(praised),
    low: themes(flagged),
    highFrom: praised.length,
    lowFrom: flagged.length,
    total: rs.length,
  }
}

/** The glance card's three tabs. */
export const GLANCE = {
  weather: {
    label: 'Weather',
    big: '18°C',
    tag: 'Cloudy',
    sub: 'Overcast through the day, no rain expected.',
  },
  traffic: {
    label: 'Foot traffic',
    big: 'Busy',
    tag: '+18% vs usual Tue',
    sub: "Forecast from foot traffic near you and last month's covers.",
  },
  news: {
    label: 'News',
  },
} as const

export type GlanceKey = keyof typeof GLANCE

/**
 * A rotating set of things the brain noticed — a plain stat some of the
 * time, a concrete thing to try the rest. Interchangeable so it doesn't
 * read as one fixed caption.
 */
export const INSIGHTS = [
  'Coffee sales are up **4%** compared to last week',
  'Try: **$1 off** for a reusable cup, it could lift return visits',
  "Food mix has held steady around **31%** for three weeks running",
  'Try: bundle a pastry with the 8–10am rush, coffee-only orders are up',
  'Saturdays are outperforming weekdays by **18%** this month',
]

/** What is waiting on the owner. Mirrors the agents flagged in the brain. */
export type Task = {
  id: string
  who: string
  dept: string
  ask: string
  trail: { time: string; note: string }[]
  cta: string
}

export const TASKS: Task[] = [
  {
    id: '006',
    who: 'Ruby',
    dept: 'Bookings',
    ask: 'I need your help on Function quote, 18 guests, Saturday lunch',
    trail: [
      { time: '22:14', note: 'Enquiry arrived through the website form' },
      { time: '05:58', note: 'Quote drafted from your function menu at $61 a head' },
      { time: '06:04', note: 'Waiting for you. It goes out in your name.' },
    ],
    cta: 'Approve and send',
  },
  {
    id: '001',
    who: 'Leo',
    dept: 'Suppliers & stock',
    ask: 'I need your help on Tomato order redrafted, tomatoes are up 34%',
    trail: [
      { time: '05:31', note: 'Price check caught roma tomatoes at $4.20 a kilo, up from $3.13' },
      { time: '05:52', note: 'Tomorrow’s order redrafted around the move, $118 in total' },
      { time: '06:04', note: 'Waiting for you. Nothing is sent until you approve it.' },
    ],
    cta: 'Approve the order',
  },
]

/* ------------------------------------------------------------------ *
 * Detail-page data — the half of the story the till alone never shows
 * ------------------------------------------------------------------ */

export type Cost = { name: string; amt: number; color: string }

export const COSTS: Cost[] = [
  { name: 'Wages', amt: 780, color: SERIES.stone },
  { name: 'Supplier', amt: 340, color: SERIES.moss },
  { name: 'Rent', amt: 210, color: SERIES.mauve },
  { name: 'Electricity', amt: 95, color: SERIES.rose },
  { name: 'Compliance', amt: 40, color: SERIES.slate },
]
export const COST_TOTAL = COSTS.reduce((a, c) => a + c.amt, 0)

export const CHANNELS: Slice[] = [
  { name: 'Square (till)', pct: 78, color: SERIES.stone },
  { name: 'Uber Eats', pct: 12, color: SERIES.moss },
  { name: 'DoorDash', pct: 6, color: SERIES.mauve },
  { name: 'Menulog', pct: 4, color: SERIES.rose },
]

export const PAYMENTS: Slice[] = [
  { name: 'Card / tap', pct: 85, color: SERIES.stone },
  { name: 'Cash', pct: 15, color: SERIES.moss },
]

/* ------------------------------------------------------------------ *
 * Break-even, in something you can picture
 *
 * THERE IS NO MENU IN THIS PRODUCT. No menu model, no menu nav entry, no
 * pricing table, nothing in `src/data` that stores an item or a price. The
 * item and price below are ONE HARDCODED EXAMPLE standing in for a Menu
 * surface that has not been built, and the panel says so on screen rather
 * than letting a confident sentence imply the number came from somewhere.
 *
 * This was an explicit decision, not an oversight: a real Menu means a data
 * model, a rules pass, an editable settings panel, persistence through BOTH
 * adapters and the server routes behind them. That is its own piece of work
 * and it is deliberately not smuggled in under a revenue-panel change.
 *
 * Wiring it later: replace `BREAKEVEN_ITEM` with a lookup against the menu
 * the owner actually chose, flip `MENU_IS_WIRED`, and the panel's caption
 * and its "not wired" note follow without another edit here.
 * ------------------------------------------------------------------ */

/** False until a Menu surface exists. The panel reads this for its note. */
export const MENU_IS_WIRED = false

/** The stand-in. One item, one price, both invented. */
export const BREAKEVEN_ITEM = { name: 'croissant', plural: 'croissants', price: 6.5 }

/**
 * The same figure said three ways, one per breakdown.
 *
 * Each dimension gets the translation that suits it rather than the same
 * sentence with the nouns swapped: a category reader is thinking in menu
 * items, a channel reader in who takes a cut, a payment reader in what has
 * to be counted at the end of the night.
 */
export type Perspective = { eyebrow: string; line: string; foot: string }

export const perspectiveFor = (
  dim: 'category' | 'channel' | 'payment',
  costTotal: number,
  dayTotal: number,
): Perspective => {
  if (dim === 'category') {
    const n = Math.ceil(costTotal / BREAKEVEN_ITEM.price)
    return {
      eyebrow: 'In croissants',
      line: `About ${n} ${BREAKEVEN_ITEM.plural} at $${BREAKEVEN_ITEM.price.toFixed(2)} covers the day before anything is kept.`,
      foot: MENU_IS_WIRED
        ? `Priced from your menu.`
        : `No menu is wired up yet, so this is one example item at an example price. A Menu surface is separate work.`,
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

const money0 = (n: number) => '$' + n.toLocaleString()

export const AVG_TICKET = 22.75
export const COVERS = 96

/**
 * Seven days of weather, for the outlook page.
 *
 * Wind and UV are as much fixture as the temperatures beside them. There is
 * no weather feed behind any of this — see the hourly note below, which
 * applies here word for word: a high, a low, a condition, a wind, a UV index
 * and a sentence per day is the ENTIRE weather model, and every one of those
 * numbers was written by hand for The Peacock's demo week. They are
 * plausible for South Yarra in September and they are not observations.
 *
 * Wind and UV arrived per-day rather than today-only on purpose. Modelling
 * them for today alone and leaving the rest of the week blank would have
 * been the more honest-looking choice and the less honest one: it implies
 * today's figures come from somewhere the others do not, when all seven are
 * the same kind of invention. Either the whole week is fixture or none of it
 * is, and this file says which out loud rather than varying by column.
 *
 * `note` carries both in prose rather than as extra labelled fields. A bare
 * stat block reads as an instrument reading; a sentence reads as a
 * characterisation, which is what these actually are. The structured `wind`
 * and `uv` values exist because the detail panel's metric row is a metric
 * row and needs them — the week list never prints them as figures.
 */
export type Wind = { kph: number; dir: string }

export type OutlookDay = {
  day: string
  temp: number
  low: number
  label: string
  wind: Wind
  /** UV index on the standard 0–11+ scale. `uvBand` turns it into a word. */
  uv: number
  note: string
}

export const OUTLOOK: OutlookDay[] = [
  { day: 'Today', temp: 18, low: 11, label: 'Cloudy', wind: { kph: 13, dir: 'SW' }, uv: 3,
    note: 'Overcast through the day, a light south-westerly, UV moderate. No rain expected.' },
  { day: 'Thu', temp: 21, low: 12, label: 'Sunny', wind: { kph: 9, dir: 'N' }, uv: 6,
    note: 'Clearing by lunch, barely a breath of northerly, UV high by early afternoon. Courtyard weather.' },
  { day: 'Fri', temp: 23, low: 14, label: 'Sunny', wind: { kph: 14, dir: 'N' }, uv: 7,
    note: 'Warmest day of the week, a steady northerly, UV high from mid-morning.' },
  { day: 'Sat', temp: 19, low: 13, label: 'Showers', wind: { kph: 22, dir: 'SW' }, uv: 3,
    note: 'Wet through the morning market, a gusty south-westerly, UV moderate once it clears.' },
  { day: 'Sun', temp: 16, low: 10, label: 'Rain', wind: { kph: 28, dir: 'SW' }, uv: 1,
    note: 'Steady rain, a strong south-westerly, UV low. Bring the courtyard tables in.' },
  { day: 'Mon', temp: 17, low: 9, label: 'Cloudy', wind: { kph: 17, dir: 'W' }, uv: 2,
    note: 'Grey but dry, a fresh westerly, UV low all day.' },
  { day: 'Tue', temp: 20, low: 11, label: 'Part cloud', wind: { kph: 11, dir: 'NE' }, uv: 5,
    note: 'Pleasant by the afternoon, a light north-easterly, UV moderate.' },
]

/** The UV index as the word the forecast would use. Standard bands. */
export const uvBand = (uv: number) =>
  uv <= 2 ? 'Low' : uv <= 5 ? 'Moderate' : uv <= 7 ? 'High' : uv <= 10 ? 'Very high' : 'Extreme'

/** Wind strength as a word, on the Beaufort boundaries the BOM uses. */
export const windWord = (kph: number) =>
  kph < 6 ? 'Calm' : kph < 12 ? 'Light' : kph < 20 ? 'Moderate' : kph < 29 ? 'Fresh' : 'Strong'

/* ------------------------------------------------------------------ *
 * The outlook's hourly strip, and what it is honestly made of
 *
 * READ THIS BEFORE TREATING THESE NUMBERS AS A FORECAST. There is no hourly
 * weather anywhere in this product — not for the week ahead, and not for
 * today either. `OUTLOOK` carries a high, a low, a condition word and a
 * sentence per day, and that is the entire weather model. The only hourly
 * series on this dashboard is `HOUR_SHARE`, which is takings.
 *
 * So the strip under an expanded day is NOT a per-hour forecast. It is the
 * day's own published high and low drawn across the trading day on the
 * standard diurnal curve — coldest at the 6am open, warmest around 3pm — and
 * it states no fact that the collapsed row did not already state. Nothing
 * here is interpolated from data that does not exist; the two endpoints are
 * real fixture values and the shape between them is arithmetic, which is why
 * `outlookHours` is a function over a day rather than a table of invented
 * readings sitting in this file looking like observations.
 *
 * The condition does not vary by hour, deliberately. Several of the day
 * notes do carry intra-day structure — "clearing by lunch", "wet through the
 * morning market" — and a real hourly feed would express it. Hand-authoring
 * that split here would be inventing precision the product does not have, so
 * every hour shows the day's own condition and the panel says so out loud.
 *
 * Wiring a real feed: give `OutlookDay` an optional `hours` array, return it
 * from `outlookHours` when present, and flip `OUTLOOK_HOURLY_IS_MEASURED`.
 * The panel reads that flag for its caption and needs no other change — the
 * same arrangement `REVENUE_RANGES_AVAILABLE` uses above.
 * ------------------------------------------------------------------ */

/** False while the strip is shaped from the daily high and low. A real
 *  hourly feed flips this, and the panel's caption follows it. */
export const OUTLOOK_HOURLY_IS_MEASURED = false

/** The trading day, on the same clock and the same twelve hours the revenue
 *  chart uses, so the two strips in this console read alike. */
export const OUTLOOK_HOUR_RANGE = [6, 17] as const

export type OutlookHour = { hour: number; label: string; temp: number }

const hourLabel = (h: number) => (h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`)

export function outlookHours(d: OutlookDay): OutlookHour[] {
  const [from, to] = OUTLOOK_HOUR_RANGE
  /* Minimum at the open, maximum at 3pm, easing both ways: a half-cosine
     over the nine hours between them, continued past the peak. */
  const peak = 15
  return Array.from({ length: to - from + 1 }, (_, i) => {
    const hour = from + i
    const phase = (1 - Math.cos((Math.PI * (hour - from)) / (peak - from))) / 2
    return { hour, label: hourLabel(hour), temp: Math.round(d.low + (d.temp - d.low) * phase) }
  })
}

/**
 * Foot traffic near the venue, by day, indexed against a usual week.
 *
 * SEVEN DAYS IS THE ENTIRE SERIES. There is no month here and no quarter,
 * which is why `TRAFFIC_RANGES_AVAILABLE` below lists one range and the
 * card offers the others disabled rather than pressable and inert.
 *
 * This used to be two series that disagreed: the glance card drew its own
 * `spark` array — 40, 55, 70, 90, 65, 50, 80 — while the detail panel drew
 * these indices, so the same week had two different shapes depending on
 * which surface you read it on. The spark array is gone and both now read
 * this one.
 */
export const TRAFFIC = [
  { day: 'Mon', idx: 82 },
  { day: 'Tue', idx: 118 },
  { day: 'Wed', idx: 96 },
  { day: 'Thu', idx: 104 },
  { day: 'Fri', idx: 131 },
  { day: 'Sat', idx: 147 },
  { day: 'Sun', idx: 88 },
]

/**
 * Which day of `TRAFFIC` is today, and therefore the only one allowed colour.
 *
 * Tuesday, because that is the day the rest of this fixture is written
 * around: the glance tag reads "+18% vs usual Tue" and the revenue card
 * compares against "last Tue". Worth knowing that `OUTLOOK` disagrees — its
 * week runs Today, Thu, Fri, which puts today on a Wednesday. The two were
 * authored separately and never reconciled. This constant is deliberately
 * one line so that when the fixture is settled, the chart follows it.
 */
export const TRAFFIC_TODAY = 'Tue'

export const TRAFFIC_RANGES = ['Week', 'Month', 'Past 3 months'] as const
export type TrafficRange = (typeof TRAFFIC_RANGES)[number]

/**
 * The ranges there is actually a series behind — one.
 *
 * Same arrangement as `REVENUE_RANGES_AVAILABLE`, and for the same reason:
 * a month and a quarter of foot traffic would have to be invented wholesale,
 * and 90 fabricated day-indices presented as history is a different order of
 * fiction from a demo week. Add the series, add the name here, and the panel
 * needs no other change.
 */
export const TRAFFIC_RANGES_AVAILABLE: readonly TrafficRange[] = ['Week']

/* ------------------------------------------------------------------ *
 * News
 *
 * NOTHING HERE IS INGESTED. There is no feed, no API key and no scraper
 * anywhere in this product: the only `fetch` in the codebase is the booking
 * API adapter. These three stories are curated fixtures, written to be
 * plausible for a South Yarra cafe and fixed in place, and the card rotates
 * between them rather than between anything that arrived this morning.
 *
 * `source.url` points at the INSTITUTION, not at an article. A real headline
 * would deep-link to the story it came from, and inventing such a path would
 * be fabricating a citation for a story that was never published. The RBA,
 * the Fair Work Ombudsman and the City of Stonnington are the real bodies
 * these fixtures are attributed to and their own front doors are the
 * honest destination until a feed exists to supply the real one.
 *
 * `kind` drives the visual treatment. It is the news equivalent of the
 * weather's condition: a rate story gets the markets ground and a chart, a
 * council story gets the street ground and a plan of the works, and neither
 * borrows the other's. See NEWS_GROUND in `GlanceScene.tsx`.
 * ------------------------------------------------------------------ */

/** False until something actually ingests news. The panel's footnote reads
 *  this, the same way the outlook's hourly caption reads its own flag. */
export const NEWS_IS_LIVE = false

export type NewsKind = 'rate' | 'award' | 'council'

export type NewsItem = {
  kind: NewsKind
  /** The category this story is, not the outlet it came from. */
  category: string
  /** Who it concerns, shown after the category. */
  who: string
  /** The card's hero figure, and the unit under it. */
  figure: string
  figureUnit: string
  head: string
  /** The one line the collapsed card shows. */
  cardSub: string
  body: string
  hits: string
  when: string
  source: { name: string; url: string }
}

export const NEWS: NewsItem[] = [
  {
    kind: 'rate',
    category: 'Cash rate',
    who: 'RBA',
    figure: '4.35',
    figureUnit: '% cash rate',
    head: 'Cash rate held at 4.35%',
    cardSub: 'Held steady this month, no change to loan or overdraft repayments.',
    body: 'No change to loan or overdraft repayments this month. The next decision is in five weeks.',
    hits: 'Your fitout loan repayment stays at $1,240 a month.',
    when: 'Tue 06:00',
    source: { name: 'rba.gov.au', url: 'https://www.rba.gov.au/monetary-policy/' },
  },
  {
    kind: 'award',
    category: 'Award rates',
    who: 'Fair Work',
    figure: '3.5',
    figureUnit: '% from 1 July',
    head: 'Hospitality award rates rise 3.5% from 1 July',
    cardSub: 'The annual wage review lifts every classification under the Restaurant Industry Award.',
    body: 'The annual wage review lifts all classifications under the Restaurant Industry Award.',
    hits: "On last week's roster that is about $38 more a week in wages.",
    when: 'Mon 14:20',
    source: { name: 'fairwork.gov.au', url: 'https://www.fairwork.gov.au/pay-and-wages' },
  },
  {
    kind: 'council',
    category: 'Street works',
    who: 'Council',
    figure: '3',
    figureUnit: 'weeks of works',
    head: 'Chapel Street footpath works, three weeks from Monday',
    cardSub: 'Resurfacing between Toorak Road and Malcolm Street, foot traffic will drop while it runs.',
    body: 'Resurfacing between Toorak Road and Malcolm Street. Foot traffic is expected to drop while it runs.',
    hits: 'Worth planning a quieter roster for those weeks.',
    when: 'Mon 09:05',
    source: { name: 'stonnington.vic.gov.au', url: 'https://www.stonnington.vic.gov.au/' },
  },
]

/**
 * The story the card leads with, and the order the panel lists them in.
 *
 * Rotating rather than random: three items and a coin toss would show the
 * same story twice in a row often enough to look broken. The offset advances
 * every time the news surface is opened, so a second look is always a
 * different lead, and the panel keeps all three visible in rotated order
 * rather than hiding two of them.
 */
export const rotateNews = (offset: number): NewsItem[] =>
  NEWS.map((_, i) => NEWS[(i + offset) % NEWS.length]!)

/** What the team did today and yesterday, and what it is still holding. */
export type LogEntry = { time: string; dept: string; note: string; done: boolean }

export const LOG: LogEntry[] = [
  { time: 'Sun', dept: 'Rostering', note: "Next week's roster built and sent to the team.", done: true },
  { time: '05:31', dept: 'Suppliers', note: 'Price check caught oat milk up 9% this month. Verified alternative found, $0.40/L cheaper.', done: true },
  { time: '05:52', dept: 'Suppliers', note: 'Tomorrow’s tomato order redrafted around a 34% price move, $118 in total.', done: false },
  { time: '07:58', dept: 'Finance', note: 'Duplicate $39/mo card-fee subscription flagged, overlapping the Square plan.', done: true },
  { time: '06:04', dept: 'Finance', note: 'Cancelled, refund confirmed.', done: true },
  { time: '08:10', dept: 'Marketing', note: 'Tuesday post drafted: "bring-your-own-cup, $4 flat white, 11–2."', done: true },
  { time: '21:30', dept: 'Marketing', note: 'Approved by Jenny.', done: true },
  { time: '22:00', dept: 'Marketing', note: 'Scheduled to post.', done: true },
  { time: '22:14', dept: 'Bookings', note: 'Function enquiry arrived through the website form, 18 guests.', done: true },
  { time: '05:58', dept: 'Bookings', note: '18-guest function quote drafted from the function menu at $61 a head.', done: false },
]

export const CONTACTS = [
  { name: 'Square', kind: 'Till & payments', detail: 'Connected · syncing every 5 minutes' },
  { name: 'Xero', kind: 'Bookkeeping', detail: 'Connected · reconciled to yesterday' },
  /* Was "Connected · 41 reviews, 4.5★", which asserted a live integration
     that does not exist and a figure nothing derived. Both now come from
     the review corpus, and the status says what is actually true. */
  {
    name: 'Google Business',
    kind: 'Reviews',
    detail: `Not connected · ${ratingFor('google').count} example reviews, ${ratingFor('google').stars}★`,
  },
  { name: 'Uber Eats', kind: 'Delivery', detail: 'Connected · 12% of takings' },
  { name: 'The Peacock', kind: 'Venue', detail: "Jenny's Café · 41 Chapel St, South Yarra" },
]
