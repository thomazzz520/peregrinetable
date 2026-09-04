import { useMemo } from 'react'
import type { Booking } from '../data'
import { tableLabel, tableSeats } from './useBookings'
import './runsheet.css'

/**
 * Today's runsheet — the owner's view of the diary.
 *
 * A plain list on purpose. This is the thing that replaces the paper
 * book by the till, so it has to survive being read at a glance, in a
 * rush, over someone's shoulder — and printed out and stuck by the pass.
 */

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false })

const STATUS_LABEL: Record<Booking['status'], string> = {
  confirmed: 'Booked',
  seated: 'Seated',
  cancelled: 'Cancelled',
  no_show: 'No show',
}

export default function RunSheet({
  bookings,
  covers,
  loading,
  error,
}: {
  bookings: Booking[]
  covers: number
  loading: boolean
  error: string | null
}) {
  const today = useMemo(
    () => new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }),
    [],
  )
  const live = bookings.filter((b) => b.status === 'confirmed' || b.status === 'seated')

  return (
    <div className="sheet">
      <div className="sheet__top">
        <div>
          <div className="sheet__date">{today}</div>
          <div className="sheet__tally">
            {live.length} {live.length === 1 ? 'booking' : 'bookings'} · {covers} covers
          </div>
        </div>
        {/* Printing is the browser's job; the stylesheet below hides
            everything that is not the sheet itself. */}
        <button className="sheet__print" onClick={() => window.print()}>
          Print
        </button>
      </div>

      {error && (
        <p className="sheet__note sheet__note--bad">
          {error}. Showing the last diary that loaded.
        </p>
      )}
      {loading && bookings.length === 0 && <p className="sheet__note">Reading the diary…</p>}
      {!loading && bookings.length === 0 && !error && (
        <p className="sheet__note">Nothing in the book for today yet.</p>
      )}

      {bookings.length > 0 && (
        <table className="sheet__table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Table</th>
              <th>Party</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className={b.status === 'cancelled' || b.status === 'no_show' ? 'is-off' : ''}>
                <td className="sheet__time">{time(b.startsAt)}</td>
                <td className="sheet__table-id">
                  {tableLabel(b.tableId)}
                  <span className="sheet__seats">{tableSeats(b.tableId)}</span>
                </td>
                <td className="sheet__party">{b.partySize}</td>
                <td>{b.guestName}</td>
                <td className="sheet__phone">{b.phone}</td>
                <td>
                  <span className={`sheet__status sheet__status--${b.status}`}>
                    {STATUS_LABEL[b.status]}
                  </span>
                </td>
                <td className="sheet__notes">{b.notes ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
