import type { Booking, DateKey, Table } from './types.js'
import { service } from './venue.js'
import { addMinutes, allSlots, occupancyMinutes, sittingFor } from './time.js'

/**
 * Availability. One rule, applied everywhere:
 *
 *   a slot is available for a table if no confirmed booking overlaps
 *   [slot, slot + sitting + buffer)
 *
 * Sitting length comes from the party size; cancelled and no-show bookings
 * release their table.
 */

export type TableState = 'available' | 'partly' | 'full' | 'too-small'

const HOLDS_TABLE: Booking['status'][] = ['confirmed', 'seated']

export function holdsTable(b: Booking): boolean {
  return HOLDS_TABLE.includes(b.status)
}

/** The window a booking keeps its table out of circulation. */
export function bookingSpan(b: Booking): [number, number] {
  const start = new Date(b.startsAt).getTime()
  return [start, start + (b.durationMin + service.bufferMinutes) * 60_000]
}

function overlaps(a: [number, number], b: [number, number]): boolean {
  return a[0] < b[1] && b[0] < a[1]
}

export function isSlotFree(
  slot: Date,
  partySize: number,
  tableBookings: Booking[],
): boolean {
  const want: [number, number] = [
    slot.getTime(),
    slot.getTime() + occupancyMinutes(partySize) * 60_000,
  ]
  return !tableBookings.filter(holdsTable).some((b) => overlaps(want, bookingSpan(b)))
}

export function bookingsFor(tableId: string, bookings: Booking[]): Booking[] {
  return bookings
    .filter((b) => b.tableId === tableId)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
}

/** Every start time this table can take this party on this date. */
export function availableSlots(
  table: Table,
  date: DateKey,
  partySize: number,
  bookings: Booking[],
): Date[] {
  if (table.seats < partySize) return []
  const mine = bookingsFor(table.id, bookings)
  // The sitting itself has to finish before the venue shuts; the buffer may
  // run past close, since nobody is seated in it.
  return bookableSlots(date, partySize).filter((slot) => isSlotFree(slot, partySize, mine))
}

/** Slots on this date whose sitting fits inside a service period. */
export function bookableSlots(date: DateKey, partySize: number): Date[] {
  const sitting = sittingFor(partySize)
  return allSlots(date).filter((slot) => withinService(slot, addMinutes(slot, sitting), date))
}

function withinService(start: Date, end: Date, _date: DateKey): boolean {
  // A sitting must sit inside one service period.
  for (const period of ['lunch', 'dinner'] as const) {
    const [from, to] = service.serviceHours[period].split('–')
    const [fh, fm] = from.split(':').map(Number)
    const [th, tm] = to.split(':').map(Number)
    const d = new Date(start)
    const open = new Date(d.getFullYear(), d.getMonth(), d.getDate(), fh, fm)
    const close = new Date(d.getFullYear(), d.getMonth(), d.getDate(), th, tm)
    if (start >= open && end <= close) return true
  }
  return false
}

/**
 * How booked a table is across a whole day — the owner floor view's read.
 * Free all day advances; anything with a booking on it sits back; a table with
 * nothing left recedes fully. Three states, still no legend (§4).
 */
export function tableOccupancy(
  table: Table,
  date: DateKey,
  bookings: Booking[],
): Extract<TableState, 'available' | 'partly' | 'full'> {
  const mine = bookingsFor(table.id, bookings).filter(holdsTable)
  if (!mine.length) return 'available'
  // A party of two fits every table here, so this reads as occupancy, not fit.
  return availableSlots(table, date, 2, bookings).length ? 'partly' : 'full'
}

/** What a table is doing right now / next — for the owner floor view. */
export function currentOrNext(
  tableId: string,
  bookings: Booking[],
  now = new Date(),
): Booking | null {
  const mine = bookingsFor(tableId, bookings).filter(holdsTable)
  const t = now.getTime()
  const live = mine.find((b) => {
    const [s, e] = bookingSpan(b)
    return t >= s && t < e
  })
  if (live) return live
  return mine.find((b) => new Date(b.startsAt).getTime() >= t) ?? mine[mine.length - 1] ?? null
}

// ---------------------------------------------------------------------------
// Time-specific reads. The guest picks a party size, a date and a time up
// front, so every table resolves to exactly one of three states at that
// moment — there is no middle band to show and no legend to read.
// ---------------------------------------------------------------------------

export type SlotState = 'available' | 'too-small' | 'booked'

