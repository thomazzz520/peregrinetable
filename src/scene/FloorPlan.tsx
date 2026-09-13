import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import { Fog, Group, OrthographicCamera as Ortho } from 'three'
import type { Table, TableState } from '../data'
import Case from './Case'
import Room from './Room'
import Shadows from './Shadows'
import TableMesh from './TableMesh'
import { applyQuarterToAll } from './geometry'
import { auditScene } from './audit'
import { ROTATE_MS, standardEase } from './ease'
import { FOG_FAR, FOG_NEAR, ZOOM_MAX, ZOOM_MIN, fit } from './layout'
import { hex } from './palette'

/**
 * Measures the element R3F sizes its canvas to. R3F's own `size` can be a stale
 * first measurement — the framing then sticks at whatever the layout happened to
 * be mid-mount, which is how the deployed build ended up smaller than dev. An
 * observer on the real element always self-corrects.
 */
function useContainerSize() {
  const el = useThree((s) => s.gl.domElement)
  const [size, setSize] = useState(() => ({
    width: el.clientWidth || 1,
    height: el.clientHeight || 1,
  }))

  useLayoutEffect(() => {
    const target = el.parentElement ?? el
    const measure = () => {
      const { width, height } = target.getBoundingClientRect()
      if (width > 0 && height > 0) {
        setSize((s) => (s.width === width && s.height === height ? s : { width, height }))
      }
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(target)
    return () => observer.disconnect()
  }, [el])

  return size
}

/**
 * OrthographicCamera at equal XYZ. The ratio is never altered — only zoom, and
 * only within 0.6×–1.8× of the fitted base (§1).
 */
function IsoCamera({ zoomMul }: { zoomMul: number }) {
  const size = useContainerSize()
  const cam = useRef<Ortho>(null)
  const { base, targetY } = useMemo(() => fit(size.width, size.height), [size.width, size.height])

  useLayoutEffect(() => {
    const c = cam.current
    if (!c) return
    c.zoom = base * zoomMul
    c.position.set(20, targetY + 20, 20)
    c.lookAt(0, targetY, 0)
    c.updateProjectionMatrix()
  }, [base, targetY, zoomMul])

  return <OrthographicCamera ref={cam} makeDefault position={[20, 20, 20]} near={-100} far={200} />
}

/**
 * 90°-snapped rotation with easing, and never any tilt (§1).
 *
 * `spin` adds a free drag offset on top of the snap, used only by the
 * owner's read-only view of the room. The guest scene leaves it alone and
 * keeps the quarter turns. Note this rotates the *room*, not the camera —
 * the isometric projection the art direction mandates is untouched either
 * way, which is the part that actually matters.
 */
function Turntable({
  quarter,
  onShadeQuarter,
  reduced,
  spin,
  children,
}: {
  quarter: number
  onShadeQuarter: (q: number) => void
  reduced: boolean
  spin?: React.RefObject<number>
  children: ReactNode
}) {
  const group = useRef<Group>(null)
  const anim = useRef({ from: 0, to: 0, start: -1 })
  const shade = useRef(-1)

  useEffect(() => {
    const g = group.current
    if (!g) return
    const to = (-quarter * Math.PI) / 2
    if (reduced) {
      g.rotation.y = to
      anim.current = { from: to, to, start: -1 }
      return
    }
    anim.current = { from: g.rotation.y, to, start: performance.now() }
  }, [quarter, reduced])

  useFrame(() => {
    const g = group.current
    if (!g) return
    const a = anim.current
    if (a.start >= 0) {
      const t = Math.min(1, (performance.now() - a.start) / ROTATE_MS)
      g.rotation.y = a.from + (a.to - a.from) * standardEase(t)
      if (t >= 1) a.start = -1
    }
    if (spin) g.rotation.y = (a.start >= 0 ? g.rotation.y : a.to) + spin.current
    // The dark side is fixed on screen, so the face grouping flips as the room
    // passes each 45° mark — the least visible moment in the turn.
    const q = ((Math.round(g.rotation.y / (Math.PI / 2)) % 4) + 4) % 4
    if (q !== shade.current) {
      shade.current = q
      applyQuarterToAll(q)
      onShadeQuarter(q)
    }
  })

  return <group ref={group}>{children}</group>
}

/**
 * R3F sizes its canvas from `react-use-measure`, which drops its first
 * ResizeObserver callback when that callback lands before the hook's own
 * mounted-flag effect has run — and under concurrent rendering it often does.
 * On a static layout nothing ever resizes again, so the observer never fires a
 * second time, the measured size stays 0×0, and the Canvas silently never
 * initialises: no error, just an empty page.
 *
 * Watching the wrapper ourselves fixes it for good. Our own observer is
 * guaranteed a callback after `observe()`, by which point the mounted flag is
 * set, so dispatching a resize there always lands. We stop as soon as the
 * canvas has a real size, and R3F leaves it at the intrinsic 300×150 until it
 * has measured, which is the signal we watch for.
 */
function useCanvasMeasureFix(ref: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return

    let timer = 0
    let settled = false
    const deadline = Date.now() + 2000

    const nudge = () => {
      if (settled) return true
      const canvas = el.querySelector('canvas')
      if (canvas && canvas.width > 300) {
        settled = true
        return true
      }
      window.dispatchEvent(new Event('resize'))
      return false
    }

    // Passive effects run child-first, so R3F's own resize listener is already
    // attached by the time this parent effect runs and the first nudge lands.
    // The retries are for the cases where it is not — and they are timers, not
    // animation frames, because a tab opened in the background never paints and
    // would otherwise sit at 300x150 forever.
    const tick = () => {
      if (nudge() || Date.now() > deadline) return
      timer = window.setTimeout(tick, 60)
    }
    tick()

    const observer = new ResizeObserver(nudge)
    observer.observe(el)
    return () => {
      window.clearTimeout(timer)
      observer.disconnect()
    }
  }, [ref])
}

