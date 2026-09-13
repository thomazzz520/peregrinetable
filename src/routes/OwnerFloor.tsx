import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  bookingsFor,
  currentOrNext,
  holdsTable,
  listBookings,
  sittingWindow,
  tableOccupancy,
  tables,
  timeLabel,
  todayKey,
  zones,
  type Booking,
  type DateKey,
  type Table,
} from '../data'
import FloorPlan from '../scene/FloorPlan'
import { sceneAspect } from '../scene/layout'
import { DateBar, OwnerBar } from '../components/OwnerChrome'
import Dock, { useDockScroll } from '../components/Dock'

const zoneName = (id: string) => zones.find((z) => z.id === id)?.name ?? id

/**
 * The guest's scene, unchanged, reading the day rather than one sitting: how
 * booked each table is across the service, with its current or next booking
 * on the table itself.
 */
export default function OwnerFloor() {
  const [date, setDate] = useState<DateKey>(todayKey())
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selected, setSelected] = useState<Table | null>(null)
  const [dockOpen, setDockOpen] = useState(false)
  const { dock, scene, revealDock, revealScene } = useDockScroll()

  const refresh = useCallback(async (key: DateKey) => {
    setBookings(await listBookings(key))
  }, [])

  useEffect(() => {
    void refresh(date)
  }, [date, refresh])

  const stateOf = useCallback(
    (table: Table) => tableOccupancy(table, date, bookings),
    [date, bookings],
  )

  const labelFor = useCallback(
    (table: Table) => {
      const next = currentOrNext(table.id, bookings)
      if (!next) return null
      return (
        <span className="pin">
          <span className="pin__time">{timeLabel(new Date(next.startsAt))}</span>
          <span className="pin__party">{next.partySize}</span>
        </span>
      )
    },
    [bookings],
  )

  const pickTable = useCallback(
    (table: Table) => {
      setSelected(table)
      setDockOpen(true)
      revealDock()
    },
    [revealDock],
  )

  const day = useMemo(
    () => (selected ? bookingsFor(selected.id, bookings) : []),
    [selected, bookings],
  )

  return (
    <div className="app">
      <OwnerBar />
      <DateBar date={date} onChange={setDate} />

      <main className="app__body">
        <div className="guest__scene" ref={scene} style={sceneAspect}>
          <FloorPlan
            tables={tables}
            stateOf={stateOf}
            selectedId={selected?.id ?? null}
            onSelect={pickTable}
            labelFor={labelFor}
          />
        </div>

        <Dock
          summary={selected ? `${selected.label} · ${zoneName(selected.zone)}` : 'The room'}
          open={dockOpen}
          onToggle={() => setDockOpen((v) => !v)}
          onBackToRoom={revealScene}
          innerRef={dock}
        >
          {selected ? (
            <div className="dock__body enter">
              <header className="dock__head">
                <span className="display t-22">{selected.label}</span>
                <span className="t-13 ink-60">
                  {zoneName(selected.zone)} · seats {selected.seats}
                </span>
              </header>

              <hr className="rule" />

              <span className="label">The whole day</span>
              {day.length ? (
                <div className="stack-8">
                  {day.map((b) => {
                    const [from, to] = sittingWindow(b)
                    return (
                      <div
                        key={b.id}
                        className={holdsTable(b) ? 'day-row' : 'day-row is-released'}
                      >
                        <span className="t-13 day-row__time">
                          {timeLabel(from)}–{timeLabel(to)}
                        </span>
                        <span className="t-13">{b.guestName}</span>
                        <span className="t-13 ink-60">
                          {b.partySize} · {b.phone}
                        </span>
                        {b.notes ? <span className="t-11 ink-45">{b.notes}</span> : null}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="t-13 ink-45">Nothing booked on this table today.</p>
              )}
            </div>
          ) : (
            <div className="dock__body">
              <header className="dock__head">
                <span className="display t-16">The room</span>
                <span className="t-13 ink-60">
                  Each table carries its current or next booking. Tap one for its whole day.
                </span>
              </header>
            </div>
          )}
        </Dock>
      </main>
    </div>
  )
}
