/**
 * The venue's day, as the dashboard reports it.
 *
 * Ported from the standalone desktop demo. Still fixture data: the numbers
 * belong to The Peacock's demo day and nothing here talks to a till yet.
 * Bookings are the exception — those come from the real diary through
 * `src/data`, which is why they live nowhere near this file.
 */

export type Slice = { name: string; pct: number; color: string }

export const MIX: Slice[] = [
  { name: 'Coffee', pct: 58, color: '#5B8CFF' },
  { name: 'Food', pct: 31, color: '#80D0B8' },
  { name: 'Retail', pct: 11, color: '#F0B84B' },
]

/** Takings by hour, 6am to 5pm, as a share of the busiest hour. */
export const HOURS = ['6a', '7a', '8a', '9a', '10a', '11a', '12p', '1p', '2p', '3p', '4p', '5p']
export const HOUR_SHARE = [18, 32, 48, 66, 84, 100, 90, 76, 64, 50, 34, 20]
export const DAY_TOTAL = 2184

const shareSum = HOUR_SHARE.reduce((a, b) => a + b, 0)
export const HOUR_DOLLARS = HOUR_SHARE.map((h) => Math.round((DAY_TOTAL * h) / shareSum))

export const REVIEW = {
  source: 'Google',
  stars: 5,
  quote: 'Best flat white on the street, and they remembered my order.',
  who: 'Maddie R.',
  when: '2h ago',
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
    spark: [40, 55, 70, 90, 65, 50, 80],
  },
  news: {
    label: 'News',
    big: '4.35%',
    tag: 'RBA · cash rate',
    sub: 'Held steady this month — no change to loan or overdraft repayments.',
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
  'Try: **$1 off** for a reusable cup — could lift return visits',
  "Food mix has held steady around **31%** for three weeks running",
  'Try: bundle a pastry with the 8–10am rush — coffee-only orders are up',
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
  { name: 'Wages', amt: 780, color: '#5B8CFF' },
  { name: 'Supplier', amt: 340, color: '#80D0B8' },
  { name: 'Rent', amt: 210, color: '#F0B84B' },
  { name: 'Electricity', amt: 95, color: '#FF8A65' },
  { name: 'Compliance', amt: 40, color: '#B39DDB' },
]
export const COST_TOTAL = COSTS.reduce((a, c) => a + c.amt, 0)

export const CHANNELS: Slice[] = [
  { name: 'Square (till)', pct: 78, color: '#5B8CFF' },
  { name: 'Uber Eats', pct: 12, color: '#80D0B8' },
  { name: 'DoorDash', pct: 6, color: '#FF6F5E' },
  { name: 'Menulog', pct: 4, color: '#F0B84B' },
]

export const PAYMENTS: Slice[] = [
  { name: 'Card / tap', pct: 85, color: '#5B8CFF' },
  { name: 'Cash', pct: 15, color: '#F0B84B' },
]

export const AVG_TICKET = 22.75
export const COVERS = 96

/** Seven days of weather, for the outlook page. */
export const OUTLOOK = [
  { day: 'Today', temp: 18, low: 11, label: 'Cloudy', note: 'Overcast through the day, no rain expected.' },
  { day: 'Thu', temp: 21, low: 12, label: 'Sunny', note: 'Clearing by lunch — courtyard weather.' },
  { day: 'Fri', temp: 23, low: 14, label: 'Sunny', note: 'Warmest day of the week.' },
  { day: 'Sat', temp: 19, low: 13, label: 'Showers', note: 'Wet through the morning market.' },
  { day: 'Sun', temp: 16, low: 10, label: 'Rain', note: 'Steady rain. Bring the courtyard tables in.' },
  { day: 'Mon', temp: 17, low: 9, label: 'Cloudy', note: 'Grey but dry.' },
  { day: 'Tue', temp: 20, low: 11, label: 'Part cloud', note: 'Pleasant by the afternoon.' },
]

/** Foot traffic near the venue, by day, indexed against a usual week. */
export const TRAFFIC = [
  { day: 'Mon', idx: 82 },
  { day: 'Tue', idx: 118 },
  { day: 'Wed', idx: 96 },
  { day: 'Thu', idx: 104 },
  { day: 'Fri', idx: 131 },
  { day: 'Sat', idx: 147 },
  { day: 'Sun', idx: 88 },
]

/** Things happening outside the venue that land on the owner anyway. */
export const NEWS = [
  {
    tag: 'RBA · cash rate',
    head: 'Cash rate held at 4.35%',
    body: 'No change to loan or overdraft repayments this month. The next decision is in five weeks.',
    hits: 'Your fitout loan repayment stays at $1,240 a month.',
  },
  {
    tag: 'Fair Work · award',
    head: 'Hospitality award rates rise 3.5% from 1 July',
    body: 'The annual wage review lifts all classifications under the Restaurant Industry Award.',
    hits: 'On last week\'s roster that is about $38 more a week in wages.',
  },
  {
    tag: 'Council · South Yarra',
    head: 'Chapel Street footpath works, three weeks from Monday',
    body: 'Resurfacing between Toorak Road and Malcolm Street. Foot traffic is expected to drop while it runs.',
    hits: 'Worth planning a quieter roster for those weeks.',
  },
]
