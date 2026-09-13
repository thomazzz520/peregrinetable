---
# Scoped to the booking floor plan — the contained diorama this document was
# written for and whose reference images it specifies. It is deliberately NOT
# scoped to the owner dashboard or the office scene (src/office, src/dashboard,
# src/shell, src/brain, src/three): those run the Peregrine design system in
# .antigravity.md, which allows lights, MeshStandardMaterial and a perspective
# camera. The glob used to read src/**, which claimed this file governed code
# it had never described.
#
# src/routes is in scope: every route file composes this document's own
# surfaces (FloorPlan, BookingFlow, Dock, OwnerChrome) and nothing from the
# office system.
paths:
  - "src/scene/**/*.{tsx,jsx,ts,css}"
  - "src/components/**/*.{tsx,jsx,ts,css}"
  - "src/routes/**/*.{tsx,jsx,ts,css}"
  - "**/*.module.css"
  - "tailwind.config.*"
---

# ART DIRECTION — READ BEFORE WRITING ANY UI CODE

Six reference images are attached. They are the specification, not inspiration. Where this document and your instincts disagree, this document wins. Where this document and the images disagree, the images win.

Reference key:
1. **Orange tower in a mint frame** — diorama-in-a-box composition, three-value face shading
2. **Tree on a floating platform** — negative space, restraint, light background
3. **Dark cliff with amber glow** — gradient across a single large form
4. **Coral city on mint** — the master palette, and depth-by-desaturation
5. **Title screen with mountains** — typography and background gradient
6. **Grey monoliths with lime tops** — fog as depth, accent confined to top faces

---

## 0. Hard prohibitions

Violating any of these breaks the look completely. Check this list before every commit.

These bans cover the surfaces this document governs — the booking floor plan in
`src/scene`, `src/components` and `src/routes`, plus the stylesheets in the
frontmatter glob. They are **not** in force in the office scene, owner
dashboard, shell or brain (`src/office`, `src/dashboard`, `src/shell`,
`src/brain`, `src/three`), which run the Peregrine design system in
`.antigravity.md`. Read "banned" below as "banned in the floor plan".

- `PerspectiveCamera` — banned.
- `MeshStandardMaterial`, `MeshPhysicalMaterial`, `MeshLambertMaterial` — banned. `MeshBasicMaterial` only.
- `<ambientLight>`, `<directionalLight>`, `<pointLight>`, `<spotLight>`, `<Environment>` — banned. The scene contains **zero lights**.
- `roughness`, `metalness`, `envMap`, `normalMap`, any texture map — banned.
- Shadow maps, `castShadow`, `receiveShadow`, contact shadows, ambient occlusion — banned.
- Bloom, chromatic aberration, depth of field, film grain, noise overlays — banned.
- CSS: `box-shadow`, `backdrop-filter`, `filter: blur()`, gradients on buttons or panels — banned.
- Border radius above 3px — banned.
- Emoji, icon fonts, drop-shadowed cards, glassmorphism — banned.

Every geometry gets `flatShading`. No exceptions.

---

## 1. Camera and projection

True isometric. This is the single highest-impact rule.

```jsx
<OrthographicCamera
  makeDefault
  position={[20, 20, 20]}   // equal on all three axes — do not alter the ratio
  zoom={48}                  // tune zoom only; never move to unequal axes
  near={-100}
  far={200}
/>
// target [0, 0, 0]
```

Equal XYZ position yields 35.264° elevation at 45° azimuth — the projection in every reference image.

**Self-test:** screenshot the scene, then trace any two table edges that should be parallel in plan. If they converge anywhere on screen, the camera is wrong. Fix it before doing anything else.

