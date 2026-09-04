import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  at,
  createBooking,
  dateLabel,
  listBookings,
  sittingFor,
  tableOfferAt,
  tableStateAt,
  tables,
  timeLabel,
  zones,
  type Booking,
  type SlotState,
  type Table,
  type TableState,
  BookingRejected,
} from '../data'
import FloorPlan from '../scene/FloorPlan'
import Gate, { type GateValue } from './Gate'
import TablePanel from './TablePanel'
import BookingForm, { type GuestDetails } from './BookingForm'
import Dock, { useDockScroll } from './Dock'

type Stage = 'browse' | 'details' | 'done'

/** Floor-plan state is the render vocabulary; this flow uses three of the four. */
function toTableState(state: SlotState): TableState {
  return state === 'booked' ? 'full' : state
}

const zoneName = (id: string) => zones.find((z) => z.id === id)?.name ?? id

/**
 * Pick where, then when. The whole guest journey — gate, floor plan, table
 * panel, details, confirmation — as one component, so the owner console's
 * "New booking" runs the identical flow rather than a second copy of it.
 */
export default function BookingFlow({
  onComplete,
  onExit,
  exitLabel = 'Back',
}: {
  onComplete?: (booking: Booking) => void
  onExit?: () => void
  exitLabel?: string
}) {
  const [gate, setGate] = useState<GateValue | null>(null)
  const [gateOpen, setGateOpen] = useState(true)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selected, setSelected] = useState<Table | null>(null)
  const [pickedSlot, setPickedSlot] = useState<Date | null>(null)
  const [stage, setStage] = useState<Stage>('browse')
  const [confirmed, setConfirmed] = useState<Booking | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dockOpen, setDockOpen] = useState(false)
  const { dock, scene, revealDock, revealScene } = useDockScroll()

  const chosenAt = useMemo(() => (gate ? at(gate.date, gate.time) : null), [gate])

  const refresh = useCallback(async (date: string) => {
    setBookings(await listBookings(date))
  }, [])

  useEffect(() => {
    if (gate) void refresh(gate.date)
  }, [gate, refresh])

  const stateOf = useCallback(
    (table: Table): TableState => {
      if (!gate || !chosenAt) return 'available'
      // tableOfferAt, not tableStateAt: a free table a size too big is held
      // back until every right-sized one is taken, so a party of two cannot
      // book out the only six-top.
      return toTableState(tableOfferAt(table, chosenAt, gate.partySize, tables, bookings))
    },
    [gate, chosenAt, bookings],
  )

  const selectTable = useCallback(
    (table: Table) => {
      setSelected(table)
      setStage('browse')
      setError(null)
      setDockOpen(true)
      revealDock()
      // Offer the time they asked for when this table can actually take it.
      if (gate && chosenAt) {
        const free =
          tableOfferAt(table, chosenAt, gate.partySize, tables, bookings) === 'available'
        setPickedSlot(free ? chosenAt : null)
      }
    },
    [gate, chosenAt, bookings, revealDock],
  )

  const applyGate = (value: GateValue) => {
    setGate(value)
    setGateOpen(false)
    setSelected(null)
    setPickedSlot(null)
    setStage('browse')
    setConfirmed(null)
    setDockOpen(false)
  }

  const confirm = async (details: GuestDetails) => {
    if (!selected || !pickedSlot || !gate) return
    setBusy(true)
    setError(null)
    try {
      const booking = await createBooking({
        tableId: selected.id,
        startsAt: pickedSlot.toISOString(),
        durationMin: sittingFor(gate.partySize),
        partySize: gate.partySize,
        guestName: details.guestName.trim(),
        phone: details.phone.trim(),
        email: details.email.trim(),
        notes: details.notes.trim() || undefined,
      })
      setConfirmed(booking)
      setStage('done')
      setDockOpen(true)
      await refresh(gate.date)
      onComplete?.(booking)
    } catch (e) {
      // The adapter rejects with the reason; a guest deserves to see it rather
      // than a shrug — most often the table was taken while they were typing.
      setError(e instanceof BookingRejected ? e.message : 'That did not save. Try again.')
      await refresh(gate.date)
    } finally {
      setBusy(false)
    }
  }

  // What the collapsed phone bar says. Never rendered on a computer.
  const dockSummary =
    stage === 'done'
      ? 'Booking confirmed'
      : stage === 'details' && selected
        ? `${selected.label} — your details`
        : selected
          ? `${selected.label} · ${zoneName(selected.zone)} · seats ${selected.seats}`
          : 'Pick a table'

  const startAgain = () => {
    setConfirmed(null)
    setSelected(null)
    setPickedSlot(null)
    setStage('browse')
    setGateOpen(true)
    setDockOpen(false)
  }

  return (
    <>
      {gate && !gateOpen ? (
        <div className="summary-row">
          <button type="button" className="summary" onClick={() => setGateOpen(true)}>
            <span className="t-13">
              {gate.partySize} {gate.partySize === 1 ? 'guest' : 'guests'}
            </span>
            <span className="summary__dot" aria-hidden="true" />
            <span className="t-13">{dateLabel(gate.date)}</span>
            <span className="summary__dot" aria-hidden="true" />
            <span className="t-13">{gate.time}</span>
            <span className="display t-11 ink-45 summary__change">Change</span>
          </button>
          {onExit ? (
            <button type="button" className="btn btn--quiet summary-row__exit" onClick={onExit}>
              {exitLabel}
            </button>
          ) : null}
        </div>
      ) : null}

      {!gate || gateOpen ? (
        <main className="app__body gate-wrap">
          <Gate
            value={gate}
            onSubmit={applyGate}
            onDismiss={gate ? () => setGateOpen(false) : onExit}
          />
        </main>
      ) : (
        <main className="app__body">
          <div className="guest__scene" ref={scene}>
            <FloorPlan
              tables={tables}
              stateOf={stateOf}
              selectedId={selected?.id ?? null}
              onSelect={selectTable}
            />
          </div>

          {/* The column is always here, so opening a panel never resizes the scene. */}
          <Dock
            summary={dockSummary}
            open={dockOpen}
            onToggle={() => setDockOpen((v) => !v)}
            onBackToRoom={revealScene}
            innerRef={dock}
          >
            {stage === 'done' && confirmed ? (
              <Confirmation booking={confirmed} onDone={startAgain} />
            ) : stage === 'details' && selected && pickedSlot ? (
              <BookingForm
                table={selected}
                gate={gate}
                slot={pickedSlot}
                busy={busy}
                error={error}
                onBack={() => setStage('browse')}
                onConfirm={confirm}
              />
            ) : selected && chosenAt ? (
              <TablePanel
                table={selected}
                state={tableStateAt(selected, chosenAt, gate.partySize, bookings)}
                gate={gate}
                chosenAt={chosenAt}
                bookings={bookings}
                tables={tables}
                pickedSlot={pickedSlot}
                onPickSlot={setPickedSlot}
                onPickTable={selectTable}
                onContinue={() => setStage('details')}
              />
            ) : (
              <div className="dock__body">
                <header className="dock__head">
                  <span className="display t-16">Pick a table</span>
                  {/* No legend: the desaturation does the explaining (§4). */}
                  <span className="t-13 ink-60">
                    The room is set for {gate.partySize}{' '}
                    {gate.partySize === 1 ? 'guest' : 'guests'} at {gate.time}. Choose where you
                    would like to sit.
                  </span>
                </header>
              </div>
            )}
          </Dock>
        </main>
      )}
    </>
  )
}

