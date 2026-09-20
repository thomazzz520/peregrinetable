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

The §11 acceptance checks are done. `npm run check:data`, `check:guest` and
`check:tones` pass, and `window.__auditScene()` was run at phone width against
the live `/book` scene: zero lights; 165 materials, all MeshBasicMaterial and
untextured; orthographic with equal XYZ; 364 face groups all carrying the value
their world normal dictates; the accent on one mesh. Five of five.

To run it again: it is dev-only and lives on the floor plan's canvas, so it
reports real checks only on `/book` with the gate submitted — party size, date
and time — since that is what mounts the room. Before then it is a stub that
says so.

## Checking the rendered output

`npm run check:render` drives a real headless Chrome and measures what
actually reached the screen. It needs the app running:

```bash
npm run dev            # in one terminal
npm run check:render   # in another
```

**Why it exists.** Every other check reasons about values: a hex in a token
file, a percentage in a fixture. Four defects got through all of them, and
through screenshots, because they are only defects once the browser has
resolved cascade, layout and compositing:

- a bar painted transparent, because `var(--rev-accent)` was scoped to a card
  and the panel renders in a different subtree, so the rule was simply never
  in scope
- a tooltip that opened 94px above its own container and covered the tabs
- two chart tones 40 RGB units apart and identical in luminance, so the
  largest segment in every bar had no edge against its neighbour
- an illustration overlapping a metrics column by 38px, but only at the
  narrowest three-across width

Four assertion kinds, one per failure mode: `painted`, `inside`, `clear`,
`edge`. Scenes and assertions live at the top of `scripts/check-render.ts`;
adding one is a few lines and no plumbing.

**Reading a failure.** Each one names the element, the measurement, the
threshold and the defect it is guarding against. An `edge` failure also
prints the two pixels it sampled, so you can tell a genuine collision from a
probe that missed.

**Two things worth knowing before extending it.**

`clear` compares the union of an element's *drawn* children when given
`{ sel, union: true }`. Use it for anything SVG: `.weatherScene svg` is
`inset: 0` and covers the whole card while the figures inside occupy only
the right of it, so comparing boxes reports a 278px overlap nobody can see.

Captures prove themselves before any pixel is read. This app software-renders
a three.js floor plan behind every panel, so the compositor lags the DOM, and
a capture taken too early shows the dashboard still sitting underneath an
open panel. `settledFrame` keeps capturing until a known colour matches
*and* two consecutive frames agree, which also rules out catching a panel
mid-fade. Do not replace that with a sleep.

Screenshots of every scene land in `screenshots/`, which is gitignored.
`CHECK_RENDER_WIDTHS=1085,1440` picks the widths, `CHECK_RENDER_DEBUG=1`
prints probe geometry, and `CHROME_PATH` points at a browser if it is
somewhere unusual.

**It runs in CI, so it is not optional.** `.github/workflows/ci.yml` lints,
typechecks, runs `npm run check`, builds, then starts the dev server and runs
`check:render` against it. The screenshots are uploaded as an artifact on
every run, passing or not, because on a failure they are the fastest way to
see what the assertion was looking at and on a pass they make a visual change
reviewable from the run.

Two adjustments happen automatically when `CI` is set and are not wanted
locally: Chrome gets `--no-sandbox` and `--disable-dev-shm-usage`, because a
container has no user namespace for the sandbox and a 64MB `/dev/shm` that
Chrome will otherwise exhaust mid-run, and the server wait goes from 5s to
90s so the check does not race vite's first compile.

`npm run check` is the browser-free half: fixtures, palettes and booking
rules. It is fast and it runs before the build, so a bad token fails in
seconds rather than after a browser has started.

**Lint warnings do not fail CI, deliberately.** `oxlint` exits 0 on warnings
and there are pre-existing ones, mostly `set-state-in-effect` and `refs`
findings in `RealFloor3D.tsx`. Turning on `--deny-warnings` is worth doing
and is its own piece of work: it blocks every PR until those are cleared, so
it needs the cleanup to land first. It was kept out of the change that
introduced CI on purpose, so that CI arriving and the codebase going red are
not the same event.

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
