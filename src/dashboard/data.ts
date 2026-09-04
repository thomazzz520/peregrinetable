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
