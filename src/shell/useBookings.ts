import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { listBookings, tables, venueDateKey, type Booking } from '../data'

/**
 * Today's diary, kept fresh.
 *
 * The API has no push channel — no websocket, no server-sent events — so
 * "a booking just came in" can only be discovered by asking. Polling every
 * twenty seconds is plenty at one venue's volume and costs a request that
 * returns a handful of rows; anything faster is noise. If this ever needs
 * to be instant, that is a server change, not a client one.
 */
const POLL_MS = 20_000

const byTime = (a: Booking, b: Booking) => a.startsAt.localeCompare(b.startsAt)
const live = (b: Booking) => b.status === 'confirmed' || b.status === 'seated'

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  /** Ids the owner has already had in front of them. */
  const seen = useRef<Set<string> | null>(null)
  const [unseen, setUnseen] = useState(0)

  const refresh = useCallback(async () => {
    try {
      const rows = (await listBookings(venueDateKey(new Date()))).sort(byTime)
      setBookings(rows)
      setError(null)
      // The first load is the baseline, not twenty new notifications.
      if (seen.current === null) seen.current = new Set(rows.map((r) => r.id))
      else setUnseen(rows.filter((r) => live(r) && !seen.current!.has(r.id)).length)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reach the diary')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const t = window.setInterval(() => void refresh(), POLL_MS)
    return () => window.clearInterval(t)
  }, [refresh])

  /** Called when the runsheet is opened: everything on it counts as read. */
  const markSeen = useCallback(() => {
    setBookings((rows) => {
      seen.current = new Set(rows.map((r) => r.id))
      return rows
    })
    setUnseen(0)
  }, [])

  const covers = useMemo(
    () => bookings.filter(live).reduce((n, b) => n + b.partySize, 0),
    [bookings],
  )

  return { bookings, covers, unseen, loading, error, refresh, markSeen }
}

/** Label lookup, so the runsheet can say "C1" rather than "t-c1". */
export const tableLabel = (id: string) => tables.find((t) => t.id === id)?.label ?? id
export const tableSeats = (id: string) => tables.find((t) => t.id === id)?.seats ?? 0
