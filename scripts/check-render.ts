/**
 * Rendered-output check.
 *
 * Every other check in this repo reasons about VALUES: a hex in a token
 * file, a percentage in a fixture. This one drives a real browser and
 * measures what actually reached the screen, because four defects this
 * session were invisible to value-level checking and to screenshots both:
 *
 *   1. The break-even bar's "kept" half painted TRANSPARENT. `--rev-accent`
 *      is scoped to `.card--revenue` and the panel renders inside
 *      `.pop__body`, so `var(--rev-accent)` resolved to nothing. The CSS was
 *      correct in isolation and the rule was never in scope.
 *   2. The hourly tooltip opened `calc(100% + 8px)` above a full-height
 *      column and landed 94px up, over the dimension tabs.
 *   3. Coffee and Food measured 1.01:1 against each other. 40 RGB units
 *      apart, identical luminance, so the largest segment in every bar had
 *      no edge against its neighbour.
 *   4. The weather illustration overlapped the metrics column by 38px at
 *      the narrowest three-across width.
 *
 * All four looked fine in a screenshot. What they have in common is that
 * they are only defects once the browser has resolved cascade, layout and
 * compositing, so the check has to ask the browser rather than the source.
 *
 * Four assertion kinds, one per failure mode above:
 *
 *   painted  an element that should carry a background actually does
 *   inside   an element stays within the bounds of another
 *   clear    two elements keep a minimum gap and never overlap
 *   edge     two sampled pixels differ by a minimum contrast ratio
 *
 * Usage:  npm run dev        (in another terminal)
 *         npm run check:render
 *
 * Screenshots of every scene land in `screenshots/`, which is gitignored.
 */
import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const APP = process.env.CHECK_RENDER_URL ?? 'http://localhost:5173/'
const PORT = Number(process.env.CHECK_RENDER_PORT ?? 9333)
const OUT = 'screenshots'
const WIDTHS = (process.env.CHECK_RENDER_WIDTHS ?? '1085,1440')
  .split(',').map((w) => Number(w.trim())).filter(Boolean)

/* ------------------------------------------------------------------ *
 * Assertions
 * ------------------------------------------------------------------ */

type Assertion =
  /** The element resolves to a real background. Catches a `var()` that is
   *  out of scope, which paints transparent rather than erroring. */
  | { kind: 'painted'; sel: string; why: string }
  /** The element stays inside another's box. Catches an overlay escaping
   *  the region it was positioned against. */
  | { kind: 'inside'; sel: string; within: string; why: string }
  /** Two elements never overlap and keep `gap` px between them.
   *  `union: true` measures the union of an element's drawn children
   *  instead of its own box, which is what an SVG needs: `.weatherScene
   *  svg` is `inset: 0` and covers the whole card, while the figures
   *  inside it occupy only the right of it. Comparing boxes there reports
   *  a 278px overlap that nobody can see. */
  | { kind: 'clear'; a: Region; b: Region; gap: number; why: string }
  /** Two sampled pixels differ by at least `min`:1. Catches two colours
   *  that are far apart in RGB and identical in luminance. */
  | { kind: 'edge'; a: Probe; b: Probe; min: number; why: string }

/** Where to sample: an element, and a point within its box as fractions. */
type Probe = { sel: string; at?: [number, number]; nth?: number }

/** A selector, or a selector whose PAINTED extent should be measured. */
type Region = string | { sel: string; union: true }
const regionSel = (r: Region) => (typeof r === 'string' ? r : r.sel)

/** A step is JS to evaluate, a pause in ms, or a selector to wait for. */
type Step = string | number | { wait: string }

type Scene = {
  name: string
  /** Run in order before asserting. */
  steps?: Step[]
  /** Clip the screenshot to this element. */
  shot?: string
  assert: Assertion[]
  /** Only run at these widths. Defaults to all. */
  widths?: number[]
  /** The element a captured frame must demonstrably show before any pixel
   *  is read from it. Defaults to the detail panel. */
  sentinel?: string
}

/* ------------------------------------------------------------------ *
 * The scenes. Each one pins a defect that actually shipped.
 * ------------------------------------------------------------------ */