Rotation: the user may rotate the floor plan, but only in **90° snapped steps** with easing (Reference 1's mechanic). Never free-orbit. Never allow tilt. Zoom clamps to 0.6×–1.8× of base.

---

## 2. The three-value face system

There are no lights, so light is **assigned**. Every solid gets exactly three values of one hue:

| Face | Lightness | Rule |
|---|---|---|
| Top (+Y) | 100% | Lightest. Carries any accent colour. |
| Side facing camera-left (−X) | 88% | Mid. |
| Side facing camera-right (+Z) | 74% | Darkest. |

Drop **lightness only**. Do not shift hue between the three faces by more than 4°. The direction is global — every object in the scene picks the same side to be dark. Look at Reference 4: every coral tower darkens on the same face, without exception.

Implement as a materials array per mesh, not one material per object.

---

## 3. Palette

Derived from Reference 4, with the lime accent behaviour from Reference 6.

```css
/* Background — never appears on geometry */
--mv-sky-top:      #BFE0D2;
--mv-sky-bottom:   #94C4B4;

/* Available table / active architecture */
--mv-coral-top:    #F79C88;
--mv-coral-light:  #EE7460;
--mv-coral-dark:   #CE5341;

/* Booked table / background architecture — drained, low contrast */
--mv-drained-top:  #D9CABA;
--mv-drained-light:#CDBCAA;
--mv-drained-dark: #BFAB98;

/* Stone — floors, platforms, stairs */
--mv-stone-top:    #F6EFE4;
--mv-stone-light:  #E6DCCC;
--mv-stone-dark:   #D2C6B4;

/* Accent — selected state only. Ceiling: 3% of screen pixels. */
--mv-accent:       #F2C230;
--mv-accent-dark:  #D9A61C;

/* Interactive markers, small teal inlays */
--mv-marker:       #2E7D7D;

/* Type and hairlines */
--mv-ink:          #3A3247;
```

Two absolute rules:
- The background hue never appears on geometry, and geometry hues never appear in the background. Reference 4 is mint-vs-coral with no overlap.
- `--mv-accent` appears on **one object at a time** — the currently selected table. Nowhere else. Reference 4 has exactly one yellow totem in the entire frame.

---

## 4. Booking state = atmospheric depth

Do not build a colour legend. Use Monument Valley's own depth trick as the state system.

| Table state | Treatment |
|---|---|
| Available | Full coral. Full contrast between its three faces. |
| Partly booked | Coral at 55% saturation, sitting between coral and drained. |
| Fully booked | `--mv-drained-*`. Contrast between faces compressed to ~half. Reads as receding into the background city, exactly like Reference 4's rear layer. |
| Selected | Top face becomes `--mv-accent`. Sides stay coral. |
| Hover | Lift 0.06 units on Y over 160ms. No colour change, no outline, no glow. |

Unavailable things recede. Available things advance. That is the whole system, and it needs no explaining to the user.

---

## 5. Geometry vocabulary

Build only from this kit. Every reference image is assembled from these parts:

- Rectangular prisms — the base unit for walls, platforms, plinths
- Semicircular arch cutouts in wall slabs (Ref 1, Ref 4)
- Stairs with visible tread ribs, each tread a separate box (Ref 1, Ref 3)
- Crenellations — regular square notches along a top edge (Ref 4)
- Thin vertical window slits, 1:6 ratio (Ref 1, Ref 4)
- Cylinders capped with hemispherical domes (Ref 1, Ref 4)
- Recessed rim borders on platform edges (Ref 1, Ref 2)
- Small square inlay tiles set flush into floors (Ref 2)

Hard edges throughout. No bevels, no chamfers, no rounded corners, no subdivision, no organic curves. Curves exist only as arches, cylinders and domes.

Tables: circular tables are 12-sided cylinders, not smooth. Rectangular tables are boxes. Both sit on a plinth 0.08 units proud of the floor so they read as objects, not paint.

---

## 6. Atmosphere and fog

Reference 6 dissolves distant columns into white fog. Reference 4 fades its rear city into the mint background. Use `THREE.Fog` set to the background colour, tuned so the far edge of the room loses roughly 40% of its contrast.

```js
scene.fog = new THREE.Fog('#A9D6C6', 28, 78)  // tune to room depth
```

Shadows: one flat polygon per object, offset in a single global direction, `--mv-ink` at 10% opacity, hard-edged. Not a shadow map. Not blurred. Reference 2 and Reference 4 both do this.

---

## 7. Ornament

Every reference platform has a fine repeating geometric border inset from its edge — diamonds, chevrons, small squares. It is the detail that makes the style read as crafted rather than programmer-art.

Rules:
- Border sits 0.15 units inset from the platform edge
- Motif repeats every 0.4 units
- Contrast versus the surface beneath is **no more than 12% lightness**. It must be almost invisible at a glance and only resolve on close look. High-contrast ornament kills the style instantly.
- Ornament appears on floors and platform rims only. Never on tables, never on UI panels.

---

## 8. 2D UI chrome

The interface panels must feel like they belong in the same world as the scene, not like a dashboard bolted on top.

**Type**
- Display: Jost, weight 300, uppercase, letter-spacing `0.18em`. Reference 5's title treatment.
- Body and data: Karla, weight 400. Sentence case, normal tracking.
- Scale: 11 / 13 / 16 / 22 / 40px. Nothing between.
- Colour: `--mv-ink` on `--mv-stone-top`. Never pure black, never pure white.

**Panels**
- Background `--mv-stone-top`, flat, fully opaque
- Border: 1px `--mv-ink` at 12% opacity. No shadow of any kind.
- Radius 0 or 2px, chosen once and applied everywhere
- Padding on a strict 8px grid

**Buttons**
- Flat fill, no gradient, no shadow, no hover lift
- Default: `--mv-ink` at 8% fill, ink text
- Primary: `--mv-coral-light` fill, `--mv-stone-top` text
- Selected time slot: `--mv-accent` fill, ink text
- Disabled: `--mv-drained-light` fill, ink at 35%

**Layout**
Reference 2 is the composition brief: the object occupies a small fraction of the frame and empty space does the work. The floor plan sits centred with generous margins. Booking panels dock to one edge as a narrow column and never overlay the scene. Do not fill space because it is there.

---

## 9. Motion

- Easing `cubic-bezier(0.4, 0.0, 0.2, 1)` everywhere. One curve, no others.
- Panel entry: slide 16px plus fade, 320ms. Never scale, never bounce, never spring.
- Table hover: 160ms Y-lift.
- Camera rotation: 520ms, snapped 90°.
- Ambient scene motion: none. These worlds are still. Resist adding drifting particles.
- Respect `prefers-reduced-motion` — drop to instant state changes.

---

## 10. Signature element

Reference 1 frames its diorama inside a mint picture-box with ornamented inner edges. Do the same with the venue floor plan: the room sits inside a thin frame in `--mv-sky-top`, one shade lighter than the background, with a fine ornamented inner rim. It reads as a model of the venue held in a case rather than a map — which is exactly the feeling that justifies picking a table spatially instead of off a list.

Build this once, get it right, and let everything else stay quiet around it.

---

## 11. Acceptance checks

Run these against a screenshot before declaring any floor-plan screen finished.
Each one is pass/fail. Office and dashboard screens are audited against
`.antigravity.md` instead.

1. Trace two edges parallel in plan. Do they stay parallel on screen? Converging → camera is wrong.
2. Is there a single specular highlight or gradient on any 3D face? → material is wrong.
3. Do all objects darken on the same side? Inconsistent → face assignment is wrong.
4. Estimate accent-yellow coverage. Over 3% → too much.
5. Does any background hue appear on geometry, or any geometry hue in the background? → palette is wrong.
6. Squint at the screenshot. Do booked tables recede and available tables advance? If they read as equal weight, the desaturation is too weak.
7. Is there a `box-shadow` in this screen's CSS? → remove it.

Fix failures before adding features.
