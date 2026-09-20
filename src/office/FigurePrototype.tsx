import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";

/**
 * FigurePrototype — ONE figure, built to a different brief from the ones in
 * RealFloor3D: toon-shaded, skin-toned, faced, in real clothing, on playful
 * chibi proportions. Nothing here is wired into the office scene. It exists
 * to be looked at and argued with at /figure-lab, and it imports nothing from
 * RealFloor3D so that scene cannot be changed by editing this file.
 *
 * What it deliberately breaks is documented at the foot of this file.
 */

/* ------------------------------------------------------------------ */
/* Toon shading                                                       */
/* ------------------------------------------------------------------ */

/** A gradient map is what turns a lit surface into bands. Three greys, nearest
 *  filtered so the steps stay hard — a linear filter here would smooth them
 *  back into exactly the gradient we are trying to get rid of. */
function makeRamp(stops: number[]): THREE.DataTexture {
  const data = new Uint8Array(stops.length * 4);
  stops.forEach((v, i) => {
    const c = Math.round(v * 255);
    data[i * 4] = c; data[i * 4 + 1] = c; data[i * 4 + 2] = c; data[i * 4 + 3] = 255;
  });
  const t = new THREE.DataTexture(data, stops.length, 1, THREE.RGBAFormat);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}
/** Three steps: core shadow, mid, lit. Two reads as a sticker, four starts
 *  looking like ordinary smooth shading again. */
const RAMP = makeRamp([0.42, 0.76, 1.0]);

const P = {
  skin: "#C98B63",
  skinShade: "#A96F4B",
  shirt: "#6B5570",
  apron: "#F0EDE6",
  trouser: "#46425C",
  shoe: "#241F1B",
  hair: "#2A2118",
  eyeWhite: "#F8F6F2",
  pupil: "#241F1B",
  ink: "#1A1714",
};

/** Inverted-hull outline: the same geometry, grown slightly, drawn back-faces
 *  only. The front faces of the real mesh cover all of it except a rim, which
 *  is the line. It costs a second draw per part and needs no post-processing
 *  pass, which is why it is the right choice for one figure. */
function Part({
  geometry, color, map, outline = 0.045, children, ...props
}: {
  geometry: THREE.BufferGeometry;
  color?: string;
  map?: THREE.Texture | null;
  outline?: number;
  children?: React.ReactNode;
} & React.ComponentProps<"group">) {
  return (
    <group {...props}>
      <mesh geometry={geometry} castShadow>
        <meshToonMaterial color={color} map={map ?? undefined} gradientMap={RAMP} />
      </mesh>
      {outline > 0 ? (
        <mesh geometry={geometry} scale={1 + outline}>
          <meshBasicMaterial color={P.ink} side={THREE.BackSide} />
        </mesh>
      ) : null}
      {children}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Geometry — chibi proportions, ~3 heads tall                        */
/* ------------------------------------------------------------------ */

const HEAD_R = 0.16;
const HEAD_Y = 0.76;

/** thetaStart = PI puts u = 0.5 on +z, so a texture's centre lands on the
 *  figure's chest instead of straddling the seam down its back. */
const G = {
  head: new THREE.SphereGeometry(HEAD_R, 24, 18),
  hair: new THREE.SphereGeometry(HEAD_R * 1.045, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.52),
  torso: new THREE.CylinderGeometry(0.132, 0.122, 0.26, 18, 1, false, Math.PI, Math.PI * 2),
  neck: new THREE.CylinderGeometry(0.05, 0.055, 0.05, 10),
  arm: new THREE.CapsuleGeometry(0.042, 0.1, 2, 10),
  mitt: new THREE.SphereGeometry(0.056, 12, 10),
  leg: new THREE.CapsuleGeometry(0.055, 0.09, 2, 10),
  shoe: new THREE.BoxGeometry(0.105, 0.062, 0.152),
  eye: new THREE.SphereGeometry(0.04, 14, 12),
  pupil: new THREE.SphereGeometry(0.019, 10, 8),
  brow: new THREE.BoxGeometry(0.058, 0.015, 0.018),
  nose: new THREE.SphereGeometry(0.023, 10, 8),
  mouth: new THREE.TorusGeometry(0.042, 0.009, 8, 18, Math.PI * 0.85),
};

/** The shirt, drawn rather than tinted: an apron panel over the chest with a
 *  waist band and a couple of woven lines, so "textured clothing" means an
 *  actual map and not a second flat colour. 128px is plenty — it is never
 *  seen larger than a few hundred screen pixels. */
function makeShirtTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = P.shirt;
  g.fillRect(0, 0, 128, 128);
  // Weave: faint darker lines, enough to catch the eye at close zoom.
  g.strokeStyle = "rgba(0,0,0,0.10)";
  g.lineWidth = 1;
  for (let y = 3; y < 128; y += 7) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); }
  // Apron panel, centred on u = 0.5 which thetaStart puts on the chest.
  g.fillStyle = P.apron;
  g.fillRect(44, 8, 40, 120);
  g.fillStyle = "rgba(0,0,0,0.07)";
  g.fillRect(44, 8, 3, 120);
  g.fillRect(81, 8, 3, 120);
  // Waist band across the whole wrap.
  g.fillStyle = P.trouser;
  g.fillRect(0, 104, 128, 12);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

