# The Peacock — booking system

Table-first restaurant booking. Guest picks a table on an isometric floor
plan, then a time. Owner console manages bookings.

## Visual work

Two design systems, and which applies depends on the surface.

**The booking floor plan** (`src/scene`, `src/components`, `src/routes`) is
governed by `.claude/rules/art-direction.md` — the contained diorama that
document was written for and whose reference images specify it. Read it before
writing any component, material, or stylesheet there.

Never, in the booking floor plan:
- PerspectiveCamera — the scene is orthographic only
- MeshStandardMaterial / MeshPhysicalMaterial — MeshBasicMaterial only
- Any light component. The scene has zero lights.
- box-shadow, backdrop-filter, or border-radius above 3px

**The office scene, owner dashboard, shell and brain** (`src/office`,
`src/dashboard`, `src/shell`, `src/brain`, `src/three`) run the Peregrine
design system in `.antigravity.md`, which allows lights, MeshStandardMaterial
and a perspective camera, and carries its own shadow and corner-radius rules.
The prohibitions above are not in force there. `.antigravity.md` in turn defers
to `art-direction.md` as the source of truth for the floor plan's camera,
materials and palette, so the two documents meet at the same boundary rather
than overlapping.

**`src/theme` is shared and belongs to neither.** `theme.css` is pulled into
`src/index.css`, so it styles both systems; `tokens.ts` holds the Peregrine
department palette that `.antigravity.md` locks. Change either with both
systems in mind, and `src/data` stays design-system-agnostic by nature.

## Conventions

- All spatial coordinates in metres, never pixels
- Data access only through `src/data/` adapters, never direct in components

## Phone layout

The phone pass has landed. It is scoped to one `@media (max-width: 767px)`
block at the foot of `src/index.css`; nothing above that line changes, which is
what keeps the computer build exactly as it was.

The layout inverts rather than overlaying. Details go on top, the room sits
underneath at a fixed height, and the selection menu drops down and pushes the
room further down the page instead of covering it, so art direction §8's
"panels on one edge, never over the scene" and "the scene never resizes" both
still hold. The dock becomes a disclosure with a 48px toggle; the run sheet's
8-column table becomes one card per booking, each cell carrying its own column
heading through `td[data-label]::before`; `.datebar` wraps; `html, body, #root`
run on `100dvh`.

The room is sized by its own projected aspect (`--mv-room-aspect`, from the
same constants `fit()` frames with in `src/scene/layout.ts`) rather than a
share of the viewport, because the footprint is 1.254:1 and a portrait phone
would otherwise reserve 41% more height than the room can ever draw into.

Touch: tap selects, one finger scrolls the page past the room, two fingers
pinch to zoom within the same §1 clamps as the wheel. There is deliberately no
touch equivalent for §4's hover bob. A tap fires `pointerover` with no matching
`pointerout`, so the table would stay lifted; `TableMesh` restricts the lift to
mouse and pen, and selection is what a tap means.

Still owed: the §11 acceptance checks have not been run at phone width.
`npm run check:data`, `check:guest` and `check:tones` pass, but
`window.__auditScene()` needs a browser at ~390px and has not been run there
yet.

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