const SCENES: Scene[] = [
  {
    name: 'revenue panel',
    steps: [{ wait: '.card--revenue' }, `document.querySelector('.card--revenue').click()`, { wait: '.pg__even' }, 300],
    shot: '.pop__card',
    assert: [
      { kind: 'painted', sel: '.pg__evenKept', why: 'break-even "kept" half painted transparent when --rev-accent was out of scope' },
      { kind: 'painted', sel: '.pg__evenCost', why: 'break-even "cost" half must carry its neutral' },
      {
        kind: 'edge', min: 1.35, why: 'stacked segments need a luminance edge or the bar reads as one block',
        a: { sel: '.pg__barStack i', nth: 0, at: [0.5, 0.5] },
        b: { sel: '.pg__barStack i', nth: 1, at: [0.5, 0.5] },
      },
    ],
  },
  {
    name: 'revenue hourly tooltip',
    steps: [
      { wait: '.card--revenue' }, `document.querySelector('.card--revenue').click()`,
      { wait: '.pg__barCol' },
      `document.querySelectorAll('.pg__barCol')[5].dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))`,
      `document.querySelectorAll('.pg__barCol')[5].focus()`,
      { wait: '.pg__tip' }, 200,
    ],
    shot: '.pg__split',
    assert: [
      { kind: 'inside', sel: '.pg__tip', within: '.pg__split', why: 'the tooltip climbed 94px over the dimension tabs' },
      { kind: 'clear', a: '.pg__tip', b: '.pg__tabs', gap: 0, why: 'the tooltip must never cover the dimension tabs' },
    ],
  },
  {
    name: 'foot traffic panel',
    steps: [
      { wait: '.glance__tab' },
      `[...document.querySelectorAll('.glance__tab')].find(b=>/foot/i.test(b.textContent)).click()`, 400,
      `document.querySelector('.card--glance').click()`, { wait: '.pg__trafficBar' }, 300,
    ],
    shot: '.pop__card',
    assert: [
      { kind: 'painted', sel: '.pg__trafficBar', why: 'the whole week painted transparent when --rev-neutral was out of scope' },
      { kind: 'painted', sel: '.pg__trafficDot--rest', why: 'the legend dot went transparent from the same bug, unnoticed' },
      {
        kind: 'edge', min: 1.3, why: 'every bar must separate from the one beside it',
        a: { sel: '.pg__trafficCol.is-today .pg__trafficBar', at: [0.5, 0.5] },
        b: { sel: '.pg__trafficBar', nth: 0, at: [0.5, 0.5] },
      },
    ],
  },
  {
    name: 'weather card',
    sentinel: '.card--glance',
    steps: [{ wait: '.weatherScene svg circle, .weatherScene svg rect, .weatherScene svg line' }, 700],
    shot: '.card--glance',
    assert: [
      { kind: 'clear', a: '.glance__head', b: { sel: '.weatherScene svg', union: true }, gap: 8, why: 'the illustration overlapped the metrics column by 38px at the narrow width' },
      { kind: 'clear', a: '.glance__sub', b: { sel: '.weatherScene svg', union: true }, gap: 8, why: 'the illustration must clear the caption too' },
    ],
  },
  {
    name: 'foot traffic card',
    sentinel: '.card--glance',
    steps: [
      { wait: '.glance__tab' },
      `[...document.querySelectorAll('.glance__tab')].find(b=>/foot/i.test(b.textContent)).click()`,
      { wait: '.bellSwing' }, 400,
    ],
    shot: '.card--glance',
    assert: [
      { kind: 'clear', a: '.glance__trafficAxis', b: { sel: '.trafficScene svg', union: true }, gap: 8, why: 'the bell sat on top of Saturday and Sunday' },
      { kind: 'painted', sel: '.glance__trafficCol.is-today', why: "today's bar must carry the accent" },
    ],
  },
  {
    name: 'reviews panel',
    steps: [{ wait: '.card--review' }, `document.querySelector('.card--review').click()`, { wait: '.pg__mentionsBar' }, 300],
    shot: '.pop__card',
    assert: [
      { kind: 'painted', sel: '.pg__mentionsBar > span', why: 'mention bars painted transparent if the accent falls out of scope' },
      {
        kind: 'edge', min: 2, why: 'the accented rating must read as coloured beside the ink stat next to it',
        a: { sel: '.pg__statN.is-accent', at: [0.18, 0.55] },
        b: { sel: '.pg__mentionsPhrase', at: [0.06, 0.6] },
      },
    ],
  },
]

