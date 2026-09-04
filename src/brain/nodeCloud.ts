import { Color, Vector3 } from 'three'
import { DEPARTMENTS } from './departments'

/**
 * The constellation's maths, lifted unchanged from the standalone brain.
 *
 * Deliberately a plain module, not a component: given a day count it returns
 * flat typed arrays and nothing else. That keeps it testable in Node and lets
 * the React layer treat it as a pure `useMemo`, which is what stops the cloud
 * being torn down and rebuilt on every render the way the original did.
 *
 * There is no hero node at the centre. Nodes sit on a fibonacci sphere
 * between radius 2.0 and 5.2 with a little jitter, so the cloud reads as a
 * loose constellation rather than a lattice or a ball with a core.
 */

const MAX_NODES = 460
const CLOUD_MIN_R = 2.0
const CLOUD_SPAN_R = 3.2
/** Two nodes closer than this may link. Raising it thickens the web fast. */
const LINK_DISTANCE = 1.7
const LINKS_PER_NODE = 3
/** How much darker a node is than its department's card tint. */
const NODE_DEEPEN = 0.66

/** The original's PRNG, kept so the constellation is the identical one. */
function mulberry(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Node = { p: Vector3; color: Color; domainIndex: number }

/** Every node the brain could ever have, laid out on the sphere. */
const ALL_NODES: Node[] = (() => {
  const rnd = mulberry(21)
  const golden = Math.PI * (3 - Math.sqrt(5))
  /* The domain tints are chosen to sit behind a whole department card. As
     four-pixel dots on paper they wash out completely, so the brain draws
     them deepened — same hue, enough contrast to read as a constellation
     rather than dust. The tokens themselves are left alone. */
  const domainColors = DEPARTMENTS.map((d) => new Color(d.color).multiplyScalar(NODE_DEEPEN))
  const out: Node[] = []

  for (let i = 0; i < MAX_NODES; i++) {
    const domainIndex = i % domainColors.length
    // Fibonacci sphere: even angular spread, so the cloud stays balanced and
    // centred at any count rather than clumping as it grows.
    const y = 1 - (i / (MAX_NODES - 1)) * 2
    const ring = Math.sqrt(1 - y * y)
    const theta = golden * i
    const dir = new Vector3(Math.cos(theta) * ring, y, Math.sin(theta) * ring)
    dir.x += (rnd() - 0.5) * 0.25
    dir.y += (rnd() - 0.5) * 0.25
    dir.z += (rnd() - 0.5) * 0.25
    dir.normalize()
    out.push({
      p: dir.multiplyScalar(CLOUD_MIN_R + rnd() * CLOUD_SPAN_R),
      color: domainColors[domainIndex]!,
      domainIndex,
    })
  }
  return out
})()

/** How many nodes the brain has learned by day `days`. Flattens past ~180. */
/**
 * The order the brain grows its nodes in.
 *
 * The original took the first N nodes straight off the fibonacci sphere,
 * which walks the sphere pole to pole — so a young brain was a cap floating
 * above centre rather than a sparse whole cloud, and it only looked right
 * once nearly every node was present. Growing along a shuffled order instead
 * means any prefix is an even sample of the entire sphere: the constellation
 * is the same shape on day 3 as on day 180, just thinner.
 */
const GROWTH_ORDER: number[] = (() => {
  const order = ALL_NODES.map((_, i) => i)
  const rnd = mulberry(77)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[order[i], order[j]] = [order[j]!, order[i]!]
  }
  return order
})()

export function nodesForDays(days: number): number {
  const t = Math.min(1, days / 180)
  return Math.floor(30 + Math.pow(t, 0.8) * (MAX_NODES - 30))
}

export type CloudGeometry = {
  count: number
  positions: Float32Array
  colors: Float32Array
  /** Links within one department. */
  web: Float32Array
  /** Links that cross departments — the interesting ones, drawn in sage. */
  cross: Float32Array
}

export function buildCloud(days: number): CloudGeometry {
  const count = nodesForDays(days)
  const nodes = GROWTH_ORDER.slice(0, count).map((i) => ALL_NODES[i]!)

  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  nodes.forEach((n, i) => {
    positions[i * 3] = n.p.x
    positions[i * 3 + 1] = n.p.y
    positions[i * 3 + 2] = n.p.z
    colors[i * 3] = n.color.r
    colors[i * 3 + 1] = n.color.g
    colors[i * 3 + 2] = n.color.b
  })

  const rnd = mulberry(5)
  const web: number[] = []
  const cross: number[] = []
  for (let i = 0; i < count; i++) {
    let links = 0
    for (let j = i + 1; j < count && links < LINKS_PER_NODE; j++) {
      const a = nodes[i]!
      const b = nodes[j]!
      if (a.p.distanceTo(b.p) < LINK_DISTANCE && rnd() < 0.6) {
        const seg = [a.p.x, a.p.y, a.p.z, b.p.x, b.p.y, b.p.z]
        const crossesDepartments = a.domainIndex !== b.domainIndex
        if (crossesDepartments && rnd() < 0.5) cross.push(...seg)
        else web.push(...seg)
        links++
      }
    }
  }

  return {
    count,
    positions,
    colors,
    web: new Float32Array(web),
    cross: new Float32Array(cross),
  }
}