function Confirmation({ booking, onDone }: { booking: Booking; onDone: () => void }) {
  const table = tables.find((t) => t.id === booking.tableId)
  const start = new Date(booking.startsAt)
  return (
    <div className="dock__body enter">
      <header className="dock__head">
        <span className="display t-22">You're booked</span>
        <span className="t-13 ink-60">We'll see you then.</span>
      </header>

      <hr className="rule" />

      <span className="label">Reference</span>
      <p className="display t-16">{booking.id}</p>

      <hr className="rule" />

      <dl className="summary-list">
        <dt className="t-11 display ink-45">Table</dt>
        <dd className="t-13">
          {table?.label} · {table ? zoneName(table.zone) : ''}
        </dd>
        <dt className="t-11 display ink-45">When</dt>
        <dd className="t-13">
          {dateLabel(booking.startsAt.slice(0, 10))} at {timeLabel(start)}
        </dd>
        <dt className="t-11 display ink-45">Party</dt>
        <dd className="t-13">
          {booking.partySize} {booking.partySize === 1 ? 'guest' : 'guests'}
        </dd>
        <dt className="t-11 display ink-45">Name</dt>
        <dd className="t-13">{booking.guestName}</dd>
        {booking.notes ? (
          <>
            <dt className="t-11 display ink-45">Notes</dt>
            <dd className="t-13">{booking.notes}</dd>
          </>
        ) : null}
      </dl>

      <button type="button" className="btn dock__cta" onClick={onDone}>
        Book another table
      </button>
    </div>
  )
}