/* ------------------------------------------------------------------ *
 * A very small CDP client
 * ------------------------------------------------------------------ */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

class CDP {
  private ws!: WebSocket
  private id = 0
  private waiting = new Map<number, (m: any) => void>()

  static async attach(port: number) {
    const c = new CDP()
    const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
    const page = (targets as any[]).find((t) => t.type === 'page')
    if (!page) throw new Error('no page target')
    c.ws = new WebSocket(page.webSocketDebuggerUrl)
    await new Promise((res, rej) => { c.ws.onopen = res as any; c.ws.onerror = rej as any })
    c.ws.onmessage = (e: any) => {
      const m = JSON.parse(e.data)
      const done = m.id && c.waiting.get(m.id)
      if (done) { done(m); c.waiting.delete(m.id) }
    }
    await c.send('Page.enable'); await c.send('Runtime.enable')
    return c
  }

  send(method: string, params: Record<string, unknown> = {}): Promise<any> {
    return new Promise((res) => {
      const i = ++this.id
      this.waiting.set(i, res)
      this.ws.send(JSON.stringify({ id: i, method, params }))
    })
  }

  async eval<T>(expression: string): Promise<T> {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.result?.exceptionDetails) {
      const d = r.result.exceptionDetails
      throw new Error(`in-page: ${d.exception?.description?.split('\n')[0] ?? d.text}`)
    }
    return r.result?.result?.value
  }

  /**
   * Grab the whole viewport once, and sample it in memory.
   *
   * This used to take a 1x1 `clip` per probe, which is neater and wrong:
   * a clipped capture over a `position: fixed` overlay came back without
   * the overlay, so every probe inside an open panel read the dashboard
   * background behind it and every pair compared equal at 1.00:1. One
   * full-viewport frame has no such ambiguity, and it is faster than N
   * round trips besides.
   */
  async frame(): Promise<Frame> {
    /* `captureBeyondViewport: false` is load-bearing. Left to default,
       Chrome may capture the whole scrollable document, and a
       `position: fixed` panel is then painted at the document's top while
       `getBoundingClientRect` still reports viewport coordinates. Probes
       deep inside an open panel then sample the dashboard behind it and
       every pair compares equal. */
    const r = await this.send('Page.captureScreenshot', { format: 'png', fromSurface: true })
    return decodePng(Buffer.from(r.result.data, 'base64'))
  }

  /**
   * A frame that demonstrably shows the current DOM.
   *
   * `fromSurface` captures what the compositor last produced, and this app
   * software-renders a three.js floor plan behind every panel, so the
   * surface can lag the DOM by a long way on a slow machine. The symptom is
   * nasty: `getComputedStyle` answers correctly, geometry is correct, and
   * every probe inside a freshly-opened panel samples the dashboard that is
   * still on screen underneath, so unrelated colours compare equal at
   * 1.00:1 and read as a contrast failure.
   *
   * No sleep is long enough to be both safe and fast, so the frame proves
   * itself instead: sample a point whose colour we already know from CSS,
   * and keep capturing until the pixels agree. That is a real readiness
   * condition, and it gets faster on quick machines rather than slower.
   */
  async settledFrame(sentinel: string, tries = 40): Promise<Frame> {
    const want = await this.eval<{ x: number; y: number; rgb: [number, number, number] } | null>(`(function(){
      var e = document.querySelector(${JSON.stringify(sentinel)});
      if (!e) return null;
      var r = e.getBoundingClientRect();
      var m = getComputedStyle(e).backgroundColor.match(/\\d+/g);
      if (!m) return null;
      return { x: r.x + 3, y: r.y + r.height / 2, rgb: [ +m[0], +m[1], +m[2] ] };
    })()`)
    /* Matching the expected colour is necessary and not sufficient: a panel
       fading in passes through colours close to its final one, and the
       popup's card is only ~8 units off the page behind it, so a tolerance
       loose enough to survive antialiasing also accepts a half-faded frame.
       Requiring two CONSECUTIVE captures to agree exactly rules that out,
       because a fade never repeats a value. */
    let prev: [number, number, number] | null = null
    for (let i = 0; i < tries; i += 1) {
      const f = await this.frame()
      if (!want) return f
      const dpr = f.w / (await this.eval<number>('window.innerWidth'))
      const got = sample(f, want.x * dpr, want.y * dpr)
      if (got) {
        const right = got.every((v, k) => Math.abs(v - want.rgb[k]!) <= 4)
        const still = prev !== null && got.every((v, k) => v === prev![k])
        if (right && still) return f
        prev = got
      }
      await sleep(80)
    }
    throw new Error(`the rendered frame never settled (${sentinel} still changing after ${tries} captures)`)
  }

  /**
   * Block until a selector exists.
   *
   * Fixed sleeps were racing the dev server: after an edit, vite rebuilds
   * and a step would fire against a half-mounted page, reporting "Cannot
   * read properties of null" as though the app were broken. A check that
   * cries wolf under HMR is a check people learn to ignore.
   */
  async waitFor(sel: string, timeoutMs = 10000) {
    const until = Date.now() + timeoutMs
    for (;;) {
      const there = await this.eval<boolean>(`!!document.querySelector(${JSON.stringify(sel)})`)
      if (there) return
      if (Date.now() > until) throw new Error(`${sel} never appeared within ${timeoutMs}ms`)
      await sleep(120)
    }
  }

  close() { try { this.ws.close() } catch { /* already gone */ } }
}

