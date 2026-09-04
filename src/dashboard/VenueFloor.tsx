import { useMemo } from 'react'
import { tableOccupancy, tables, todayKey, type Booking, type Table, type TableState } from '../data'
import FloorPlan from '../scene/FloorPlan'

/**
 * The room itself — what clicking the building in the middle of the office
 * opens. The same isometric scene the guest books on, but read across the
 * whole service rather than one sitting: how spoken-for each table is today.
 *
 * Read-only. Changing a booking is the runsheet's job.
 */
export default function VenueFloor({ bookings }: { bookings: Booking[] }) {
  const today = todayKey()
  /* tableOccupancy already answers this across the whole service — free,
     spoken for in part, or busy — which is the owner's question, not the
     guest's "can I have it at 7pm". */
  const stateOf = useMemo(
    () => (table: Table): TableState => tableOccupancy(table, today, bookings),
    [bookings, today],
  )

  return (
    <div className="venuefloor">
      <div className="venuefloor__scene">
        <FloorPlan freeSpin tables={tables} stateOf={stateOf} />
      </div>
      <ul className="venuefloor__key">
        <li><i className="is-available" />Free most of the day</li>
        <li><i className="is-partly" />Spoken for in part</li>
        <li><i className="is-full" />Busy across the service</li>
      </ul>
    </div>
  )
}
