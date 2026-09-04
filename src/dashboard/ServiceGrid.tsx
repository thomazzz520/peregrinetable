import { useMemo } from 'react'
import { holdsTable, tables, zones, type Booking } from '../data'

/**
 * Who is on which table, and when.
 *
 * The 3D room answers "is this table busy today" and stops there, which is
 * no use to whoever is running the pass. This is the other half: every
 * table down the side, the service across the top, and each booking drawn
 * where it actually sits — with the name on it, because at 7pm the
 * question is never "is table 6 taken", it is "who is on 6".
 */

/** Half-hour columns from the first booking to the last, floor to the hour. */
const COL_MIN = 30

function bounds(bookings: Booking[]): [number, number] {
  const live = bookings.filter(holdsTable)
  if (!live.length) return [12 * 60, 22 * 60]
  let lo = Infinity
  let hi = -Infinity
  for (const b of live) {
    const d = new Date(b.startsAt)
    const start = d.getHours() * 60 + d.getMinutes()
    lo = Math.min(lo, start)
    hi = Math.max(hi, start + b.durationMin)
  }
  // Whole hours either side, so the header reads 12:00 not 12:17.
  return [Math.floor(lo / 60) * 60, Math.ceil(hi / 60) * 60]
}

export default function ServiceGrid({ bookings }: { bookings: Booking[] }) {
  const live = useMemo(() => bookings.filter(holdsTable), [bookings])
  const [from, to] = useMemo(() => bounds(bookings), [bookings])
  const cols = Math.max(1, (to - from) / COL_MIN)

  const hourMarks = useMemo(() => {
    const out: { label: string; col: number }[] = []
    for (let m = from; m <= to; m += 60) {
      out.push({ label: `${String(Math.floor(m / 60)).padStart(2, '0')}:00`, col: (m - from) / COL_MIN })
    }
    return out
  }, [from, to])

  /* Tables grouped by room, in the order the venue lists them, so the grid
     reads the way the owner walks the floor. */
  const rows = useMemo(
    () =>
      zones.map((z) => ({
        zone: z,
        tables: tables.filter((t) => t.zone === z.id),
      })),
    [],
  )

  const byTable = useMemo(() => {
    const m = new Map<string, Booking[]>()
    for (const b of live) m.set(b.tableId, [...(m.get(b.tableId) ?? []), b])
    return m
  }, [live])

  return (
    <div className="grid">
      <div className="grid__head" style={{ gridTemplateColumns: `120px repeat(${cols}, 1fr)` }}>
        <span />
        {hourMarks.map((h) => (
          <span key={h.label} className="grid__hour" style={{ gridColumn: h.col + 2 }}>
            {h.label}
          </span>
        ))}
      </div>

      {rows.map(({ zone, tables: zoneTables }) => (
        <div key={zone.id} className="grid__zone">
          <div className="grid__zoneName">{zone.name}</div>
          {zoneTables.map((t) => {
            const mine = byTable.get(t.id) ?? []
            return (
              <div
                key={t.id}
                className="grid__row"
                style={{ gridTemplateColumns: `120px repeat(${cols}, 1fr)` }}
              >
                <span className="grid__table">
                  {t.label}
                  <i>{t.seats} seats</i>
                </span>
                {Array.from({ length: cols }, (_, i) => (
                  <span key={i} className="grid__cell" style={{ gridColumn: i + 2 }} />
                ))}
                {mine.map((b) => {
                  const d = new Date(b.startsAt)
                  const start = d.getHours() * 60 + d.getMinutes()
                  const col = Math.round((start - from) / COL_MIN) + 2
                  const span = Math.max(1, Math.round(b.durationMin / COL_MIN))
                  return (
                    <span
                      key={b.id}
                      className={`grid__booking${b.status === 'seated' ? ' is-seated' : ''}`}
                      style={{ gridColumn: `${col} / span ${span}` }}
                      title={`${b.guestName} · ${b.partySize} guests · ${b.phone}`}
                    >
                      <b>{b.guestName}</b>
                      <i>{b.partySize}</i>
                    </span>
                  )
                })}
              </div>
            )
          })}
        </div>
      ))}

      <p className="grid__note">
        Each block is a sitting, drawn where it actually falls. Blank means the
        table is free at that time — not that nobody wanted it.
      </p>
    </div>
  )
}
