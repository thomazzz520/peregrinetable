# The Peacock — booking system

Table-first restaurant booking. Guest picks a table on an isometric floor
plan, then a time. Owner console manages bookings.

## Visual work

Two design systems, and which applies depends on the surface.

**The booking floor plan** (`src/scene`, `src/components`) is governed by
`.claude/rules/art-direction.md` — the contained diorama that document was
written for and whose reference images specify it. Read it before writing any
component, material, or stylesheet there.

Never, in the booking floor plan:
- PerspectiveCamera — the scene is orthographic only
- MeshStandardMaterial / MeshPhysicalMaterial — MeshBasicMaterial only
- Any light component. The scene has zero lights.
- box-shadow, backdrop-filter, or border-radius above 3px

**The office scene, owner dashboard, shell and brain** (`src/office`,
`src/dashboard`, `src/shell`, `src/brain`) run the Peregrine design system in
`.antigravity.md`, which allows lights, MeshStandardMaterial and a perspective
camera, and carries its own shadow and corner-radius rules. The prohibitions
above are not in force there. `.antigravity.md` in turn defers to
`art-direction.md` as the source of truth for the floor plan's camera,
materials and palette, so the two documents meet at the same boundary rather
than overlapping.

## Conventions

- All spatial coordinates in metres, never pixels
- Data access only through `src/data/` adapters, never direct in components

## Not done yet — phone layout

Everything so far is desktop-first. A phone pass is still owed, and these are
the known blockers rather than a vague "make it responsive":

- `.dock` is `flex: 0 0 328px`. At ~390px wide that leaves ~60px for the scene
  and breaks the guest flow. It needs to dock to the bottom edge instead — art
  direction §8 wants panels on one edge and never overlaying the scene, which a
  bottom sheet satisfies and an overlay does not.
- The run sheet is an 8-column table; it has to become one card per booking.
- `.datebar` overflows: a 200px min-width label plus a 168px date input plus
  buttons. Needs to wrap.
- `html, body, #root` use `height: 100%`; should be `100dvh` so mobile browser
  chrome doesn't crop the scene.
- `fit()` in `src/scene/FloorPlan.tsx` frames the room by the wider projected
  span, so a portrait phone gets a small room. Probably wants its own fit
  factor under a breakpoint.
- There is no touch equivalent for hover (§4's bob) or for wheel zoom, and the
  canvas sets `touch-action: none`. Tap-to-select already works.

Re-run the §11 checks at phone width when that lands: `window.__auditScene()`
in dev, plus `npm run check:data`, `check:guest`, `check:tones`.

## Running the server API

The browser-only adapter is still the default, so `npm run dev` behaves exactly
as before. The API is opt-in:

```bash
# 1. a password hash for the owner (read from stdin, never from argv —
#    npm on Windows mangles `--` arguments when a script chains commands)
echo -n 'your password' | npm run hash-password

# 2. the API
PEACOCK_OWNER_PASSWORD_HASH='scrypt$...' \
PEACOCK_OWNER_USERNAME=owner \
PEACOCK_SESSION_SECRET="$(openssl rand -base64 32)" \
npm run dev:api

# 3. the app, pointed at it
VITE_USE_API=true npm run dev
```

In production `PEACOCK_SESSION_SECRET` is required and the server refuses to
start without it. `KV_REST_API_URL` / `KV_REST_API_TOKEN` switch the store from
the dev JSON file to Vercel KV; the file store is for local work only, since a
serverless filesystem is ephemeral and per-instance.

What the server enforces, and the browser therefore cannot be trusted with:

- the owner password exists only as a scrypt hash in the environment
- the session is an HMAC-signed HttpOnly cookie, so script can neither read
  nor forge it
- guests reading availability get bookings with the contact details stripped
- every write is re-checked against `src/data/rules.ts`
- sign-in attempts are throttled per instance

Both adapters and the API share `src/data/rules.ts`, so a booking rule is
written once and cannot drift between them.

## Not done yet — the deployment

`VITE_USE_API` is unset in the deployed demo, which therefore still runs the
localStorage placeholder BUILD.md asked for: the owner credentials are readable
in the bundle and guest details sit unencrypted in the browser. That build is
for showing the room, not for holding real bookings.