function Face() {
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s}>
          {/* Sat on the sphere's surface: z solved from the head radius so the
              eye sits proud of the skull rather than sinking into it. */}
          <Part geometry={G.eye} color={P.eyeWhite} outline={0.05}
            position={[s * 0.062, HEAD_Y + 0.035, 0.128]} scale={[1, 1.15, 0.45]} />
          <mesh geometry={G.pupil} position={[s * 0.066, HEAD_Y + 0.03, 0.148]} scale={[1, 1.15, 0.5]}>
            <meshBasicMaterial color={P.pupil} />
          </mesh>
          <Part geometry={G.brow} color={P.hair} outline={0}
            position={[s * 0.064, HEAD_Y + 0.088, 0.118]} rotation={[0, 0, s * -0.2]} />
        </group>
      ))}
      <Part geometry={G.nose} color={P.skinShade} outline={0}
        position={[0, HEAD_Y - 0.005, 0.15]} scale={[1, 0.85, 0.7]} />
      {/* Rotated a half-turn so the arc opens upward — a smile, not a frown. */}
      <mesh geometry={G.mouth} position={[0, HEAD_Y - 0.072, 0.138]} rotation={[0.2, 0, Math.PI * 1.075]}>
        <meshBasicMaterial color={P.pupil} />
      </mesh>
    </group>
  );
}

export function PrototypeFigure() {
  const shirt = useMemo(() => makeShirtTexture(), []);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (body.current) body.current.position.y = Math.sin(t * 1.6) * 0.012;
    if (head.current) head.current.rotation.y = Math.sin(t * 0.4) * 0.3;
  });

  return (
    <group>
      {/* Legs — short and thick, which is most of what makes the proportion
          read as playful rather than merely small. */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.072, 0, 0]}>
          <Part geometry={G.shoe} color={P.shoe} position={[0, 0.031, 0.022]} />
          <Part geometry={G.leg} color={P.trouser} position={[0, 0.165, 0]} />
        </group>
      ))}

      <group ref={body}>
        <Part geometry={G.torso} color="#FFFFFF" map={shirt} position={[0, 0.45, 0]} />
        <Part geometry={G.neck} color={P.skin} outline={0} position={[0, 0.6, 0]} />

        {/* Stubby arms, big mitts. No fingers: at this scale they would be
            mush, and a mitt is the honest version of the same shape. */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.145, 0.545, 0]} rotation={[0, 0, s * 0.28]}>
            <Part geometry={G.arm} color={P.shirt} position={[0, -0.075, 0]} />
            <Part geometry={G.mitt} color={P.skin} position={[0, -0.155, 0.01]} scale={[1, 0.92, 0.85]} />
          </group>
        ))}

        <group ref={head}>
          <Part geometry={G.head} color={P.skin} position={[0, HEAD_Y, 0]} />
          <Part geometry={G.hair} color={P.hair} outline={0.03}
            position={[0, HEAD_Y, 0]} rotation={[0.16, 0, 0]} />
          <Face />
        </group>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* The lab                                                            */
/* ------------------------------------------------------------------ */

/** The office's own rig, copied exactly, because a toon ramp is only as good
 *  as the light hitting it — judging this figure under different lights would
 *  tell us nothing about how it lands in the scene it is auditioning for. */
function Rig() {
  return (
    <>
      <ambientLight intensity={0.85} color="#FFFFFF" />
      <hemisphereLight intensity={0.7} color="#FFFFFF" groundColor="#D8D8D2" />
      <directionalLight
        castShadow position={[9, 14, 7]} intensity={2.9} color="#FFFFFF"
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0006}
        shadow-camera-left={-4} shadow-camera-right={4}
        shadow-camera-top={4} shadow-camera-bottom={-4}
        shadow-camera-near={0.5} shadow-camera-far={40}
      />
    </>
  );
}