/* ------------------------------------------------------------------ *
 * A minimal PNG reader
 *
 * Chrome returns 8-bit RGB or RGBA, non-interlaced, which is the only case
 * handled here. Scanline filters must be undone or every row after the
 * first reads as noise.
 * ------------------------------------------------------------------ */

type Frame = { w: number; h: number; ch: number; data: Buffer }

function decodePng(buf: Buffer): Frame {
  let off = 8
  let w = 0, h = 0, ch = 3
  const idat: Buffer[] = []
  while (off < buf.length) {
    const len = buf.readUInt32BE(off)
    const type = buf.toString('ascii', off + 4, off + 8)
    const body = buf.subarray(off + 8, off + 8 + len)
    if (type === 'IHDR') {
      w = body.readUInt32BE(0); h = body.readUInt32BE(4)
      const depth = body[8]!, colour = body[9]!, interlace = body[12]!
      if (depth !== 8) throw new Error(`unsupported PNG bit depth ${depth}`)
      if (interlace !== 0) throw new Error('interlaced PNG not supported')
      ch = colour === 6 ? 4 : colour === 2 ? 3 : (() => { throw new Error(`unsupported PNG colour type ${colour}`) })()
    } else if (type === 'IDAT') idat.push(body)
    else if (type === 'IEND') break
    off += 12 + len
  }
  const raw = inflateSync(Buffer.concat(idat))
  const out = Buffer.alloc(w * h * ch)
  const stride = w * ch
  for (let y = 0; y < h; y += 1) {
    const filter = raw[y * (stride + 1)]!
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride)
    for (let i = 0; i < stride; i += 1) {
      const a = i >= ch ? out[y * stride + i - ch]! : 0
      const b = y > 0 ? out[(y - 1) * stride + i]! : 0
      const c = i >= ch && y > 0 ? out[(y - 1) * stride + i - ch]! : 0
      const x = line[i]!
      let v: number
      switch (filter) {
        case 0: v = x; break
        case 1: v = x + a; break
        case 2: v = x + b; break
        case 3: v = x + ((a + b) >> 1); break
        case 4: {
          const pp = a + b - c
          const pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c)
          v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)
          break
        }
        default: throw new Error(`unknown PNG filter ${filter}`)
      }
      out[y * stride + i] = v & 0xff
    }
  }
  return { w, h, ch, data: out }
}

const sample = (f: Frame, x: number, y: number): [number, number, number] | null => {
  const px = Math.round(x), py = Math.round(y)
  if (px < 0 || py < 0 || px >= f.w || py >= f.h) return null
  const i = (py * f.w + px) * f.ch
  return [f.data[i]!, f.data[i + 1]!, f.data[i + 2]!]
}

/* ------------------------------------------------------------------ *
 * Colour maths, same as the other checks
 * ------------------------------------------------------------------ */