export type FloorPlanProps = {
  /** Drag to spin the room. Off by default: the guest scene keeps the
   *  90° snaps the art direction asks for. */
  freeSpin?: boolean
  tables: Table[]
  stateOf: (table: Table) => TableState
  selectedId?: string | null
  onSelect?: (table: Table) => void
  onHover?: (table: Table | null) => void
  labelFor?: (table: Table) => ReactNode
}

export default function FloorPlan({
  freeSpin = false,
  tables,
  stateOf,
  selectedId,
  onSelect,
  onHover,
  labelFor,
}: FloorPlanProps) {
  const [quarter, setQuarter] = useState(0)
  const spin = useRef(0)
  const drag = useRef<{ on: boolean; x: number }>({ on: false, x: 0 })
  const [shadeQuarter, setShadeQuarter] = useState(0)
  const [zoomMul, setZoomMul] = useState(1)
  const reduced = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  const wrapper = useRef<HTMLDivElement>(null)

  useEffect(() => {
    applyQuarterToAll(0)
  }, [])

  useCanvasMeasureFix(wrapper)

  /* The canvas keeps touch-action: pan-y so one finger still scrolls the page
     past the room. Two fingers mean the pinch below, and the page must hold
     still under it, which only a non-passive listener can say. React's onTouch*
     are passive, so this one is attached by hand. */
  useEffect(() => {
    const el = wrapper.current
    if (!el) return
    const holdStill = (e: TouchEvent) => {
      if (e.touches.length >= 2 && e.cancelable) e.preventDefault()
    }
    el.addEventListener('touchmove', holdStill, { passive: false })
    return () => el.removeEventListener('touchmove', holdStill)
  }, [])

  const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z))

  const onWheel = useCallback((e: React.WheelEvent) => {
    setZoomMul((z) => clampZoom(z * (e.deltaY > 0 ? 0.92 : 1.087)))
  }, [])

  /* Pinch is the wheel's touch equivalent, and deliberately nothing more: the
     same zoomMul, the same §1 clamps, no panning and no tilt. Two fingers,
     because one finger already means scroll the page in the guest's view and
     spin the room in the owner's. */
  const touches = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ dist: number; zoom: number } | null>(null)

  const spread = () => {
    const [a, b] = [...touches.current.values()]
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0
  }

  const pinchDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return
    touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (touches.current.size === 2) {
      pinch.current = { dist: spread(), zoom: zoomMul }
      // The second finger ends any spin the first one started.
      drag.current.on = false
    }
  }

  const pinchMove = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch' || !touches.current.has(e.pointerId)) return
    touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const base = pinch.current
    if (!base || base.dist <= 0 || touches.current.size !== 2) return
    setZoomMul(clampZoom(base.zoom * (spread() / base.dist)))
  }

  /* Lifting either finger ends the gesture rather than re-basing it on one
     point, so the room cannot lurch as the second finger leaves. */
  const pinchEnd = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return
    touches.current.delete(e.pointerId)
    if (touches.current.size < 2) pinch.current = null
  }

  /* Drag spins the room about its own axis. Deliberately not an orbit: the
     camera never moves, so the isometric projection survives. */
  const spinDown = (e: React.PointerEvent) => {
    if (!freeSpin || pinch.current) return
    drag.current = { on: true, x: e.clientX }
    ;(e.currentTarget as HTMLElement).style.cursor = 'grabbing'
  }
  const spinMove = (e: React.PointerEvent) => {
    if (!freeSpin || pinch.current || !drag.current.on) return
    spin.current += (e.clientX - drag.current.x) * 0.008
    drag.current.x = e.clientX
  }
  const spinUp = (e: React.PointerEvent) => {
    if (!freeSpin) return
    drag.current.on = false
    ;(e.currentTarget as HTMLElement).style.cursor = 'grab'
  }

  const pointerHandlers = {
    onPointerDown: (e: React.PointerEvent) => {
      pinchDown(e)
      spinDown(e)
    },
    onPointerMove: (e: React.PointerEvent) => {
      pinchMove(e)
      spinMove(e)
    },
    onPointerUp: (e: React.PointerEvent) => {
      pinchEnd(e)
      spinUp(e)
    },
    onPointerCancel: (e: React.PointerEvent) => {
      pinchEnd(e)
      spinUp(e)
    },
    onPointerLeave: (e: React.PointerEvent) => {
      pinchEnd(e)
      if (freeSpin) drag.current.on = false
    },
  }

  return (
    <div
      className="scene"
      ref={wrapper}
      onWheel={onWheel}
      style={freeSpin ? { cursor: 'grab', touchAction: 'none' } : undefined}
      {...pointerHandlers}
    >
      <Canvas
        flat
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        onCreated={(state) => {
          // Fog dissolves the far edge of the room into the background (§6).
          state.scene.fog = new Fog(hex.fog, FOG_NEAR, FOG_FAR)
          if (import.meta.env.DEV) {
            // Acceptance checks read the scene graph, not a screenshot.
            ;(window as unknown as Record<string, unknown>).__auditScene = () =>
              auditScene(state.scene, state.camera)
          }
        }}
      >
        <IsoCamera zoomMul={zoomMul} />
        <Turntable
          quarter={quarter}
          onShadeQuarter={setShadeQuarter}
          reduced={reduced}
          spin={freeSpin ? spin : undefined}
        >
          <Case quarter={shadeQuarter} />
          <Room quarter={shadeQuarter} />
          <Shadows tables={tables} quarter={shadeQuarter} />
          {tables.map((t) => (
            <TableMesh
              key={t.id}
              table={t}
              state={stateOf(t)}
              selected={selectedId === t.id}
              onSelect={onSelect}
              onHover={onHover}
              label={labelFor?.(t)}
            />
          ))}
        </Turntable>
      </Canvas>

      <div className="scene__controls">
        <button
          type="button"
          className="btn btn--quiet scene__turn"
          onClick={() => setQuarter((q) => q - 1)}
          aria-label="Rotate the room left"
        >
          <Chevron dir="left" />
        </button>
        <button
          type="button"
          className="btn btn--quiet scene__turn"
          onClick={() => setQuarter((q) => q + 1)}
          aria-label="Rotate the room right"
        >
          <Chevron dir="right" />
        </button>
      </div>
    </div>
  )
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  const d = dir === 'left' ? 'M9 3 4 8l5 5' : 'M7 3l5 5-5 5'
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}