/** How a table reads on the floor plan for one party, on one date, at one time. */
export function tableStateAt(
  table: Table,
  slot: Date,
  partySize: number,
  bookings: Booking[],
): SlotState {
  if (table.seats < partySize) return 'too-small'
  return isSlotFree(slot, partySize, bookingsFor(table.id, bookings)) ? 'available' : 'booked'
}

/** The booking holding a table across a given moment, if any. */
export function bookingAt(tableId: string, when: Date, bookings: Booking[]): Booking | null {
  const t = when.getTime()
  return (
    bookingsFor(tableId, bookings)
      .filter(holdsTable)
      .find((b) => {
        const [s, e] = bookingSpan(b)
        return t >= s && t < e
      }) ?? null
  )
}

/** What a booking actually occupies, for showing a guest why a table is out. */
export function sittingWindow(b: Booking): [Date, Date] {
  const start = new Date(b.startsAt)
  return [start, new Date(start.getTime() + b.durationMin * 60_000)]
}

/** This table's first free start time at or after `after`. */
export function nextFreeSlot(
  table: Table,
  date: DateKey,
  partySize: number,
  bookings: Booking[],
  after: Date,
): Date | null {
  return (
    availableSlots(table, date, partySize, bookings).find((s) => s.getTime() >= after.getTime()) ??
    null
  )
}

/**
 * Other tables free at exactly this time, nearest first. Same zone beats a
 * shorter walk across the room, which is how a host would think about it.
 */
export function alternativesAt(
  from: Table,
  tables: Table[],
  slot: Date,
  partySize: number,
  bookings: Booking[],
  limit = 3,
): Table[] {
  return tables
    .filter(
      (t) =>
        t.id !== from.id &&
        t.seats >= partySize &&
        isSlotFree(slot, partySize, bookingsFor(t.id, bookings)),
    )
    .sort((a, b) => cost(from, a) - cost(from, b))
    .slice(0, limit)
}

function cost(from: Table, t: Table): number {
  return Math.hypot(t.x - from.x, t.y - from.y) + (t.zone === from.zone ? 0 : 4)
}

/** The bookings standing between a party and a table at a given start time. */
export function blockersFor(
  tableId: string,
  slot: Date,
  partySize: number,
  bookings: Booking[],
): Booking[] {
  const want: [number, number] = [
    slot.getTime(),
    slot.getTime() + occupancyMinutes(partySize) * 60_000,
  ]
  return bookingsFor(tableId, bookings)
    .filter(holdsTable)
    .filter((b) => overlaps(want, bookingSpan(b)))
}

/* ------------------------------------------------------------------ *
 * Right-sizing — hold the big tables back
 * ------------------------------------------------------------------ */

/**
 * Which table size a party is currently offered.
 *
 * Without this a party of two is shown every free table in the room,
 * books a six-top because it is by the window, and the venue loses the
 * only table that could have taken a party of six. A host would never do
 * that: they seat you on the smallest table that fits, and only move you
 * up once those are gone.
 *
 * So: the smallest seat count that fits the party AND still has a free
 * table at this moment. Everything larger stays out of the offer until
 * that tier is full, at which point the next size up opens on its own.
 * Returns null when nothing in the room can take the party.
 */
export function offeredSeatSize(
  slot: Date,
  partySize: number,
  allTables: Table[],
  bookings: Booking[],
): number | null {
  const sizes = [...new Set(allTables.map((t) => t.seats))]
    .filter((s) => s >= partySize)
    .sort((a, b) => a - b)

  for (const size of sizes) {
    const free = allTables.some(
      (t) => t.seats === size && isSlotFree(slot, partySize, bookingsFor(t.id, bookings)),
    )
    if (free) return size
  }
  return null
}

/**
 * `tableStateAt` with the right-sizing rule applied.
 *
 * A free table of the wrong tier comes back 'too-small' — not literally
 * true, but it is the honest answer to "can this party have it?", and it
 * keeps the guest's floor plan to one meaning: green is yours to take.
 */
export function tableOfferAt(
  table: Table,
  slot: Date,
  partySize: number,
  allTables: Table[],
  bookings: Booking[],
): SlotState {
  const base = tableStateAt(table, slot, partySize, bookings)
  if (base !== 'available') return base
  const tier = offeredSeatSize(slot, partySize, allTables, bookings)
  return tier === null || table.seats === tier ? base : 'too-small'
}
