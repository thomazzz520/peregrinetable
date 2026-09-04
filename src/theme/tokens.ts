/**
 * Peregrine Partners — the one place colour, type, spacing and radius are
 * decided. Everything else imports from here.
 *
 * Why a TypeScript module rather than a Tailwind config: this app is half
 * DOM and half WebGL. Three.js materials take colour values, not class
 * names, so the office scene, the brain and the floor plan cannot consume
 * a utility class. TS is therefore the source of truth and `theme.css`
 * mirrors it into custom properties for the DOM half. Tailwind is
 * installed in this repo but deliberately never imported (see the header
 * of `index.css`), so extending its config would define tokens nothing
 * reads.
 *
 * Every custom property is prefixed `--pp-` so nothing here can collide
 * with the `--mv-*` Monument Valley palette the booking scene already
 * owns. The two palettes are separate on purpose; see RADIUS below.
 */

/* ------------------------------------------------------------------ *
 * Colour
 * ------------------------------------------------------------------ */

/** Ink, ground and line. Taken from the venue brain, which is the design
 *  the office and dashboard are being brought in line with. */
export const ink = {
  /** Primary text, dark UI, the wordmark. */
  base: '#162540',
  /** Secondary text — captions, metadata, inactive labels. */
  soft: '#3F4A63',
  /** Tertiary — hint text, disabled. Not for anything load-bearing. */
  muted: '#8A8577',
} as const

export const ground = {
  /** Page background. */
  paper: '#F4F0E8',
  /** Recessed areas — wells, inset panels. */
  bone: '#EFE9DD',
  /** Heavier fill — pressed states, dividers between sections. */
  clay: '#E4DBCB',
  /** Heaviest neutral fill. */
  sand: '#D9CFBC',
  /** Raised surfaces — cards, sheets, popovers. */
  panel: '#FBF8F2',
  /** Hairlines and card borders. */
  line: '#E2D9C8',
} as const

/** The accent. Sage is the resting state, sage-deep is hover/active/selected. */
export const accent = {
  sage: '#7FD3B4',
  sageDeep: '#4FAE90',
} as const

/** Agent and department status. Green is "fine", yellow is "needs you".
 *  There is deliberately no red: nothing in this product is an emergency,
 *  and a red dot on an owner's dashboard at 6am is a lie. */
export const status = {
  ok: '#5AA172',
  attention: '#D9A83E',
} as const

/**
 * Muted domain tints — one per department, used for card washes, node
 * colours in the brain, and platform tints in the office.
 *
 * The first four are the brain's existing values. `admin` and `bookings`
 * are proposed, not inherited: the office scene has six platforms and the
 * brain only ever defined four. They sit in the two clear gaps in the hue
 * circle (teal ~165, violet ~262) at the same muted lightness as the rest,
 * so the set still reads as one family. Swap them if you have better ones.
 */
export const domain = {
  finance: '#9FB090', // soft sage
  marketing: '#A3B8D2', // blue
  suppliers: '#D9BD82', // gold
  roster: '#D0A8A1', // rose
  admin: '#94C0B6', // teal — proposed
  bookings: '#B8A8CE', // violet — proposed
} as const

export type DomainId = keyof typeof domain

/* ------------------------------------------------------------------ *
 * Typography
 * ------------------------------------------------------------------ */

/**
 * Display is the serif on "Peregrine Partners", section headers and
 * department names. Body is the sans everything else is set in. Mono is
 * for figures, timestamps and axis labels — the dashboard leans on it
 * heavily and it carries a lot of the product's character.
 *
 * These are stacks, not final choices. The booking app self-hosts its two
 * faces from `/public/fonts` on purpose — `vercel.json`'s CSP admits no
 * third-party origin, and a Google Fonts request would hand every guest's
 * IP to a third party. The dashboard currently links Google Fonts and so
 * would fail that CSP on merge. Deciding and self-hosting the real display
 * face is an open item; until then these degrade to system serifs.
 */
export const font = {
  display: '"Fraunces", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
  body: '"Karla", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
} as const

/** Type scale, in px. Deliberately short — six sizes, not twelve. */
export const size = {
  micro: 9, // uppercase mono labels
  caption: 11,
  body: 13,
  lead: 15,
  title: 17,
  display: 24,
} as const

/* ------------------------------------------------------------------ *
 * Spacing
 * ------------------------------------------------------------------ */

/** 4px base. Use these rather than arbitrary values. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 18,
  xl: 26,
  xxl: 40,
} as const

/* ------------------------------------------------------------------ *
 * Radius — read the note, this is where the two design languages meet
 * ------------------------------------------------------------------ */

/**
 * Two scales, on purpose.
 *
 * `shell` is the frame: nav, toolbars, buttons, the app chrome. Squared
 * off, near-zero radius. `soft` is the content inside it: message bubbles,
 * agent chips, department cards. Rounded. The contrast between the two is
 * the point — a soft chip reads as an object sitting inside a hard frame.
 * Do not collapse these into one scale.
 *
 * CONFLICT, flagged rather than silently resolved: this repo's art
 * direction (`.claude/rules/art-direction.md` §0) bans "border radius
 * above 3px anywhere", and the booking scene's panels are built to it.
 * `soft` therefore cannot be applied inside the booking floor plan
 * without breaking that look. The intended split is that the art
 * direction governs the Monument Valley scene and `soft` governs the
 * office, brain and dashboard — but that scoping is a decision still
 * to be confirmed, so nothing consumes `soft` yet.
 */
export const radius = {
  shell: { none: 0, hair: 2, edge: 3 },
  soft: { chip: 10, card: 14, pill: 999 },
} as const
