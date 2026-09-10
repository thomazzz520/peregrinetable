/**
 * Booking-rule checks. `npm run check:rules`. Not shipped in the bundle.
 *
 * These exist because of a specific bug: `durationMin` arrived from a request
 * body, was asserted into NewBooking with `as`, and was never validated — so a
 * non-numeric value reached storage and then reached the arithmetic that reads
 * it back. The first section below reproduces the corruption directly against
 * bookingSpan, so the reason for the rule is visible rather than asserted, then
 * checks that checkBooking now refuses the same input.
 */
import { bookingSpan } from '../src/data/availability'
import { checkBooking, isBookingStatus, LIMITS } from '../src/data/rules'
import { at, sittingFor, todayKey } from '../src/data'
import type { Booking } from '../src/data/types'

/** availability.ts:30, mirrored — it is module-private, and exporting it just
 *  to be tested would widen the production surface for a check's sake. */
const overlaps = (a: [number, number], b: [number, number]) => a[0] < b[1] && b[0] < a[1]

let failures = 0
function check(label: string, pass: boolean, detail = '') {
  if (!pass) failures++
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`)
}

const today = todayKey()
const startsAt = at(today, '19:00').toISOString()

/** A booking as it would have been stored, with durationMin straight from a body. */
function stored(durationMin: unknown): Booking {
  return {
    id: 'PK-TEST1', tableId: 'd1', startsAt, durationMin: durationMin as number,
    partySize: 4, guestName: 'Test', phone: '0400000000', email: 't@example.com',
    status: 'confirmed',
  }
}

/** What a guest POSTs, with one field substituted. */
function candidate(durationMin: unknown, partySize: unknown) {
  return {
    tableId: 'd1', startsAt,
    durationMin: durationMin as number,
    partySize: partySize as number,
  }
}

console.log('--- why the rule exists: what an unvalidated durationMin does ---')

// The 19:00 booking should collide with a second 19:00 booking on the same table.
const want = bookingSpan(stored(sittingFor(4)))
check('a good booking overlaps itself', overlaps(want, bookingSpan(stored(sittingFor(4)))))

// Non-numeric: the span ends at NaN and every comparison against it is false,
// so the booking silently stops blocking its own table.
const nanSpan = bookingSpan(stored('abc'))
check(
  'durationMin "abc" produces a NaN span',
  Number.isNaN(nanSpan[1]),
  `span = [${nanSpan[0]}, ${nanSpan[1]}]`,
)
check(
  'and a NaN span never registers as a clash — this is the silent corruption',
  overlaps(want, nanSpan) === false,
)

// Numeric string: survives any coercing check, but is stored as a string and
// concatenated rather than added. "90" + 15 = "9015".
const strSpan = bookingSpan(stored('90'))
const strDays = Math.round((strSpan[1] - strSpan[0]) / 86_400_000)
check(
  'durationMin "90" holds the table for days, not 105 minutes',
  strDays >= 6,
  `${strDays} days instead of ${(sittingFor(4) + 15) / 60} hours`,
)

console.log('\n--- the rule: checkBooking rejects them before storage ---')

const bad: [string, unknown][] = [
  ['non-numeric string', 'abc'],
  ['numeric string', '90'],
  ['missing', undefined],
  ['null', null],
  ['NaN', NaN],
  ['Infinity', Infinity],
  ['negative', -90],
  ['zero', 0],
  ['fractional', 90.5],
  ['under one slot', 15],
  ['over the cap', LIMITS.durationMin + 1],
]
for (const [label, value] of bad) {
  const v = checkBooking(candidate(value, 4), [])
  check(`rejects durationMin: ${label}`, v?.code === 'bad-field', v?.message ?? 'accepted')
}

const good: [string, number][] = [
  ['a small sitting', sittingFor(2)],
  ['a large sitting', sittingFor(6)],
  ['the floor', 30],
  ['the cap', LIMITS.durationMin],
]
for (const [label, value] of good) {
  const v = checkBooking(candidate(value, 4), [])
  check(`accepts durationMin: ${label} (${value})`, v === null, v?.message ?? '')
}

console.log('\n--- partySize: the same shape of bug, one field over ---')

// Number("4") passed the old check, but "4" was what got stored, and every
// later read of it worked or failed by coincidence.
for (const [label, value] of [
  ['numeric string', '4'],
  ['non-numeric string', 'four'],
  ['missing', undefined],
  ['null', null],
  ['NaN', NaN],
  ['fractional', 2.5],
  ['zero', 0],
  ['negative', -2],
  ['over the cap', LIMITS.partySize + 1],
] as [string, unknown][]) {
  const v = checkBooking(candidate(sittingFor(4), value), [])
  check(`rejects partySize: ${label}`, v?.code === 'bad-field', v?.message ?? 'accepted')
}
/* No table seats 12, so LIMITS.partySize legitimately fails on 'too-small'.
   This section is about the field, so it asserts the field was accepted and
   leaves the seating verdict to the too-small check that owns it. */
for (const value of [1, 4, LIMITS.partySize]) {
  const v = checkBooking(candidate(sittingFor(value), value), [])
  check(
    `accepts partySize ${value} as a field`,
    v?.code !== 'bad-field',
    v ? `fell to ${v.code}, not bad-field` : 'booking stands',
  )
}

console.log('\n--- PATCH status: an unknown value must not skip checkBooking ---')

for (const s of ['confirmed', 'seated', 'cancelled', 'no_show']) {
  check(`accepts status: ${s}`, isBookingStatus(s))
}
for (const s of ['CONFIRMED', 'deleted', '', 'no-show', undefined, null, 7, {}]) {
  check(`rejects status: ${JSON.stringify(s) ?? String(s)}`, !isBookingStatus(s))
}

// The specific shape of the old bug: a status that is neither 'confirmed' nor
// 'seated' falls through the PATCH guard, so checkBooking is never called.
const skips = (status: string) => status !== 'confirmed' && status !== 'seated'
check(
  "'deleted' would have skipped checkBooking and persisted",
  skips('deleted') && !isBookingStatus('deleted'),
)

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILED`}`)
if (failures > 0) process.exit(1)