const lum = ([r, g, b]: [number, number, number]) => {
  const c = [r, g, b].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!
}
const contrast = (a: [number, number, number], b: [number, number, number]) => {
  const [x, y] = [lum(a), lum(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

/* ------------------------------------------------------------------ *
 * Chrome
 * ------------------------------------------------------------------ */

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
]

function findChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH
  return CHROME_PATHS.find((p) => existsSync(p))
}

async function launchChrome(bin: string, profile: string): Promise<ChildProcess> {
  const child = spawn(bin, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--no-default-browser-check', '--disable-extensions',
    /* CI runs in a container: there is no user namespace for the sandbox to
       use, and /dev/shm is typically 64MB, which Chrome will exhaust and
       crash on mid-run. Neither flag is wanted on a developer machine. */
    ...(process.env.CI ? ['--no-sandbox', '--disable-dev-shm-usage'] : []),
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: 'ignore', detached: false })
  for (let i = 0; i < 60; i += 1) {
    await sleep(250)
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`)
      if (r.ok) return child
    } catch { /* not up yet */ }
  }
  child.kill()
  throw new Error(`Chrome did not open a debugging port on ${PORT} within 15s`)
}

/* ------------------------------------------------------------------ *
 * Running
 * ------------------------------------------------------------------ */

let fails = 0
const fail = (m: string) => { fails += 1; console.log(`  FAIL  ${m}`) }
const pass = (m: string) => console.log(`  pass  ${m}`)

type Box = { x: number; y: number; w: number; h: number }

const boxOf = (sel: string, nth = 0) => `(function(){
  var e = document.querySelectorAll(${JSON.stringify(sel)})[${nth}];
  if (!e) return null;
  var r = e.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
})()`

/** The union of everything actually drawn inside an element. Shapes under
 *  `clipPath`, `pattern` and `defs` are excluded: they define geometry, they
 *  do not paint it. */
const paintedBoxOf = (sel: string) => `(function(){
  var e = document.querySelector(${JSON.stringify(sel)});
  if (!e) return null;
  var n = e.querySelectorAll('circle,rect,line,path,polyline,polygon,ellipse,text');
  var L = Infinity, T = Infinity, R = -Infinity, B = -Infinity;
  for (var i = 0; i < n.length; i++) {
    if (n[i].closest('clipPath') || n[i].closest('pattern') || n[i].closest('defs')) continue;
    var r = n[i].getBoundingClientRect();
    if (r.width < 0.5 && r.height < 0.5) continue;
    if (r.left < L) L = r.left; if (r.top < T) T = r.top;
    if (r.right > R) R = r.right; if (r.bottom > B) B = r.bottom;
  }
  if (L === Infinity) return null;
  return { x: L, y: T, w: R - L, h: B - T };
})()`

const resolve = (r: Region) => (typeof r === 'string' ? boxOf(r) : paintedBoxOf(r.sel))

async function probe(cdp: CDP, frame: Frame, p: Probe): Promise<[number, number, number] | null> {
  const b = await cdp.eval<Box | null>(boxOf(p.sel, p.nth ?? 0))
  if (!b || b.w < 1 || b.h < 1) return null
  const [fx, fy] = p.at ?? [0.5, 0.5]
  /* The capture is at the device pixel ratio; rects are in CSS pixels. */
  const dpr = frame.w / (await cdp.eval<number>('window.innerWidth'))
  const [sx, sy] = [(b.x + b.w * fx) * dpr, (b.y + b.h * fy) * dpr]
  if (process.env.CHECK_RENDER_DEBUG) {
    const vp = await cdp.eval<{ iw: number; ih: number; sy: number }>(
      '({iw: window.innerWidth, ih: window.innerHeight, sy: window.scrollY})')
    console.log(`    [debug] ${p.sel}#${p.nth ?? 0} rect ${b.x.toFixed(0)},${b.y.toFixed(0)} ${b.w.toFixed(0)}x${b.h.toFixed(0)}` +
      ` | frame ${frame.w}x${frame.h} | vp ${vp.iw}x${vp.ih} scrollY ${vp.sy} | dpr ${dpr.toFixed(2)} | sampling ${sx.toFixed(0)},${sy.toFixed(0)}`)
  }
  return sample(frame, sx, sy)
}

