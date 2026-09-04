import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'
import { buildCloud } from './nodeCloud'
import { accent } from '../theme/tokens'

/** Links inside one department — quiet, the colour of old paper. */
const WEB_LINE = '#9C8E77'

export type Rotation = { x: number; y: number; tx: number; ty: number }

/**
 * The node cloud on its own, with no camera and no canvas.
 *
 * Deliberately Canvas-free so the same component can be the whole of the
 * standalone brain page and the object on the office island, rather than
 * the two drifting apart as separate copies. `scale` is how the office
 * shrinks it to island size.
 */
export default function Constellation({
  days,
  rot,
  dragging,
  scale = 1,
  position = [0, 0, 0],
  spin = true,
}: {
  days: number
  /** Owned by the parent, because that is where pointer events land. */
  rot?: React.RefObject<Rotation>
  dragging?: React.RefObject<boolean>
  scale?: number
  position?: [number, number, number]
  spin?: boolean
}) {
  const group = useRef<Group>(null!)
  const cloud = useMemo(() => buildCloud(days), [days])
  const own = useRef<Rotation>({ x: -0.2, y: 0.4, tx: -0.2, ty: 0.4 })
  const r = rot ?? own

  useFrame((_, delta) => {
    const v = r.current
    // Frame-rate independent: the original's per-frame constants ran at
    // whatever speed the monitor happened to be.
    const k = 1 - Math.pow(1 - 0.06, delta * 60)
    if (spin && !dragging?.current) v.ty += 0.0013 * delta * 60
    v.x += (v.tx - v.x) * k
    v.y += (v.ty - v.y) * k
    if (group.current) {
      group.current.rotation.x = v.x
      group.current.rotation.y = v.y
    }
  })

  return (
    <group ref={group} position={position} scale={scale}>
      {/* Attributes are declared, not assigned in an effect: an effect sets
          them after the first frame, by which point three has computed a
          bounding sphere from an empty geometry and culled the object for
          good. `key` rebuilds the buffers when the day count changes. */}
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
        <lineBasicMaterial color={accent.sageDeep} transparent opacity={0.72} depthWrite={false} />
      </lineSegments>
    </group>
  )
}
