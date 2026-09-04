import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Group } from 'three'
import { buildCloud } from './nodeCloud'
import { accent } from '../theme/tokens'

/** Links inside one department — quiet, the colour of old paper. */
const WEB_LINE = '#9C8E77'

const CAM_WIDE = 17
const CAM_CLOSE = 6.5
/** The chat opens on the way in, not on arrival, so the two feel like one move. */
const CAM_CHAT_TRIGGER = 8.2

type Rotation = { x: number; y: number; tx: number; ty: number }

function Constellation({
  days,
  dragging,
  rot,
}: {
  days: number
  dragging: React.RefObject<boolean>
  /* Owned by BrainScene, which is where the pointer events land. Rotation
     lives in a ref, never in state: this runs every frame and a setState
     here would re-render the whole scene sixty times a second. */
  rot: React.RefObject<Rotation>
}) {
  const group = useRef<Group>(null!)
  const cloud = useMemo(() => buildCloud(days), [days])

  useFrame((_, delta) => {
    const r = rot.current
    // Frame-rate independent easing: the original's 0.06-per-frame drift ran
    // at whatever speed the monitor happened to be.
    const k = 1 - Math.pow(1 - 0.06, delta * 60)
    if (!dragging.current) r.ty += 0.0013 * delta * 60
    r.x += (r.tx - r.x) * k
    r.y += (r.ty - r.y) * k
    if (group.current) {
      group.current.rotation.x = r.x
      group.current.rotation.y = r.y
    }
  })

  return (
    <group ref={group}>
      {/* Attributes are declared, not assigned in an effect: an effect sets
          them after the first frame, by which point three has already
          computed a bounding sphere from an empty geometry and culled the
          object for good. `key` rebuilds the buffers when the day count
          changes; frustumCulled is off because a points cloud's bounds are
          cheap to get wrong and there is only one of them. */}
      <points key={`nodes-${cloud.count}`} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[cloud.positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[cloud.colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.2}
          vertexColors
          transparent
          opacity={0.96}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
      <lineSegments key={`web-${cloud.count}`} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[cloud.web, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={WEB_LINE} transparent opacity={0.42} depthWrite={false} />
      </lineSegments>
      <lineSegments key={`cross-${cloud.count}`} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[cloud.cross, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color={accent.sageDeep}
          transparent
          opacity={0.72}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  )
}

/**
 * The "you clicked the middle" target.
 *
 * The original measured pixels from the centre of the window, which only
 * worked because that camera never moved. Once the brain sits on the office
 * island the camera moves constantly, so the target is a real invisible
 * sphere in the scene instead — correct from any angle, and it gives us a
 * pointer cursor for free.
 */
function CentreTarget({ onOpen, moved }: { onOpen: () => void; moved: React.RefObject<boolean> }) {
  return (
    <mesh
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        if (!moved.current) onOpen()
      }}
    >
      <sphereGeometry args={[2.6, 16, 16]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  )
}

/**
 * A WebGL canvas mounted on page load sometimes never reaches the screen:
 * it is sized correctly and three really is drawing into it, but the
 * compositor keeps showing an empty layer until something forces a fresh
 * layout pass. Nudging a resize once the canvas is up costs nothing and
 * makes it reliable. The floor plan never showed this because it mounts
 * after the guest has clicked through the form, which forces layout anyway.
 */
function FirstPaint() {
  const { gl } = useThree()
  useEffect(() => {
    const kick = () => window.dispatchEvent(new Event('resize'))
    const t = [0, 120, 400].map((ms) => window.setTimeout(kick, ms))
    return () => t.forEach(window.clearTimeout)
  }, [gl])
  return null
}

/** Eases the camera in and out, and opens the chat on the way in. */
function CameraRig({ zoomed, onArrive }: { zoomed: boolean; onArrive: () => void }) {
  const { camera } = useThree()
  const fired = useRef(false)

  useEffect(() => {
    if (!zoomed) fired.current = false
  }, [zoomed])

  useFrame((_, delta) => {
    const target = zoomed ? CAM_CLOSE : CAM_WIDE
    const k = 1 - Math.pow(1 - 0.12, delta * 60)
    camera.position.z += (target - camera.position.z) * k
    camera.lookAt(0, 0, 0)
    if (zoomed && !fired.current && camera.position.z < CAM_CHAT_TRIGGER) {
      fired.current = true
      onArrive()
    }
  })
  return null
}

export default function BrainScene({
  days,
  zoomed,
  onOpen,
  onArrive,
}: {
  days: number
  zoomed: boolean
  onOpen: () => void
  onArrive: () => void
}) {
  const dragging = useRef(false)
  const moved = useRef(false)
  const last = useRef({ x: 0, y: 0 })
  const rot = useRef<Rotation>({ x: -0.2, y: 0.4, tx: -0.2, ty: 0.4 })

  return (
    <Canvas
      camera={{ fov: 42, position: [0, 0, CAM_WIDE], near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
      onPointerDown={(e) => {
        dragging.current = true
        moved.current = false
        last.current = { x: e.clientX, y: e.clientY }
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return
        const dx = e.clientX - last.current.x
        const dy = e.clientY - last.current.y
        if (Math.abs(dx) + Math.abs(dy) > 4) moved.current = true
        last.current = { x: e.clientX, y: e.clientY }
        const r = rot.current
        r.ty += dx * 0.006
        r.tx = Math.max(-1.1, Math.min(1.1, r.tx + dy * 0.006))
      }}
      onPointerUp={() => (dragging.current = false)}
      onPointerLeave={() => (dragging.current = false)}
    >
      <FirstPaint />
      <CameraRig zoomed={zoomed} onArrive={onArrive} />
      <Constellation days={days} dragging={dragging} rot={rot} />
      <CentreTarget onOpen={onOpen} moved={moved} />
    </Canvas>
  )
}