async function runAssertion(cdp: CDP, a: Assertion, where: string, frame: () => Promise<Frame>) {
  const at = (msg: string) => `${where}: ${msg}`
  if (a.kind === 'painted') {
    const bg = await cdp.eval<string | null>(`(function(){
      var e = document.querySelector(${JSON.stringify(a.sel)});
      if (!e) return null;
      return getComputedStyle(e).backgroundColor;
    })()`)
    if (bg === null) return fail(at(`${a.sel} is not on the page`))
    const transparent = bg === 'transparent' || /rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(bg)
    if (transparent) fail(at(`${a.sel} resolves to ${bg}, so it paints nothing. ${a.why}`))
    else pass(at(`${a.sel} paints ${bg}`))
    return
  }
  if (a.kind === 'inside') {
    const [inner, outer] = [await cdp.eval<Box | null>(boxOf(a.sel)), await cdp.eval<Box | null>(boxOf(a.within))]
    if (!inner || !outer) return fail(at(`${a.sel} or ${a.within} is not on the page`))
    const over = [
      inner.x < outer.x - 1 && `${Math.round(outer.x - inner.x)}px past the left`,
      inner.y < outer.y - 1 && `${Math.round(outer.y - inner.y)}px above the top`,
      inner.x + inner.w > outer.x + outer.w + 1 && `${Math.round(inner.x + inner.w - outer.x - outer.w)}px past the right`,
      inner.y + inner.h > outer.y + outer.h + 1 && `${Math.round(inner.y + inner.h - outer.y - outer.h)}px below the bottom`,
    ].filter(Boolean)
    if (over.length) fail(at(`${a.sel} escapes ${a.within}, ${over.join(' and ')}. ${a.why}`))
    else pass(at(`${a.sel} stays inside ${a.within}`))
    return
  }
  if (a.kind === 'clear') {
    const [A, B] = [await cdp.eval<Box | null>(resolve(a.a)), await cdp.eval<Box | null>(resolve(a.b))]
    const [sa, sb] = [regionSel(a.a), regionSel(a.b)]
    if (!A || !B) return fail(at(`${sa} or ${sb} has nothing drawn in it`))
    /* Separation on EITHER axis is separation. Two things side by side may
       share rows, and two things stacked may share columns. */
    const gapX = Math.max(A.x, B.x) - Math.min(A.x + A.w, B.x + B.w)
    const gapY = Math.max(A.y, B.y) - Math.min(A.y + A.h, B.y + B.h)
    const gap = Math.max(gapX, gapY)
    const axis = gapX >= gapY ? 'horizontally' : 'vertically'
    if (gap < a.gap) {
      fail(at(`${sa} and ${sb} are ${gap < 0 ? `overlapping by ${Math.round(-gap)}px` : `only ${Math.round(gap)}px apart`}, want ${a.gap}px clear. ${a.why}`))
    } else {
      pass(at(`${sa} clears ${sb} by ${Math.round(gap)}px ${axis}`))
    }
    return
  }
  const f = await frame()
  const [pa, pb] = [await probe(cdp, f, a.a), await probe(cdp, f, a.b)]
  if (!pa || !pb) return fail(at(`${a.a.sel} or ${a.b.sel} is not on the page`))
  const r = contrast(pa, pb)
  /* Print what was actually read. A ratio on its own cannot tell you
     whether two tones are genuinely equal or whether the probe missed and
     sampled the same background twice. */
  const seen = `rgb(${pa}) vs rgb(${pb})`
  if (r < a.min) fail(at(`${a.a.sel} against ${a.b.sel} is ${r.toFixed(2)}:1, want ${a.min}:1 [${seen}]. ${a.why}`))
  else pass(at(`${a.a.sel} / ${a.b.sel} ${r.toFixed(2)}:1`))
}

