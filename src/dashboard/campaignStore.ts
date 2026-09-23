import { useCallback, useEffect, useState } from 'react'
import { CAMPAIGNS, type Campaign } from './menu'

/* ------------------------------------------------------------------ *
 * Where campaigns live
 *
 * They used to live in a `useState` inside the component that drew them,
 * which sat inside the revenue popup. Creating one worked and a second one
 * appended correctly; closing the panel unmounted the component and took
 * the whole list with it. So the symptom read as "campaigns overwrite each
 * other" when what actually happened is that every campaign ever made was
 * discarded the moment the panel closed, and the two seeded examples came
 * back. A list that cannot outlive the panel drawing it is not a list.
 *
 * They now live in `localStorage`, under one key, and the Campaigns section
 * owns them rather than the revenue panel.
 *
 * WHAT THAT MEANS, EXACTLY. This is the browser's own storage, the same
 * mechanism `localAdapter` already uses for bookings. Campaigns survive a
 * reload, a navigation and a closed tab. They do NOT travel: another
 * browser, another machine or a cleared cache starts again from the seeded
 * examples, because there is no account and no server behind this. That is
 * a real limit and the page says so rather than implying a saved record.
 * ------------------------------------------------------------------ */

const KEY = 'peacock.campaigns.v1'

/** Browser-local, not a server. The page says so where the owner can see. */
export const CAMPAIGNS_ARE_LOCAL_ONLY = true

/** Everything a stored campaign carries beyond its definition. */
export type StoredCampaign = Campaign & {
  /** When it was made, so the list can be ordered and dated. */
  createdAt: string
  /** Seeded examples are marked, so "you made this" stays true. */
  seeded?: boolean
}

const seed = (): StoredCampaign[] =>
  CAMPAIGNS.map((c, i) => ({
    ...c,
    seeded: true,
    /* Fixed dates rather than "now", so a seeded example does not claim to
       have been written the first time somebody opened the page. */
    createdAt: ['2026-09-15T09:00:00.000Z', '2026-09-18T09:00:00.000Z'][i] ?? '2026-09-15T09:00:00.000Z',
  }))

function read(): StoredCampaign[] {
  if (typeof window === 'undefined') return seed()
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return seed()
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return seed()
    /* Anything without an id is not a campaign, whatever else it is. A
       corrupt or half-written key should not take the page down with it. */
    return parsed.filter((c) => c && typeof c.id === 'string' && c.id)
  } catch {
    return seed()
  }
}

function write(list: StoredCampaign[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* Private windows and full quotas both throw here. Losing the write is
       survivable; taking the page down over it is not. */
  }
}

/**
 * The campaign list, and the four things that happen to it.
 *
 * Nothing is ever silently replaced: `save` matches on id and appends when
 * it does not find one, which is what makes "every campaign created stays
 * visible" true by construction rather than by remembering to be careful.
 */
export function useCampaigns() {
  const [list, setList] = useState<StoredCampaign[]>(read)

  useEffect(() => { write(list) }, [list])

  const save = useCallback((c: Campaign) => {
    setList((l) => {
      const at = l.findIndex((x) => x.id === c.id)
      if (at === -1) {
        return [...l, { ...c, createdAt: new Date().toISOString() }]
      }
      /* Keep the original creation date and the seeded flag: editing a
         campaign does not make it a new one. */
      return l.map((x) => (x.id === c.id ? { ...x, ...c } : x))
    })
  }, [])

  const remove = useCallback((id: string) => {
    setList((l) => l.filter((x) => x.id !== id))
  }, [])

  const reset = useCallback(() => setList(seed()), [])

  return { list, save, remove, reset }
}