export default function FigureLab() {
  return (
    <div style={{ position: "relative", width: "100%", height: "100dvh", background: "#FBFBF9" }}>
      <Canvas
        dpr={[1, 3]}
        shadows="soft"
        gl={{ antialias: true }}
        camera={{ position: [1.5, 1.15, 1.9], fov: 28, near: 0.1, far: 50 }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.NoToneMapping; }}
      >
        <Rig />
        <PrototypeFigure />

        {/* Desk height, for scale only. Not a design proposal. */}
        <mesh position={[0, 0.21, -0.55]} receiveShadow castShadow>
          <boxGeometry args={[0.72, 0.42, 0.4]} />
          <meshToonMaterial color="#E4E4E0" gradientMap={RAMP} />
        </mesh>

        <ContactShadows position={[0, 0.001, 0]} opacity={0.4} scale={4} blur={2.2} far={2} />
        <OrbitControls target={[0, 0.45, 0]} minDistance={0.6} maxDistance={6} />
      </Canvas>
      <div style={{
        position: "absolute", left: 16, bottom: 16, fontFamily: "IBM Plex Mono, monospace",
        fontSize: 11, letterSpacing: "0.04em", color: "#6C7466", lineHeight: 1.6,
      }}>
        figure prototype · toon ramp 3-step · inverted-hull outline
        <br />drag to orbit, scroll to zoom · grey box is desk height (0.42)
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * What this breaks, and what it does not.
 *
 * NOT art-direction.md §0-§3. That document is scoped, by its own header and
 * by CLAUDE.md, to the booking floor plan, and explicitly not to src/office.
 * Its §0 ban on lights and on anything but MeshBasicMaterial, its §1
 * orthographic-only camera and its §2 three-value face system have no
 * jurisdiction here — the office already runs three lights, MeshStandardMaterial
 * and a perspective camera.
 *
 * What it does break is .antigravity.md:
 *
 * §2, Colour — the real one. "The desks, figures, cards, and chrome on top of
 * it stay neutral (bone, clay, or white)", restated in §10 as the rule "most
 * likely to get broken by accident". Skin tone, aubergine shirt and slate
 * trousers are all non-neutral and all on a figure. This is the break the
 * whole prototype turns on, and it is deliberate, not an accident.
 *
 * §7, Components — "no fully human face, Bitmoji-simple heads at most". Eyes
 * with pupils, brows, a nose and a mouth is past Bitmoji-simple, though the
 * clause reads as though it was written about 2D chips rather than the 3D
 * office, where the same line asks for figures to be "full-bodied".
 *
 * §2's hard rule on yellow is NOT broken: the skin tone is hue 24°, an
 * orange-brown, and nothing here sits in the 50-65° yellow band.
 *
 * Department wayfinding is deliberately protected. The five ground tones sit
 * at hue 9 (rose), 41 (gold), 92 (sage), 166 (teal) and 213 (blue), so the
 * 240-350 arc is clear of every department hue, and both clothing colours are
 * put in it — shirt 289°, trousers 249°, nearest department 36° away. A figure
 * therefore cannot be mistaken for a floor marking, which is the actual harm
 * §2 is defending against. An earlier slate trouser at 220° was 6° off
 * Marketing's blue and was moved for exactly this reason.
 *
 * That arc is no longer empty, though, and this comment used to say it was.
 * Mulberry caution sits at 318°, where it was put when it was moved off
 * Finance's gold — 29° from the shirt and 69° from the trousers. Wayfinding is
 * untouched, since caution is a status colour carried by dashboard text and
 * badges rather than by any ground plane in the office, and the shirt is a far
 * greyer purple besides: 14% saturation against mulberry's 42%. So the
 * clothing still collides with nothing it could be confused for. The arc is
 * simply narrower than claimed, and the next colour placed in it wants
 * checking against 318° rather than assuming the whole range is free.
 *
 * One colour to check rather than trust: the apron is a warm off-white whose
 * computed hue (42°) is a degree from Finance's gold. It reads as bone because
 * its saturation is 25% against gold's 53% and it sits at 92% lightness, but
 * it is the one material here that a strict reading of the no-yellow rule
 * might want argued.
 * ------------------------------------------------------------------ */