async function main() {
  /* Node 20 hides WebSocket behind a flag; 22 and later have it natively and
     may eventually drop the flag entirely. Asking for it only when it is
     missing keeps this working on both without the npm script having to
     guess which Node is in front of it. */
  if (typeof WebSocket === 'undefined') {
    const again = spawn(process.execPath, ['--experimental-websocket', ...process.argv.slice(1)], { stdio: 'inherit' })
    /* `spawn`, not `spawnSync`, so this side stays responsive and can pass
       an interrupt down. Without that the child never hears a targeted kill
       on this process and leaves a headless Chrome behind. */
    for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
      process.on(sig, () => { try { again.kill(sig) } catch { /* gone */ } })
    }
    again.on('exit', (code, sig) => process.exit(sig ? 130 : code ?? 1))
    return
  }
  /* CI starts the dev server in the background a moment earlier, so give it
     a little while to come up rather than racing it. */
  const waitFor = Number(process.env.CHECK_RENDER_SERVER_WAIT ?? (process.env.CI ? 90 : 5))
  let up = false
  for (let i = 0; i < waitFor && !up; i += 1) {
    try {
      const r = await fetch(APP, { signal: AbortSignal.timeout(2000) })
      up = r.ok
    } catch { /* not yet */ }
    if (!up) await sleep(1000)
  }
  if (!up) {
    console.log(`Nothing is serving ${APP} after ${waitFor}s.`)
    console.log('Start the app first:  npm run dev')
    process.exit(1)
  }
  const bin = findChrome()
  if (!bin) {
    console.log('No Chrome or Chromium found. Looked in:')
    CHROME_PATHS.forEach((p) => console.log('  ' + p))
    console.log('Set CHROME_PATH to point at one.')
    process.exit(1)
  }

  mkdirSync(OUT, { recursive: true })
  const profile = join(tmpdir(), `peacock-render-${process.pid}`)
  const chrome = await launchChrome(bin, profile)
  const cdp = await CDP.attach(PORT)

  /* `finally` covers a normal exit and a thrown error, and nothing else.
     Interrupt the run, or close a pipe the output was going to, and the
     browser is orphaned: a stray headless Chrome and its renderers sit
     there holding memory until someone notices. Clean up on the signals
     too, and make it idempotent so a signal arriving mid-teardown does not
     double-kill. */
  let cleaned = false
  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    cdp.close()
    try { chrome.kill() } catch { /* already gone */ }
    try { rmSync(profile, { recursive: true, force: true }) } catch { /* best effort */ }
  }
  process.on('exit', cleanup)
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
    process.on(sig, () => { cleanup(); process.exit(130) })
  }

  console.log(`Rendered output, against ${APP}\n`)
  try {
    for (const width of WIDTHS) {
      console.log(`── ${width}px ──`)
      await cdp.send('Emulation.setDeviceMetricsOverride', { width, height: 1200, deviceScaleFactor: 1, mobile: false })
      for (const scene of SCENES) {
        if (scene.widths && !scene.widths.includes(width)) continue
        await cdp.send('Page.navigate', { url: APP })
        try {
          /* The dashboard is the app's own readiness signal. */
          await cdp.waitFor('.dash')
          await sleep(500)
          for (const step of scene.steps ?? []) {
            if (typeof step === 'number') await sleep(step)
            else if (typeof step === 'object') await cdp.waitFor(step.wait)
            else await cdp.eval(step)
          }
        } catch (e) {
          fail(`${scene.name}: setup failed, ${(e as Error).message}`)
          continue
        }
        /* One frame per scene, taken lazily and only if an `edge`
           assertion actually needs it. */
        /* One frame per scene, taken lazily, and proven against the panel
           it is meant to show before any probe reads from it. */
        let shared: Frame | null = null
        const sentinel = scene.sentinel ?? '.pop__card'
        const frame = async () => (shared ??= await cdp.settledFrame(sentinel))
        for (const a of scene.assert) {
          try { await runAssertion(cdp, a, scene.name, frame) }
          catch (e) { fail(`${scene.name}: ${(e as Error).message}`) }
        }
        if (scene.shot) {
          const b = await cdp.eval<Box | null>(boxOf(scene.shot))
          if (b) {
            const shot = await cdp.send('Page.captureScreenshot', {
              format: 'png',
              clip: { x: Math.max(0, b.x - 8), y: Math.max(0, b.y - 8), width: b.w + 16, height: Math.min(b.h + 16, 2400), scale: 2 },
            })
            const file = join(OUT, `${scene.name.replace(/\s+/g, '-')}-${width}.png`)
            writeFileSync(file, Buffer.from(shot.result.data, 'base64'))
          }
        }
      }
      console.log('')
    }
  } finally {
    cleanup()
  }

  console.log(`screenshots in ./${OUT}`)
  console.log(`\n${fails === 0 ? 'all checks pass' : `${fails} FAILED`}`)
  process.exit(fails === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
