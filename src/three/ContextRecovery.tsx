import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'

/**
 * Bring the scene back after the GPU drops its WebGL context.
 *
 * A lost context is silent: the canvas goes blank, nothing throws, and the
 * console stays clean. Left alone it is also permanent — which is what made
 * the office scene "disappear entirely" rather than flicker.
 *
 * three's WebGLRenderer already calls preventDefault() on the loss and has a
 * full onContextRestore path, so this deliberately does not duplicate either.
 * What it adds is the case three cannot cover: the browser deciding never to
 * restore. Under real memory pressure that is the normal outcome, not the
 * exception — five losses in one session here produced zero restores. When
 * that happens the only way back is a brand new context, which means
 * remounting the Canvas.
 *
 * `onGiveUp` is that escape hatch. The caller remounts via a key, and the
 * scene rebuilds from scratch.
 */
export default function ContextRecovery({
  onGiveUp,
  graceMs = 2500,
}: {
  /** Called when the browser has not restored the context in `graceMs`. */
  onGiveUp: () => void
  graceMs?: number
}) {
  const gl = useThree((s) => s.gl)
  const invalidate = useThree((s) => s.invalidate)

  useEffect(() => {
    const canvas = gl.domElement
    let timer = 0

    const onLost = () => {
      // Deliberately no preventDefault — three's own handler has already
      // called it by the time this runs, and calling it twice is meaningless.
      console.warn('[office] WebGL context lost; waiting for the browser to restore it')

      // Ask for it back explicitly. Harmless if the browser was going to
      // restore anyway, and on some drivers it is what starts the process.
      try {
        gl.forceContextRestore()
      } catch {
        /* not every driver honours it */
      }

      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        const ctx = canvas.getContext('webgl2') || canvas.getContext('webgl')
        if (ctx && !(ctx as WebGLRenderingContext).isContextLost()) return
        console.warn(`[office] context still lost after ${graceMs}ms; remounting the scene`)
        onGiveUp()
      }, graceMs)
    }

    const onRestored = () => {
      window.clearTimeout(timer)
      console.warn('[office] WebGL context restored')
      // three rebuilds its own GPU state; this only guarantees a frame is
      // actually drawn afterwards, since the loop may have settled by now.
      invalidate()
    }

    canvas.addEventListener('webglcontextlost', onLost)
    canvas.addEventListener('webglcontextrestored', onRestored)
    return () => {
      window.clearTimeout(timer)
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
    }
  }, [gl, invalidate, onGiveUp, graceMs])

  return null
}
