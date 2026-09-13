import type { CSSProperties } from 'react'
import { room } from '../data'

/** Scene composition constants, all in metres. Derived from the venue footprint. */

export const PLATFORM_MARGIN = 0.55
export const PLATFORM_THICK = 0.36
export const CASE_MARGIN = 0.8
export const CASE_THICK = 0.42
export const CASE_HEIGHT = 5.4
export const CASE_SECTION = 0.26

export const platformW = room.width + PLATFORM_MARGIN * 2
export const platformD = room.depth + PLATFORM_MARGIN * 2
export const caseW = platformW + CASE_MARGIN * 2
export const caseD = platformD + CASE_MARGIN * 2

export const halfX = room.width / 2
export const halfZ = room.depth / 2

/** Venue y of the courtyard threshold — walls step down to a parapet past it. */
export const COURTYARD_Y = 12
export const PARAPET_BASE = 0.72
export const PARAPET_MERLON = 0.2

/** The courtyard is a raised terrace, reached by two treads (§5). */
export const TERRACE_H = 0.24
export const TREAD_H = 0.12
export const TREAD_DEPTH = 0.3

/** Floor height under a point, in metres. Flat inside, a terrace outdoors. */
export function floorHeightAt(venueY: number): number {
  return venueY >= COURTYARD_Y ? TERRACE_H : 0
}

/**
 * Is a face pointing between the room and the camera? Used to drop the two near
 * walls and the two near rails of the case, so every one of the four snapped
 * views looks into the room rather than at the back of a slab.
 */
export function facesCamera(normal: [number, number], quarter: number): boolean {
  const [x, z] = normal
  const q = ((quarter % 4) + 4) % 4
  const w: [number, number] =
    q === 1 ? [z, -x] : q === 2 ? [-x, -z] : q === 3 ? [-z, x] : [x, z]
  return w[0] + w[1] > 0.1
}

export const TABLE_HEIGHT = 0.75
export const PLINTH_HEIGHT = 0.08
export const HOVER_LIFT = 0.06

/** Shadows are one flat polygon per object, offset in a single global direction (§6). */
export const SHADOW_OFFSET: [number, number] = [0.42, 0.18]
export const SHADOW_OPACITY = 0.1

export const FOG_NEAR = 27
export const FOG_FAR = 68

export const ZOOM_MIN = 0.6
export const ZOOM_MAX = 1.8

/* ---------------------------------------------------------------------- */
/*  Framing. Where the room lands on screen under the fixed isometric       */
/*  camera, and how much zoom frames it. Pure geometry, no components, so   */
/*  the numbers can be imported by the scene and by whatever reserves       */
/*  space for it.                                                          */
/* ---------------------------------------------------------------------- */

const SQRT2 = Math.SQRT2
const SQRT6 = Math.sqrt(6)

/**
 * True isometric projection worked out by hand: a camera at equal XYZ gives
 * 35.264° elevation at 45° azimuth, and these two formulas are where a world
 * point lands on screen under it. Used to frame the room, never to draw.
 */
export function project(x: number, y: number, z: number) {
  return { sx: (x - z) / SQRT2, su: (2 * y - x - z) / SQRT6 }
}

/**
 * The case's projected footprint, across both orientations so nothing about the
 * framing changes as the room turns. Constant: the camera angle is fixed and so
 * is the venue, so this is worked out once rather than per resize.
 */
export const footprint = (() => {
  const yLo = -(PLATFORM_THICK + CASE_THICK)
  const yHi = CASE_HEIGHT - PLATFORM_THICK + CASE_SECTION
  let minSx = Infinity
  let maxSx = -Infinity
  let minSu = Infinity
  let maxSu = -Infinity

  for (const [ex, ez] of [
    [caseW / 2, caseD / 2],
    [caseD / 2, caseW / 2],
  ]) {
    for (const x of [-ex, ex]) {
      for (const z of [-ez, ez]) {
        for (const y of [yLo, yHi]) {
          const { sx, su } = project(x, y, z)
          minSx = Math.min(minSx, sx)
          maxSx = Math.max(maxSx, sx)
          minSu = Math.min(minSu, su)
          maxSu = Math.max(maxSu, su)
        }
      }
    }
  }

  return {
    spanX: maxSx - minSx,
    spanU: maxSu - minSu,
    centreU: (maxSu + minSu) / 2,
  }
})()

/**
 * Width-to-height of the room as it actually lands on screen. A container given
 * this aspect spends every pixel it reserves: both axes bind at once, so the
 * margin below is all there is, rather than the margin plus whatever the
 * shorter axis happened to leave over.
 */
export const ROOM_ASPECT = footprint.spanX / footprint.spanU

/**
 * Handed to whatever element reserves space for the scene. Only the phone
 * breakpoint reads it; on a computer the scene fills the space it is given and
 * the property sits unused.
 */
export const sceneAspect = { '--mv-room-aspect': String(ROOM_ASPECT) } as CSSProperties

/**
 * Zoom that frames the whole case with generous margins, and the target height
 * that centres it.
 */
export function fit(width: number, height: number) {
  const { spanX, spanU, centreU } = footprint
  // Reference 2 is the composition brief: the object takes a small fraction of
  // the frame and the empty space does the work.
  const base = Math.min(width / spanX, height / spanU) * 0.92
  return { base, targetY: ((centreU * SQRT6) / 2) }
}
