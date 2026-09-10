import type { Booking, NewBooking } from '../src/data/types.js'
import { checkBooking, isBookingStatus, sanitise } from '../src/data/rules.js'
import { venueDateKey } from '../src/data/time.js'
import {
  COOKIE,
  clearAttempts,
  clearedCookie,
  issueSession,
  readCookie,
  readSession,
  recordAttempt,
  sessionCookie,
  tooManyAttempts,
  verifyPassword,
} from './auth.js'
import { storeFromEnv, type Store } from './store.js'

/**
 * The API, written against plain request/response shapes so the same handlers
 * run behind a Vercel function and behind the local dev server.
 *
 * Every rule that matters is applied here rather than in the browser: who may
 * read contact details, whether a booking may stand, and how long a session
 * lasts. The client is free to check the same things for a better experience,
 * but nothing depends on it doing so.
 */

export type ApiRequest = {
  method: string
  path: string
  query: Record<string, string>
  headers: Record<string, string | undefined>
  body: unknown
  ip: string
}

export type ApiResponse = {
  status: number
  body?: unknown
  headers?: Record<string, string>
}

const json = (status: number, body?: unknown, headers?: Record<string, string>): ApiResponse => ({
  status,
  body,
  headers,
})

/** What a guest is allowed to see: enough to compute availability, and no more. */
type PublicBooking = Pick<
  Booking,
  'id' | 'tableId' | 'startsAt' | 'durationMin' | 'partySize' | 'status'
>

function redact(b: Booking): PublicBooking {
  return {
    id: b.id,
    tableId: b.tableId,
    startsAt: b.startsAt,
    durationMin: b.durationMin,
    partySize: b.partySize,
    status: b.status,
  }
}

const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function newReference(existing: Set<string>): string {
  for (let attempt = 0; attempt < 20; attempt++) {
    const bytes = crypto.getRandomValues(new Uint8Array(6))
    let out = ''
    for (const b of bytes) out += REF_ALPHABET[b % REF_ALPHABET.length]
    const ref = `PK-${out}`
    if (!existing.has(ref)) return ref
  }
  throw new Error('could not allocate a reference')
}

export type Config = {
  store: Store
  passwordHash: string | undefined
  sessionSecret: string
  secureCookies: boolean
}

export function configFromEnv(env: NodeJS.ProcessEnv): Config {
  const production = env.NODE_ENV === 'production' || env.VERCEL === '1'
  const secret = env.PEACOCK_SESSION_SECRET
  if (production && !secret) {
    throw new Error('PEACOCK_SESSION_SECRET must be set in production')
  }
  return {
    store: storeFromEnv(env),
    passwordHash: env.PEACOCK_OWNER_PASSWORD_HASH,
    // A generated secret is fine for a dev restart; in production the check
    // above has already refused to start without a real one.
    sessionSecret: secret ?? 'dev-only-secret-not-for-production',
    secureCookies: production,
  }
}

function isOwner(req: ApiRequest, config: Config): boolean {
  const token = readCookie(req.headers.cookie, COOKIE)
  return readSession(token, config.sessionSecret) !== null
}

export async function handle(req: ApiRequest, config: Config): Promise<ApiResponse> {
  const { store } = config

  // --- session ---------------------------------------------------------
  if (req.path === '/session') {
    if (req.method === 'GET') {
      return isOwner(req, config) ? json(200, { role: 'owner' }) : json(401, { error: 'Not signed in.' })
    }

    if (req.method === 'DELETE') {
      return json(204, undefined, { 'Set-Cookie': clearedCookie(config.secureCookies) })
    }

    if (req.method === 'POST') {
      if (!config.passwordHash) {
        return json(503, { error: 'Owner sign-in is not configured on this server.' })
      }
      if (tooManyAttempts(req.ip)) {
        return json(429, { error: 'Too many attempts. Try again later.' })
      }

      const { username, password } = (req.body ?? {}) as Record<string, unknown>
      const okUser = typeof username === 'string' && username.trim() === (process.env.PEACOCK_OWNER_USERNAME ?? 'owner')
      const okPass = typeof password === 'string' && verifyPassword(password, config.passwordHash)

      if (!okUser || !okPass) {
        recordAttempt(req.ip)
        // One message for both, so this can't be used to enumerate usernames.
        return json(401, { error: 'Those details did not match.' })
      }

      clearAttempts(req.ip)
      return json(200, { role: 'owner' }, {
        'Set-Cookie': sessionCookie(issueSession(config.sessionSecret), config.secureCookies),
      })
    }

    return json(405, { error: 'Method not allowed.' })
  }

  // --- bookings --------------------------------------------------------
  if (req.path === '/bookings') {
    if (req.method === 'GET') {
      const date = req.query.date
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return json(400, { error: 'A date in YYYY-MM-DD form is required.' })
      }
      const all = await store.all()
      const onDay = all
        .filter((b) => venueDateKey(new Date(b.startsAt)) === date)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))

      // Contact details are for the venue, not for whoever loads the page.
      return json(200, isOwner(req, config) ? onDay : onDay.map(redact))
    }

    if (req.method === 'POST') {
      const input = sanitise((req.body ?? {}) as NewBooking)
      if (!input.guestName || !input.phone || !input.email) {
        return json(400, { error: 'A name, a phone number and an email are required.' })
      }

      const all = await store.all()
      const violation = checkBooking(input, all)
      if (violation) return json(409, { error: violation.message, code: violation.code })

      const booking: Booking = {
        ...input,
        id: newReference(new Set(all.map((b) => b.id))),
        // A guest cannot talk themselves into a seated or cancelled booking.
        status: 'confirmed',
      }
      await store.replace([...all, booking])
      // The guest gets their own booking back in full; that is their own data.
      return json(201, booking)
    }

    return json(405, { error: 'Method not allowed.' })
  }

  const match = req.path.match(/^\/bookings\/([A-Za-z0-9-]+)$/)
  if (match) {
    if (!isOwner(req, config)) return json(401, { error: 'Not signed in.' })
    if (req.method !== 'PATCH') return json(405, { error: 'Method not allowed.' })

    const id = match[1]
    const all = await store.all()
    const i = all.findIndex((b) => b.id === id)
    if (i === -1) return json(404, { error: 'No such booking.' })

    const patch = sanitise((req.body ?? {}) as Partial<Booking>)

    /* The guard below is an allowlist of two, so an unrecognised status used
       to fail both arms, skip checkBooking entirely and persist anyway. The
       body is cast, not parsed, so the status has to be checked at runtime. */
    if ('status' in patch && !isBookingStatus(patch.status)) {
      return json(400, { error: `${JSON.stringify(patch.status)} is not a booking status.` })
    }

    const next: Booking = { ...all[i], ...patch, id: all[i].id }

    if (next.status === 'confirmed' || next.status === 'seated') {
      const violation = checkBooking(next, all, id)
      if (violation) return json(409, { error: violation.message, code: violation.code })
    }

    const updated = [...all]
    updated[i] = next
    await store.replace(updated)
    return json(200, next)
  }

  return json(404, { error: 'No such endpoint.' })
}
