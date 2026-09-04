import { useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'

import Constellation, { type Rotation } from './Constellation'
import FirstPaint from '../three/FirstPaint'

const CAM_WIDE = 17
const CAM_CLOSE = 6.5
/** The chat opens on the way in, not on arrival, so the two feel like one move. */
const CAM_CHAT_TRIGGER = 8.2

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
