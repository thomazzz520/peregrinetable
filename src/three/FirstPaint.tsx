import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'

/**
 * Make sure the first frame actually reaches the screen.
 *
 * A WebGL canvas mounted on page load is sized correctly and three really
 * is drawing into it, but the compositor can keep showing an empty layer
 * until something forces a fresh layout pass — you get the canvas's
 * background and nothing else, with no error anywhere.
 *
 * Dispatching a window resize is not enough on a Canvas configured with
 * `resize={{ offsetSize: true }}`, because R3F measures through a
 * ResizeObserver and never sees the event. Changing the drawing buffer by
 * a pixel and putting it back does reach it: R3F resizes, three reallocates,
 * and the compositor has to take the new layer.
 *
 * A hack, and labelled as one. It runs three times over half a second and
 * then never again.
 */
export default function FirstPaint() {
  const setSize = useThree((s) => s.setSize)
  const size = useThree((s) => s.size)
  const latest = useRef(size)
  latest.current = size

  useEffect(() => {
    const kick = () => {
      const { width, height } = latest.current
      if (!width || !height) return
      setSize(width, height + 1)
      requestAnimationFrame(() => setSize(width, height))
    }
    const timers = [60, 220, 520].map((ms) => window.setTimeout(kick, ms))
    return () => timers.forEach(window.clearTimeout)
  }, [setSize])

  return null
}
