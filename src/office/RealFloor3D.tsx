import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
} from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Html } from "@react-three/drei";
import { motion, useSpring, useTransform } from "framer-motion";
import FirstPaint from "../three/FirstPaint";

/**
 * RealFloor3D — the same layout, positions, hues and task data as
 * RealFloor.tsx's ported SVG scene, rebuilt as real Three.js geometry so it
 * can be dragged and orbited in genuine 3D (OrbitControls) rather than the
 * flat, fixed-angle isometric projection the production site actually uses.
 * The panel, task state and department data are the same as RealFloor.tsx;
 * only the scene itself (the office islands + hub) is real 3D here — the
 * venue interior keeps the ported 2D drawing since that wasn't part of the
 * ask.
 */

/* ------------------------------------------------------------------ */
/* Data — identical shape to RealFloor.tsx's DEPTS/tasks               */
/* ------------------------------------------------------------------ */

type TaskState = "needs" | "watching" | "done";

type Task = {
  id: string;
  state: TaskState;
  time: string;
  system: string;
  text: string;
  /** Who's actually saying this — the named person on the desk it came from. */
  agent: string;
  trail?: string[];
  approveLabel?: string;
  doneText?: string;
  doneTime?: string;
};

type Dept = {
  id: string;
  name: string;
  u: number;
  v: number;
  size: number;
  own?: boolean;
  hue: number;
  n: string;
  desks: { label: string; own?: boolean }[];
  stack: { label: string; own?: boolean }[];
  metrics: [string, string][];
  tasks: Task[];
};

const DEPTS: Dept[] = [
  {
    id: "bookings", n: "006", name: "Bookings", u: 8.0, v: 8.0, size: 3.7, own: true, hue: 18,
    desks: [{ label: "Enquiries", own: true }, { label: "Waitlist", own: true }, { label: "Functions", own: true }, { label: "Table plan", own: true }, { label: "Deposits", own: true }, { label: "Guest book", own: true }],
    stack: [{ label: "Peregrine native", own: true }],
    metrics: [["Covers tonight", "86 / 80"], ["Enquiries handled", "6"]],
    tasks: [
      { id: "b1", state: "needs", time: "06:04", system: "Functions", agent: "Ruby", text: "Function quote, 18 guests, Saturday lunch",
        trail: ["22:14 · Enquiry arrived through the website form", "05:58 · Quote drafted from your function menu at $61 a head", "06:04 · Waiting for you. It goes out in your name."],
        approveLabel: "Approve and send", doneText: "Function quote sent, 18 guests, Saturday lunch", doneTime: "06:41" },
      { id: "b2", state: "watching", time: "06:00", system: "Waitlist", agent: "Felix", text: "Saturday sits at 84 of 96 covers, waitlist is on" },
      { id: "b3", state: "done", time: "05:46", system: "Enquiries", agent: "Ruby", text: "Eleven enquiries answered overnight" },
      { id: "b4", state: "done", time: "05:33", system: "Table plan", agent: "Felix", text: "Table plan redrawn for the 6pm turn" },
      { id: "b5", state: "done", time: "05:20", system: "Deposits", agent: "Ruby", text: "Two Friday no-shows charged their $20 deposit, per the policy you set" },
      { id: "b6", state: "done", time: "05:24", system: "Deposits", agent: "Ruby", text: "Deposits held for Saturday, $540 across 27 bookings" },
      { id: "b7", state: "watching", time: "05:40", system: "Guest book", agent: "Nadia", text: "Forty-one first-timers this month, six already back a second time" },
    ],
  },
  {
    id: "suppliers", n: "001", name: "Suppliers & stock", u: 9.75, v: -0.75, size: 3.7, hue: 152,
    desks: [{ label: "Ordermentum" }, { label: "Fresho" }, { label: "Par levels" }],
    stack: [{ label: "Ordermentum" }, { label: "Fresho" }, { label: "Bidfood" }],
    metrics: [["Lines checked", "14"], ["Orders drafted", "3"]],
    tasks: [
      { id: "s1", state: "needs", time: "06:04", system: "Ordermentum", agent: "Leo", text: "Tomato order redrafted, tomatoes are up 34%",
        trail: ["05:31 · Price check caught roma tomatoes at $4.20 a kilo, up from $3.13", "05:52 · Tomorrow's order redrafted around the move, $118 in total", "06:04 · Waiting for you. Nothing is sent until you approve it."],
        approveLabel: "Approve the order", doneText: "Order sent to Ordermentum, $118", doneTime: "06:43" },
      { id: "s2", state: "watching", time: "05:31", system: "Fresho", agent: "Priya", text: "Cream has moved twice this month, watching before flagging" },
      { id: "s3", state: "done", time: "05:44", system: "Fresho", agent: "Priya", text: "Friday's delivery checked against the invoice, one credit requested" },
      { id: "s4", state: "done", time: "05:31", system: "Ordermentum", agent: "Priya", text: "Fourteen lines price-checked across both platforms" },
      { id: "s5", state: "done", time: "05:50", system: "Par levels", agent: "Leo", text: "Dry store held at par, nothing ordered" },
    ],
  },
  {
    id: "books", n: "002", name: "Finance", u: 0.75, v: -9.75, size: 3.7, hue: 328,
    desks: [{ label: "Xero" }, { label: "Square" }, { label: "Bank feed" }],
    stack: [{ label: "Xero" }, { label: "MYOB" }, { label: "Square" }],
    metrics: [["Reconciled", "148 / 150"], ["Payrun", "Lodged"]],
    tasks: [
      { id: "k1", state: "watching", time: "05:38", system: "Xero", agent: "Sarah", text: "Two lines held for the accountant, $136 in total" },
      { id: "k2", state: "done", time: "05:38", system: "Square", agent: "Brett", text: "148 of 150 card takings cleared against Xero" },
      { id: "k3", state: "done", time: "05:41", system: "Xero", agent: "Sarah", text: "Three invoices chased, one paid overnight" },
      { id: "k4", state: "done", time: "05:29", system: "Xero", agent: "Sarah", text: "The payrun lodged to STP" },
    ],
  },
  {
    id: "admin", n: "004", name: "Admin", u: -9.0, v: -9.0, size: 3.7, hue: 262,
    desks: [{ label: "Website", own: true }, { label: "Email" }, { label: "Phone", own: true }],
    stack: [{ label: "Website", own: true }, { label: "Phone line", own: true }, { label: "Gmail" }, { label: "Google Business" }],
    metrics: [["Calls answered", "4"], ["Listing", "Current"]],
    tasks: [
      { id: "a1", state: "watching", time: "05:58", system: "Phone", agent: "Willa", text: "A supplier voicemail from 21:40, transcribed and filed" },
      { id: "a2", state: "done", time: "05:10", system: "Phone", agent: "Oscar", text: "Four calls answered after close, three became bookings, straight into the book" },
      { id: "a3", state: "done", time: "05:15", system: "Website", agent: "Willa", text: "Menu prices updated from Tuesday's supplier change" },
      { id: "a4", state: "done", time: "05:18", system: "Google Business", agent: "Oscar", text: "Listing hours confirmed for the public holiday" },
      { id: "a5", state: "done", time: "04:52", system: "Phone", agent: "Willa", text: "A dietary question answered from your own menu notes" },
      { id: "a6", state: "watching", time: "05:59", system: "Phone", agent: "Willa", text: "One caller asked for you by name, held for the morning" },
    ],
  },
  {
    id: "marketing", n: "003", name: "Marketing", u: -0.75, v: 9.75, size: 3.7, hue: 192,
    desks: [{ label: "Instagram" }, { label: "Meta Ads" }, { label: "Google" }, { label: "Guest CRM", own: true }],
    stack: [{ label: "Guest CRM", own: true }, { label: "Instagram" }, { label: "Meta Ads" }, { label: "Google Business" }],
    metrics: [["Creatives queued", "3"], ["Spend", "$180 / $250"]],
    tasks: [
      { id: "m1", state: "watching", time: "05:55", system: "Meta Ads", agent: "Mia", text: "Ad spend pacing at $180 of your $250 week" },
      { id: "m2", state: "done", time: "05:55", system: "Instagram", agent: "Mia", text: "Three winter menu creatives drafted for your Thursday queue" },
      { id: "m3", state: "done", time: "05:12", system: "Google", agent: "Noah", text: "Six reviews answered in your voice, approved by you Friday" },
      { id: "m4", state: "done", time: "05:08", system: "Guest CRM", agent: "Noah", text: "Thank-you notes sent to Friday's eleven first-timers" },
      { id: "m5", state: "watching", time: "05:50", system: "Guest CRM", agent: "Mia", text: "Fourteen regulars not seen in 60 days, a win-back drafted for your queue" },
    ],
  },
  {
    id: "roster", n: "007", name: "Rostering", u: -9.75, v: 0.75, size: 3.7, hue: 42,
    desks: [{ label: "Deputy" }, { label: "Award rates" }],
    stack: [{ label: "Deputy" }, { label: "Tanda" }],
    metrics: [["Saturday draft", "28.1%"], ["Timesheets", "Approved"]],
    tasks: [
      { id: "r1", state: "watching", time: "05:47", system: "Deputy", agent: "Maya", text: "Saturday's draft holds labour at 28.1% of forecast" },
      { id: "r2", state: "done", time: "05:47", system: "Deputy", agent: "Maya", text: "Three shifts amended for availability" },
      { id: "r3", state: "done", time: "05:23", system: "Award rates", agent: "Tom", text: "Award rates checked against the winter roster" },
    ],
  },
];

const ALL_TASKS = DEPTS.flatMap((d) => d.tasks);

/** Which department owns a given task, so the overview list (which has no
 *  department context of its own) can still show its colour and number. */
const TASK_DEPT = new Map<string, Dept>();
DEPTS.forEach((d) => d.tasks.forEach((t) => TASK_DEPT.set(t.id, d)));

/* ------------------------------------------------------------------ */
/* Palette + geometry constants                                       */
/* ------------------------------------------------------------------ */

const C = {
  bone: "#F7F7F5",
  sand: "#EFEFEC",
  paper: "#FBFBF9",
  ink: "#2B2E28",
  amber: "#7C2B24",
  torso: ["#2B2E28", "#33362F", "#26281F"],
};

const HUB_R = 2.8;
const SLAB = 0.2;
const HOUSE_H = 1.4;
const HOUSE_R = 1.05;
/** How far above true ground (y=0) the hub and every island float. Without
 *  this, a platform sits almost flush with the ground and its staircase has
 *  nowhere real to descend to — it just reads as a block glued to the side. */
const LEVITATE = 1.3;

function hueTop(h: number) { return new THREE.Color(`hsl(${h}, 62%, 88%)`); }
function hueSide(h: number) { return new THREE.Color(`hsl(${h}, 66%, 62%)`); }

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}
const rand = (seed: string) => hash(seed);

/* ------------------------------------------------------------------ */
/* Shape kit                                                          */
/* ------------------------------------------------------------------ */

const GEO = {
  head: new THREE.SphereGeometry(0.17, 32, 24),
  torso: new THREE.CapsuleGeometry(0.16, 0.3, 2, 7),
  arm: new THREE.CapsuleGeometry(0.05, 0.24, 1, 5),
};

function Worker({ seed, position }: { seed: string; position: [number, number, number] }) {
  const group = useRef<THREE.Group>(null);
  const phase = useMemo(() => rand(seed) * Math.PI * 2, [seed]);
  const yaw = useMemo(() => (rand(seed + "y") - 0.5) * 0.6, [seed]);
  const tone = useMemo(() => C.torso[Math.floor(rand(seed + "t") * 3)], [seed]);
  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.position.y = Math.sin((t / 3) * Math.PI * 2 + phase) * 0.03;
  });
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <group ref={group}>
        <mesh castShadow geometry={GEO.torso} position={[0, 0.34, 0]}>
          <meshStandardMaterial color={tone} roughness={1} flatShading />
        </mesh>
        <mesh castShadow geometry={GEO.head} position={[0, 0.72, 0]}>
          <meshStandardMaterial color="#FFFFFF" roughness={0.85} />
        </mesh>
      </group>
    </group>
  );
}

function Desk({ position, rotation, label }: { position: [number, number, number]; rotation: number; label: string }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.21, 0]}>
        <boxGeometry args={[0.72, 0.42, 0.4]} />
        <meshStandardMaterial color="#FFFFFF" roughness={1} flatShading />
      </mesh>
      <mesh castShadow position={[0, 0.52, 0.05]} rotation={[0.22, 0, 0]}>
        <boxGeometry args={[0.4, 0.25, 0.03]} />
        <meshStandardMaterial color="#26332C" roughness={1} flatShading />
      </mesh>
      <Worker seed={label} position={[0, 0, -0.55]} />
      <Html position={[0, 0, 0.42]} center zIndexRange={[3, 0]} distanceFactor={9}>
        <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 8, letterSpacing: "0.05em",
          color: "#6C7466", whiteSpace: "nowrap", pointerEvents: "none" }}>{label}</div>
      </Html>
    </group>
  );
}

function deskLayout(count: number): { pos: [number, number, number]; rot: number }[] {
  const cols = count <= 4 ? 2 : 3;
  const rows = Math.ceil(count / cols);
  const out: { pos: [number, number, number]; rot: number }[] = [];
  for (let i = 0; i < count; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    const jx = (rand(`${count}-${i}-x`) - 0.5) * 0.2;
    const jz = (rand(`${count}-${i}-z`) - 0.5) * 0.2;
    out.push({ pos: [(c - (cols - 1) / 2) * 1.15 + jx, 0, (r - (rows - 1) / 2) * 1.2 + jz], rot: (rand(`${count}-${i}-r`) - 0.5) * 0.24 });
  }
  return out;
}

function OutdoorTable({ position, parasol = false }: { position: [number, number, number]; parasol?: boolean }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.28, 6]} />
        <meshStandardMaterial color="#8B9384" roughness={0.7} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.29, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.02, 20]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.88} flatShading />
      </mesh>
      {[[-0.32, 0], [0.32, 0]].map(([x, z], i) => (
        <mesh key={i} castShadow position={[x, 0.14, z]}>
          <cylinderGeometry args={[0.1, 0.1, 0.02, 16]} />
          <meshStandardMaterial color="#D7DACC" roughness={0.9} flatShading />
        </mesh>
      ))}
      {parasol ? (
        <group position={[0, 0.29, 0]}>
          <mesh castShadow position={[0, 0.28, 0]}>
            <cylinderGeometry args={[0.014, 0.014, 0.56, 6]} />
            <meshStandardMaterial color="#8B9384" roughness={0.7} />
          </mesh>
          <mesh castShadow position={[0, 0.54, 0]}>
            <coneGeometry args={[0.34, 0.16, 12]} />
            <meshStandardMaterial color="#C15A3E" roughness={0.85} flatShading />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}

function Pin({ position, rotation = 0, tone = C.ink }: { position: [number, number, number]; rotation?: number; tone?: string }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow position={[0, 0.14, 0]}>
        <coneGeometry args={[0.06, 0.28, 10]} />
        <meshStandardMaterial color={tone} roughness={0.8} flatShading />
      </mesh>
      <mesh castShadow position={[0, 0.32, 0]}>
        <sphereGeometry args={[0.05, 12, 10]} />
        <meshStandardMaterial color={tone} roughness={0.8} flatShading />
      </mesh>
    </group>
  );
}

function Plant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.07, 0.06, 0.12, 10]} />
        <meshStandardMaterial color="#8B9384" roughness={0.9} flatShading />
      </mesh>
      <mesh castShadow position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.11, 10, 8]} />
        <meshStandardMaterial color="#6E9B7C" roughness={0.85} flatShading />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Department feature scenery — what makes each island its own job,   */
/* not the same desk cluster six times over.                          */
/* ------------------------------------------------------------------ */

/** A board on two legs, with real HTML content on its face (a chart, a
 *  roster grid, a poster) — the content always faces the camera, same as
 *  every other label in the scene, so it stays legible from any angle. */
function SignBoard({
  position, rotation = 0, w = 0.5, h = 0.36, boardColor = "#FFFFFF", children,
}: { position: [number, number, number]; rotation?: number; w?: number; h?: number; boardColor?: string; children: React.ReactNode }) {
  const legH = h + 0.22;
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[-w * 0.36, w * 0.36].map((x, i) => (
        <mesh key={i} castShadow position={[x, legH / 2, 0]}>
          <cylinderGeometry args={[0.014, 0.014, legH, 6]} />
          <meshStandardMaterial color="#8B9384" roughness={0.7} />
        </mesh>
      ))}
      <mesh castShadow receiveShadow position={[0, legH - h / 2 + 0.05, 0.012]}>
        <boxGeometry args={[w, h, 0.02]} />
        <meshStandardMaterial color={boardColor} roughness={0.92} flatShading />
      </mesh>
      <Html position={[0, legH - h / 2 + 0.05, 0.03]} center zIndexRange={[3, 0]} distanceFactor={8}>
        {children}
      </Html>
    </group>
  );
}

const boardText: React.CSSProperties = {
  fontFamily: "Inter, sans-serif", fontSize: 11, color: "#2B2E28", pointerEvents: "none", userSelect: "none",
};

/** Marketing — a framed poster on an easel, one colour block of "artwork". */
function Poster({ position, rotation = 0, colors }: { position: [number, number, number]; rotation?: number; colors: [string, string, string] }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow position={[0, 0.01, -0.14]} rotation={[0.32, 0, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.5, 6]} />
        <meshStandardMaterial color="#8B9384" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[-0.16, 0.01, 0.1]} rotation={[-0.32, 0, 0.05]}>
        <cylinderGeometry args={[0.01, 0.01, 0.46, 6]} />
        <meshStandardMaterial color="#8B9384" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0.16, 0.01, 0.1]} rotation={[-0.32, 0, -0.05]}>
        <cylinderGeometry args={[0.01, 0.01, 0.46, 6]} />
        <meshStandardMaterial color="#8B9384" roughness={0.7} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.34, -0.03]} rotation={[-0.22, 0, 0]}>
        <boxGeometry args={[0.34, 0.44, 0.015]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.92} flatShading />
      </mesh>
      {colors.map((c, i) => (
        <mesh key={i} position={[0, 0.42 - i * 0.13, -0.02]} rotation={[-0.22, 0, 0]}>
          <planeGeometry args={[0.26, 0.1]} />
          <meshStandardMaterial color={c} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/** A flat splash of colour on the platform, drying where it was mixed. */
function PaintSplat({ position, color, r = 0.06 }: { position: [number, number, number]; color: string; r?: number }) {
  return (
    <mesh position={[position[0], 0.001, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[r, 10]} />
      <meshStandardMaterial color={color} roughness={1} transparent opacity={0.85} />
    </mesh>
  );
}

/** A drafting table, tilted, with someone bent over the drawing on it. */
function DraftingDesk({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[[-0.24, -0.16], [0.24, -0.16]].map(([x, z], i) => (
        <mesh key={i} castShadow position={[x, 0.19, z]}>
          <cylinderGeometry args={[0.014, 0.014, 0.38, 6]} />
          <meshStandardMaterial color="#3D3D3D" roughness={0.8} />
        </mesh>
      ))}
      <mesh castShadow receiveShadow position={[0, 0.36, -0.02]} rotation={[-0.42, 0, 0]}>
        <boxGeometry args={[0.56, 0.4, 0.02]} />
        <meshStandardMaterial color="#F0F0EE" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, 0.42, 0.09]} rotation={[-0.42, 0, 0]}>
        <planeGeometry args={[0.24, 0.16]} />
        <meshStandardMaterial color="#C15A3E" roughness={1} />
      </mesh>
      <Worker seed="marketing-drafter" position={[0, 0, 0.34]} />
    </group>
  );
}

/** A screen showing a little grid of tiles — the "watching social media"
 *  read, without needing an actual feed. */
function SocialScreen({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const tiles = ["#C15A3E", "#4FAE90", "#9A7B3F", "#80D0B8", "#203048", "#E8998D"];
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow position={[0, 0.16, 0]}>
        <boxGeometry args={[0.34, 0.02, 0.24]} />
        <meshStandardMaterial color="#D7DACC" roughness={0.9} flatShading />
      </mesh>
      <mesh castShadow position={[0, 0.3, -0.08]} rotation={[-0.15, 0, 0]}>
        <boxGeometry args={[0.3, 0.2, 0.015]} />
        <meshStandardMaterial color="#1B2420" roughness={0.6} />
      </mesh>
      <Html position={[0, 0.3, -0.065]} center zIndexRange={[3, 0]} distanceFactor={6}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 7px)", gridGap: 1.5, transform: "rotate(0deg)" }}>
          {tiles.map((c, i) => <div key={i} style={{ width: 7, height: 7, background: c }} />)}
        </div>
      </Html>
    </group>
  );
}

/** Suppliers — a produce crate, one of several piled by the door. */
function Crate({ position, color, rotation = 0 }: { position: [number, number, number]; color: string; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.09, 0]}>
        <boxGeometry args={[0.26, 0.18, 0.2]} />
        <meshStandardMaterial color="#B08B5A" roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0, 0.19, 0]}>
        <boxGeometry args={[0.24, 0.02, 0.18]} />
        <meshStandardMaterial color={color} roughness={0.85} flatShading />
      </mesh>
      {[[-0.06, -0.04], [0.05, 0.02], [-0.01, 0.05]].map(([x, z], i) => (
        <mesh key={i} castShadow position={[x, 0.23, z]}>
          <sphereGeometry args={[0.035, 8, 6]} />
          <meshStandardMaterial color={color} roughness={0.7} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/** A dark opening in a short wall, warm light spilling out — "the kitchen"
 *  the crates are headed into. */
function KitchenPass({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow receiveShadow position={[-0.3, 0.34, 0]}>
        <boxGeometry args={[0.14, 0.68, 0.3]} />
        <meshStandardMaterial color="#EFEFEC" roughness={0.9} flatShading />
      </mesh>
      <mesh castShadow receiveShadow position={[0.3, 0.34, 0]}>
        <boxGeometry args={[0.14, 0.68, 0.3]} />
        <meshStandardMaterial color="#EFEFEC" roughness={0.9} flatShading />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.7, 0]}>
        <boxGeometry args={[0.74, 0.08, 0.3]} />
        <meshStandardMaterial color="#EFEFEC" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, 0.34, -0.14]}>
        <planeGeometry args={[0.44, 0.6]} />
        <meshStandardMaterial color="#F0A868" emissive="#F0A868" emissiveIntensity={0.55} roughness={1} />
      </mesh>
    </group>
  );
}

/** Finance — a whiteboard carrying the same donut-chart language as the
 *  dashboard's own sales-mix widget, so the two read as one system. */
function PieBoard({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <SignBoard position={position} rotation={rotation} w={0.5} h={0.4}>
      <svg width="64" height="64" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#E3E5DA" strokeWidth="5" />
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#203048" strokeWidth="5" strokeDasharray="56 100" pathLength="100" transform="rotate(-90 18 18)" />
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#4FAE90" strokeWidth="5" strokeDasharray="30 100" pathLength="100" transform="rotate(112 18 18)" />
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#9A7B3F" strokeWidth="5" strokeDasharray="14 100" pathLength="100" transform="rotate(220 18 18)" />
      </svg>
    </SignBoard>
  );
}

/** A calculator on the desk, someone's fingers on it. */
function Calculator({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.015, 0]}>
        <boxGeometry args={[0.13, 0.03, 0.18]} />
        <meshStandardMaterial color="#26332C" roughness={0.6} flatShading />
      </mesh>
      <mesh position={[0, 0.031, -0.055]}>
        <boxGeometry args={[0.1, 0.001, 0.035]} />
        <meshStandardMaterial color="#8FBFA8" emissive="#8FBFA8" emissiveIntensity={0.4} roughness={1} />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => {
        const gx = i % 3, gy = Math.floor(i / 3);
        return (
          <mesh key={i} position={[(gx - 1) * 0.032, 0.032, 0.01 + gy * 0.032]}>
            <boxGeometry args={[0.024, 0.008, 0.024]} />
            <meshStandardMaterial color="#F0F0EE" roughness={0.85} flatShading />
          </mesh>
        );
      })}
    </group>
  );
}

/** Bookings — the big desk fielding calls, papers dropped as they come in. */
function AdminDesk({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.24, 0]}>
        <boxGeometry args={[0.9, 0.48, 0.46]} />
        <meshStandardMaterial color="#FFFFFF" roughness={1} flatShading />
      </mesh>
      <mesh castShadow position={[0, 0.5, 0.02]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.5, 0.3, 0.03]} />
        <meshStandardMaterial color="#26332C" roughness={1} flatShading />
      </mesh>
      <Worker seed="bookings-desk" position={[0, 0, -0.42]} />
      <group position={[0.22, 0.485, -0.14]} rotation={[-0.3, 0.2, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.05, 0.11, 0.02]} />
          <meshStandardMaterial color="#161616" roughness={0.7} flatShading />
        </mesh>
      </group>
    </group>
  );
}

/** Loose paper, dropped as the calls come in and get logged. */
function DroppedPapers({ position }: { position: [number, number, number] }) {
  const sheets = useMemo(() => Array.from({ length: 4 }, (_, i) => ({
    x: (rand(`pp${i}x`) - 0.5) * 0.5, z: (rand(`pp${i}z`) - 0.5) * 0.4, r: rand(`pp${i}r`) * Math.PI,
  })), []);
  return (
    <group position={position}>
      {sheets.map((s, i) => (
        <mesh key={i} position={[s.x, 0.003 * (i + 1), s.z]} rotation={[-Math.PI / 2, 0, s.r]}>
          <planeGeometry args={[0.12, 0.16]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

/** Admin — a printer, mid-job, with the page it's just finished half out. */
function Printer({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.11, 0]}>
        <boxGeometry args={[0.32, 0.22, 0.26]} />
        <meshStandardMaterial color="#F0F0EE" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, 0.225, -0.02]}>
        <boxGeometry args={[0.28, 0.01, 0.2]} />
        <meshStandardMaterial color="#26332C" roughness={0.7} flatShading />
      </mesh>
      <mesh position={[0, 0.19, 0.135]} rotation={[0.55, 0, 0]}>
        <planeGeometry args={[0.24, 0.16]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** A stack of filed folders, colour-tabbed. */
function FolderStack({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const colors = ["#C15A3E", "#4FAE90", "#9A7B3F", "#203048"];
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {colors.map((c, i) => (
        <mesh key={i} castShadow receiveShadow position={[0, 0.014 + i * 0.028, 0]}>
          <boxGeometry args={[0.22, 0.026, 0.28]} />
          <meshStandardMaterial color={c} roughness={0.85} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/** Rostering — a whiteboard of names, each with a coloured sticker. */
function RosterBoard({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const rows = [
    ["Maya", "#4FAE90"], ["Tom", "#C15A3E"], ["Priya", "#9A7B3F"], ["Sam", "#80D0B8"],
  ] as const;
  return (
    <SignBoard position={position} rotation={rotation} w={0.56} h={0.4}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, width: 92 }}>
        {rows.map(([name, c]) => (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: c, flex: "none" }} />
            <span style={{ ...boardText, fontSize: 9, fontWeight: 600 }}>{name}</span>
          </div>
        ))}
      </div>
    </SignBoard>
  );
}

/**
 * Every department's own feature — what makes it read as that job rather
 * than a desk cluster with a different label.
 */
function DeptFeature({
  id, position, rotation,
}: { id: string; position: [number, number, number]; rotation: number }) {
  switch (id) {
    case "marketing":
      return (
        <group>
          <Poster position={[position[0] - 0.3, position[1], position[2] - 0.2]} rotation={rotation + 0.3} colors={["#C15A3E", "#80D0B8", "#9A7B3F"]} />
          <Poster position={[position[0] + 0.28, position[1], position[2] + 0.12]} rotation={rotation - 0.25} colors={["#4FAE90", "#E8998D", "#203048"]} />
          <DraftingDesk position={[position[0] + 0.05, position[1], position[2] - 0.55]} rotation={rotation} />
          <SocialScreen position={[position[0] - 0.55, position[1], position[2] + 0.35]} rotation={rotation + 0.6} />
          <PaintSplat position={[position[0] - 0.15, 0, position[2] + 0.5]} color="#C15A3E" r={0.05} />
          <PaintSplat position={[position[0] + 0.4, 0, position[2] - 0.3]} color="#4FAE90" r={0.04} />
          <PaintSplat position={[position[0] - 0.5, 0, position[2] - 0.05]} color="#9A7B3F" r={0.045} />
        </group>
      );
    case "bookings":
      return (
        <group>
          <AdminDesk position={position} rotation={rotation} />
          <DroppedPapers position={[position[0] - Math.cos(rotation) * 0.1, position[1], position[2] - Math.sin(rotation) * 0.1 - 0.5]} />
        </group>
      );
    case "suppliers":
      return (
        <group>
          <KitchenPass position={[position[0] + Math.cos(rotation) * 0.35, position[1], position[2] + Math.sin(rotation) * 0.35]} rotation={rotation + Math.PI / 2} />
          <Crate position={[position[0] - 0.3, position[1], position[2] - 0.15]} color="#C15A3E" rotation={0.3} />
          <Crate position={[position[0] - 0.15, position[1], position[2] + 0.2]} color="#4FAE90" rotation={-0.2} />
          <Crate position={[position[0] - 0.42, position[1], position[2] + 0.15]} color="#9A7B3F" rotation={0.5} />
          <Crate position={[position[0] - 0.25, 0.18, position[2] - 0.05]} color="#E8998D" rotation={-0.4} />
        </group>
      );
    case "books":
      return (
        <group>
          <PieBoard position={position} rotation={rotation} />
          <Calculator position={[position[0] - Math.sin(rotation) * 0.3, position[1], position[2] + Math.cos(rotation) * 0.3]} rotation={rotation} />
        </group>
      );
    case "admin":
      return (
        <group>
          <Printer position={position} rotation={rotation} />
          <FolderStack position={[position[0] - Math.sin(rotation) * 0.34, position[1], position[2] + Math.cos(rotation) * 0.34]} rotation={rotation} />
        </group>
      );
    case "roster":
      return <RosterBoard position={position} rotation={rotation} />;
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Island (a department)                                              */
/* ------------------------------------------------------------------ */

function Island({
  dept, waiting, selected, onSelect,
}: { dept: Dept; waiting: number; selected: boolean; onSelect: (id: string) => void }) {
  const [hovered, setHovered] = useState(false);
  const pos: [number, number, number] = [dept.u, LEVITATE, dept.v];
  const top = hueTop(dept.hue);
  const side = hueSide(dept.hue);
  const desks = useMemo(() => deskLayout(dept.desks.length), [dept.desks.length]);

  // Everything below is local to this island's own group (already translated
  // to dept.u/dept.v by `pos`), so these must NOT add dept.u/dept.v again —
  // that was the earlier bug that sent props drifting well off the platform.
  const ang = Math.atan2(dept.v, dept.u);
  // A side edge (perpendicular to the hub axis) for the department's own
  // feature scenery — kept off the hub-facing edge so it never competes
  // with the walkway bridge that connects there.
  const featAng = ang + Math.PI / 2;
  const featPos: [number, number, number] = [Math.cos(featAng) * (dept.size - 0.3), 0, Math.sin(featAng) * (dept.size - 0.3)];
  const tablePos: [number, number, number] = [dept.size - 0.6, 0, -dept.size + 0.6];

  // A tall, heavily-coloured riser does most of the visible vertical surface
  // (this is what reads as "the department's colour" at a glance), capped by
  // a thin bright top — two flat-shaded blocks meeting at a hard seam, which
  // is also what keeps the edge crisp rather than one pale gradient-lit box.
  const riserH = 0.56, capH = 0.07;
  const onOver = (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; };
  const onOut = (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = ""; };
  const onClick = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelect(dept.id); };

  return (
    <group position={pos}>
      {/* stacked below the cap, not overlapping it — two coincident top faces
          at the same height is exactly what z-fights and reads as flickering
          colour as the camera moves */}
      <mesh castShadow receiveShadow position={[0, -capH - riserH / 2, 0]} onPointerOver={onOver} onPointerOut={onOut} onClick={onClick}>
        <boxGeometry args={[dept.size * 2, riserH, dept.size * 2]} />
        <meshStandardMaterial color={side} roughness={0.82} flatShading emissive={side} emissiveIntensity={selected || hovered ? 0.16 : 0} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, -capH / 2, 0]} onPointerOver={onOver} onPointerOut={onOut} onClick={onClick}>
        <boxGeometry args={[dept.size * 2 + 0.03, capH, dept.size * 2 + 0.03]} />
        <meshStandardMaterial color={top} roughness={0.85} flatShading />
      </mesh>

      <DeptFeature id={dept.id} position={featPos} rotation={featAng} />
      <Plant position={[-dept.size + 0.5, 0, -dept.size + 0.5]} />
      <Plant position={[dept.size - 0.5, 0, dept.size - 0.5]} />
      <OutdoorTable position={tablePos} />
      <Pin position={[tablePos[0] + 0.35, 0, tablePos[2] - 0.05]} rotation={-ang} tone={C.torso[2]} />

      {desks.map((d, i) => (
        <Desk key={i} position={d.pos} rotation={d.rot} label={dept.desks[i].label} />
      ))}

      <Html position={[-(dept.size + 0.55), 0.05, 0]} center zIndexRange={[4, 0]}>
        <div style={{ pointerEvents: "none", userSelect: "none", fontFamily: "IBM Plex Mono, monospace",
          fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
          color: selected || hovered ? "#203048" : "#8B9384", whiteSpace: "nowrap", textAlign: "center" }}>
          {dept.name}{dept.own ? " · OURS" : ""}
        </div>
      </Html>

      {waiting > 0 ? (
        <Html position={[0, 1.05, -dept.size * 0.3]} center zIndexRange={[6, 0]}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: C.amber, color: "#F8F8F3",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700,
            fontFamily: "Inter, sans-serif", boxShadow: "0 2px 6px rgba(32,48,72,0.3)", pointerEvents: "none" }}>
            {waiting}
          </div>
        </Html>
      ) : null}

      <ContactShadows position={[0, -LEVITATE - 0.02, 0]} scale={dept.size * 3} blur={1.2} opacity={0.2} far={4} resolution={512} color="#1B2420" />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Hub                                                                 */
/* ------------------------------------------------------------------ */

/** The department hues, so each knowledge-node in the brain can be coloured
 *  by which department's learning it represents — the same hue that
 *  department's island wears. */
const DEPT_HUES = DEPTS.map((d) => d.hue);

function buildWeb() {
  let seed = 20260810;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const cx = 65, cy = 65, nodes: { x: number; y: number; core: boolean; hue: number }[] = [];
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2, r = 6 + Math.sqrt(rnd()) * 34;
    nodes.push({ x: +(cx + Math.cos(a) * r).toFixed(1), y: +(cy + Math.sin(a) * r).toFixed(1), core: true, hue: DEPT_HUES[Math.floor(rnd() * DEPT_HUES.length)] });
  }
  for (let i = 0; i < 5; i++) {
    const a = rnd() * Math.PI * 2, r = 46 + rnd() * 16;
    nodes.push({ x: +(cx + Math.cos(a) * r).toFixed(1), y: +(cy + Math.sin(a) * r).toFixed(1), core: false, hue: DEPT_HUES[Math.floor(rnd() * DEPT_HUES.length)] });
  }
  const lines: { x1: number; y1: number; x2: number; y2: number; o: number; hue: number }[] = [];
  nodes.forEach((n, i) => {
    const near = nodes.map((m, j) => ({ j, d: Math.hypot(m.x - n.x, m.y - n.y) })).filter((o) => o.j !== i).sort((a, b) => a.d - b.d).slice(0, n.core ? 4 : 2);
    near.forEach((o) => lines.push({ x1: n.x, y1: n.y, x2: nodes[o.j].x, y2: nodes[o.j].y, o: n.core && nodes[o.j].core ? 0.75 : 0.5, hue: n.hue }));
  });
  return {
    nodes: nodes.map((n) => ({ x: n.x, y: n.y, r: n.core ? 1.9 : 2.4, o: n.core ? 0.85 : 0.95, hue: n.hue })),
    lines,
  };
}

/** The floating brain/network glyph above the hub — its own click target,
 *  separate from the house below it: this one opens the chat page. Each
 *  node is coloured by the department whose learning it represents. */
function HubOrb({ onTap }: { onTap: () => void }) {
  const web = useMemo(() => buildWeb(), []);
  return (
    <Html position={[0, 8.2, 0]} center zIndexRange={[8, 0]}>
      <div
        onClick={onTap}
        style={{ width: 150, height: 150, cursor: "pointer", animation: "aoDrift3d 26s ease-in-out infinite" }}
      >
        <svg width={150} height={150} viewBox="0 0 130 130" style={{ display: "block", animation: "aoSpin3d 78s linear infinite" }}>
          {web.lines.map((l, i) => (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={`hsl(${l.hue}, 50%, 52%)`} strokeOpacity={l.o} strokeWidth={0.5} />
          ))}
          {web.nodes.map((n, i) => (
            <circle key={i} cx={n.x} cy={n.y} r={n.r} fill={`hsl(${n.hue}, 62%, 54%)`} fillOpacity={n.o} />
          ))}
        </svg>
      </div>
    </Html>
  );
}

/** Two distinct targets, matching the production interaction: the house
 *  (the black cube) steps you into the venue floor plan; the brain orb
 *  floating above it opens the department chat page. */
/**
 * The hub, dressed as the venue it actually is rather than an abstract box:
 * an awning over the door, two lit windows, a rooftop sign on its own legs,
 * and pavement tables — one under a parasol — echoing the production Hub()
 * in `components/platform/scene/props.tsx`. Everything floats at LEVITATE,
 * same as the islands, so the whole cluster reads as hovering over one
 * shared ground rather than each piece sitting at its own arbitrary height.
 */
function Hub({ onEnterHouse, onEnterBrain }: { onEnterHouse: (x: number, y: number) => void; onEnterBrain: () => void }) {
  const [hovered, setHovered] = useState(false);
  const signH = HOUSE_H + 0.5;
  return (
    <group position={[0, LEVITATE, 0]}>
      <mesh castShadow receiveShadow position={[0, -SLAB / 2, 0]}>
        <boxGeometry args={[HUB_R * 2, SLAB, HUB_R * 2]} />
        <meshStandardMaterial color={C.bone} roughness={0.95} flatShading />
      </mesh>
      <mesh
        position={[0, 0.7, 0]} visible={false}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = ""; }}
        onClick={(e) => { e.stopPropagation(); onEnterHouse(e.nativeEvent.clientX, e.nativeEvent.clientY); }}
      >
        <boxGeometry args={[HOUSE_R * 2.6, 1.6, HOUSE_R * 2.6]} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, HOUSE_H / 2, 0]}>
        <boxGeometry args={[HOUSE_R * 2, HOUSE_H, HOUSE_R * 2]} />
        <meshStandardMaterial color="#161616" roughness={0.82} metalness={0.06} flatShading emissive="#161616" emissiveIntensity={hovered ? 0.3 : 0} />
      </mesh>

      {/* two lit windows on the left face */}
      {[-0.32, 0.32].map((z, i) => (
        <mesh key={i} position={[-HOUSE_R - 0.005, HOUSE_H * 0.56, z]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.28, 0.34]} />
          <meshStandardMaterial color="#F0D9A8" emissive="#F0D9A8" emissiveIntensity={0.5} roughness={1} />
        </mesh>
      ))}
      {/* the door, on the front-right face */}
      <mesh position={[HOUSE_R + 0.005, HOUSE_H * 0.32, 0.18]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[0.22, 0.62]} />
        <meshStandardMaterial color="#0B0B0B" roughness={0.9} />
      </mesh>
      {/* a striped awning over the door */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={i}
          castShadow
          position={[HOUSE_R + 0.12, HOUSE_H * 0.72, -0.22 + i * 0.1]}
          rotation={[0.6, 0, 0]}
        >
          <boxGeometry args={[0.16, 0.02, 0.11]} />
          <meshStandardMaterial color={i % 2 === 0 ? "#7C2B24" : "#F8F8F3"} roughness={0.85} flatShading />
        </mesh>
      ))}

      {/* rooftop sign, on its own legs above the black cube */}
      {[-0.32, 0.32].map((x, i) => (
        <mesh key={i} castShadow position={[x, HOUSE_H + 0.24, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.3, 6]} />
          <meshStandardMaterial color="#161616" roughness={0.7} />
        </mesh>
      ))}
      <mesh castShadow position={[0, signH, 0]}>
        <boxGeometry args={[0.9, 0.24, 0.1]} />
        <meshStandardMaterial color="#161616" roughness={0.82} flatShading />
      </mesh>
      <Html position={[0, signH, 0.06]} center zIndexRange={[7, 0]}>
        <div style={{ pointerEvents: "none", userSelect: "none", fontFamily: "Inter, sans-serif", fontSize: 9,
          fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#F8F8F3",
          whiteSpace: "nowrap" }}>Peregrine</div>
      </Html>

      {/* pavement tables, one shaded */}
      <OutdoorTable position={[HOUSE_R + 0.55, 0, -0.5]} parasol />
      <OutdoorTable position={[-0.5, 0, HOUSE_R + 0.55]} />

      <HubOrb onTap={onEnterBrain} />
      <ContactShadows position={[0, -LEVITATE - 0.02, 0]} scale={HUB_R * 3} blur={1.2} opacity={0.2} far={4} resolution={512} color="#1B2420" />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Walkway between the hub and an island                              */
/* ------------------------------------------------------------------ */

function Walkway({ dept }: { dept: Dept }) {
  const len = Math.hypot(dept.u, dept.v);
  const dir = new THREE.Vector3(dept.u, 0, dept.v).normalize();
  const inner = HUB_R - 0.05;
  const outer = len - dept.size + 0.05;
  const span = outer - inner;
  const mid = dir.clone().multiplyScalar(inner + span / 2);
  const angle = Math.atan2(dir.x, dir.z);
  return (
    <mesh position={[mid.x, LEVITATE - SLAB / 2, mid.z]} rotation={[0, angle, 0]} receiveShadow>
      <boxGeometry args={[0.9, SLAB * 0.7, span]} />
      <meshStandardMaterial color={C.sand} roughness={1} flatShading />
    </mesh>
  );
}

/** Small glowing dots travelling along one walkway, department toward hub —
 *  a continuous feed reading as data flowing in from that department. */
function DataFlow({ dept }: { dept: Dept }) {
  const len = Math.hypot(dept.u, dept.v);
  const dir = useMemo(() => new THREE.Vector3(dept.u, 0, dept.v).normalize(), [dept.u, dept.v]);
  const inner = HUB_R + 0.1;
  const outer = len - dept.size - 0.1;
  const count = 3;
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const color = useMemo(() => hueSide(dept.hue), [dept.hue]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const m = refs.current[i];
      if (!m) continue;
      const phase = ((t * 0.12) + i / count) % 1;
      const d = THREE.MathUtils.lerp(outer, inner, phase);
      m.position.set(dir.x * d, LEVITATE + 0.06, dir.z * d);
    }
  });
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
    </>
  );
}

/** The same feed continuing on past the hub, up into the brain above it —
 *  the "invisible pipeline" reads as running the whole way, shop to brain. */
function BrainFeed() {
  const count = 4;
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const m = refs.current[i];
      if (!m) continue;
      const phase = ((t * 0.09) + i / count) % 1;
      const y = THREE.MathUtils.lerp(LEVITATE + 0.3, LEVITATE + 7.9, phase);
      m.position.set(0, y, 0);
    }
  });
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color="#8B9384" />
        </mesh>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Camera rig — free orbit by default, with a click-to-focus option.  */
/* ------------------------------------------------------------------ */

/** Roughly midway between the platforms and the brain floating above the
 *  hub, so the wide view centres the whole cluster instead of looking
 *  down at ground level and pushing the orb up near the frame's edge. */
const WIDE_TARGET_Y = LEVITATE + 3.6;

function Rig({ focus }: { focus: [number, number] | null }) {
  const controls = useRef<any>(null);
  const { camera, gl } = useThree();
  const desiredTarget = useRef(new THREE.Vector3(0, WIDE_TARGET_Y, 0));
  const desiredDist = useRef(68);
  // Only forces the camera toward desired{Target,Dist} for a short window
  // right after a focus change; decays to 0 so a manual pinch-zoom or drag
  // afterward is never fought and simply sticks, however far in or out.
  const settle = useRef(1);

  useEffect(() => {
    if (focus) {
      desiredTarget.current.set(focus[0], LEVITATE + 0.4, focus[1]);
      desiredDist.current = 14;
    } else {
      desiredTarget.current.set(0, WIDE_TARGET_Y, 0);
      desiredDist.current = 78;
    }
    settle.current = 1;
  }, [focus]);

  useFrame(() => {
    const c = controls.current;
    if (!c) return;
    if (settle.current > 0.002) {
      c.target.lerp(desiredTarget.current, 0.06);
      const offset = camera.position.clone().sub(c.target);
      const sph = new THREE.Spherical().setFromVector3(offset);
      sph.radius = THREE.MathUtils.lerp(sph.radius, desiredDist.current, 0.06);
      offset.setFromSpherical(sph);
      camera.position.copy(c.target).add(offset);
      settle.current *= 0.92;
    }
    c.update();
  });

  // A plain two-finger swipe on a trackpad, and the mouse wheel, both fire as
  // a wheel event with no ctrlKey — that should scroll the page like it does
  // anywhere else on the site. A genuine pinch gesture is the one case a
  // trackpad reports as wheel + ctrlKey, and that's the only one that should
  // zoom the scene. OrbitControls' own enableZoom can't tell these apart
  // (it zooms on any wheel event), so it's off and this replaces it.
  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const c = controls.current;
      if (!c) return;
      const factor = Math.pow(1.0025, e.deltaY);
      const offset = camera.position.clone().sub(c.target);
      const sph = new THREE.Spherical().setFromVector3(offset);
      sph.radius = THREE.MathUtils.clamp(sph.radius * factor, 5, 140);
      offset.setFromSpherical(sph);
      camera.position.copy(c.target).add(offset);
      desiredDist.current = sph.radius;
      settle.current = 0;
      c.update();
    };
    el.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => el.removeEventListener("wheel", onWheel, { capture: true } as any);
  }, [gl, camera]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan
      enableZoom={false}
      enableDamping
      dampingFactor={0.08}
      minPolarAngle={0.15}
      maxPolarAngle={1.45}
      minDistance={5}
      maxDistance={140}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

function Scene({
  waitingByDept, selected, onSelectIsland, onEnterHouse, onEnterBrain,
}: {
  waitingByDept: Record<string, number>;
  selected: string | null;
  onSelectIsland: (id: string) => void;
  onEnterHouse: (x: number, y: number) => void;
  onEnterBrain: () => void;
}) {
  const focus = useMemo<[number, number] | null>(() => {
    if (!selected) return null;
    const d = DEPTS.find((x) => x.id === selected);
    return d ? [d.u, d.v] : null;
  }, [selected]);

  return (
    <>
      <mesh position={[0, -4, 0]} rotation={[-Math.PI / 2, 0, 0]} onClick={() => onSelectIsland("")}>
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      <ambientLight intensity={0.85} color="#FFFFFF" />
      <hemisphereLight intensity={0.7} color="#FFFFFF" groundColor="#D8D8D2" />
      <directionalLight
        castShadow position={[9, 14, 7]} intensity={2.9} color="#FFFFFF"
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0006}
        shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20}
        shadow-camera-near={0.5} shadow-camera-far={60}
      />

      <Hub onEnterHouse={onEnterHouse} onEnterBrain={onEnterBrain} />
      {DEPTS.map((d) => <Walkway key={d.id} dept={d} />)}
      {DEPTS.map((d) => <DataFlow key={`flow-${d.id}`} dept={d} />)}
      <BrainFeed />
      {DEPTS.map((d) => (
        <Island key={d.id} dept={d} waiting={waitingByDept[d.id] ?? 0} selected={selected === d.id} onSelect={onSelectIsland} />
      ))}

      <Rig focus={focus} />
    </>
  );
}

function Loading() {
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#F0F0F0" }}>
      <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6C7466" }}>
        preparing office
      </span>
    </div>
  );
}

const KEYFRAMES3D = `@keyframes aoSpin3d{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes aoDrift3d{0%,100%{transform:translate(0,0)}33%{transform:translate(3px,-2px)}66%{transform:translate(-2px,3px)}}`;

/* ------------------------------------------------------------------ */
/* Minimal Reveal (same as RealFloor.tsx)                             */
/* ------------------------------------------------------------------ */


/** A headline digit that springs to its new value rather than just
 *  swapping text — the one number on the page worth making feel alive. */
function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(value, { stiffness: 260, damping: 22 });
  const rounded = useTransform(spring, (v) => Math.round(v));
  const [display, setDisplay] = useState(value);
  useEffect(() => { spring.set(value); }, [value, spring]);
  useEffect(() => {
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return unsub;
  }, [rounded]);
  return (
    <motion.span
      key={value}
      initial={{ scale: 1.35, opacity: 0.4 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 18 }}
      style={{ display: "inline-block", fontVariantNumeric: "tabular-nums" }}
    >
      {display}
    </motion.span>
  );
}

function TaskRow({ task, state, dept, onApprove }: { task: Task; state: TaskState; dept: Dept; onApprove: (id: string) => void }) {
  if (!dept) return null;
  const done = state === "done" && task.state === "needs";
  const text = done ? task.doneText ?? task.text : task.text;
  const time = done ? task.doneTime ?? task.time : task.time;
  const hue = dept.hue;
  const wash = `hsl(${hue}, 55%, 97%)`;
  const border = `hsl(${hue}, 45%, 89%)`;
  const deptInk = `hsl(${hue}, 55%, 38%)`;
  // The agent's own voice for the body — a request when it's waiting on you,
  // a plain report otherwise (the text already reads as one). Who's talking
  // is carried by the avatar header now, so it doesn't need repeating here.
  const body = state === "needs" && !done ? `I need your help on ${text}` : text;
  return (
    <li
      className="floor__task"
      data-state={state}
      data-cleared={done || undefined}
      style={{
        display: "flex", flexDirection: "column", gap: 8,
        background: wash, border: `1px solid ${border}`, borderRadius: 14,
        padding: "13px 15px", listStyle: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <div
          aria-hidden
          style={{
            flex: "none", width: 32, height: 32, borderRadius: "50%",
            background: `linear-gradient(150deg, hsl(${hue},68%,60%), hsl(${hue},62%,42%))`,
            border: "2px solid #fff", boxShadow: "0 2px 6px rgba(20,20,20,0.16)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13,
          }}
        >
          {task.agent[0]}
        </div>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2, minWidth: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 13.5, color: "#1a1a1a" }}>{task.agent}</span>
          <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 9.5, letterSpacing: "0.05em",
            textTransform: "uppercase", color: deptInk }}>{dept.name}</span>
        </div>
        <span
          aria-hidden
          style={{
            marginLeft: "auto", flex: "none", fontFamily: "IBM Plex Mono, monospace", fontSize: 10,
            fontWeight: 700, color: deptInk, background: "#fff", border: `1px solid ${border}`,
            borderRadius: 999, padding: "2px 8px",
          }}
        >
          {dept.n}
        </span>
      </div>
      <div className="floor__task-main" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <p className="floor__task-text" style={{ margin: 0 }}>{body}</p>
        <p className="floor__task-meta" style={{ margin: 0 }}>
          <span>{time}</span><span aria-hidden> · </span><span>{task.system}</span>
          {done ? (<><span aria-hidden> · </span><span>Approved by you</span></>) : null}
        </p>
        {state === "needs" && task.trail ? (
          <>
            <ol className="floor__trail">{task.trail.map((t) => <li key={t}>{t}</li>)}</ol>
            <button type="button" className="floor__approve" onClick={() => onApprove(task.id)}>{task.approveLabel ?? "Approve"}</button>
          </>
        ) : null}
      </div>
    </li>
  );
}

function StackRow({ dept }: { dept: Dept }) {
  return (
    <div className="floor__stackrow">
      <span className="floor__stackrow-label">{dept.own ? "Runs on" : "Works with"}</span>
      <span className="floor__stackrow-chips">
        {dept.stack.map((s) => (
          <span key={s.label} className="floor__syschip" data-own={s.own || undefined}>
            <span className="floor__syschip-tile" aria-hidden>{s.label[0]}</span>{s.label}
          </span>
        ))}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Top level                                                          */
/* ------------------------------------------------------------------ */

export default function RealFloor3D() {
  const [selected, setSelected] = useState<string | null>(null);
  const [states, setStates] = useState<Record<string, TaskState>>(() =>
    Object.fromEntries(ALL_TASKS.map((t) => [t.id, t.state])));
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (document.getElementById("real-floor-3d-keyframes")) return;
    const st = document.createElement("style");
    st.id = "real-floor-3d-keyframes";
    st.textContent = KEYFRAMES3D;
    document.head.appendChild(st);
  }, []);

  const needsCount = ALL_TASKS.filter((t) => states[t.id] === "needs").length;

  const waitingByDept = useMemo(
    () => Object.fromEntries(DEPTS.map((d) => [d.id, d.tasks.filter((t) => states[t.id] === "needs").length])) as Record<string, number>,
    [states],
  );

  function select(id: string) {
    setSelected(id || null);
  }
  function approve(id: string) {
    const task = ALL_TASKS.find((t) => t.id === id);
    if (!task) return;
    setStates((s) => ({ ...s, [id]: "done" }));
  }

  const dept = DEPTS.find((d) => d.id === selected) ?? null;

  return (
    <section className="floor">
      <div className="floor__stage">
        <div className="floor__scene" data-zoomed={selected ? "" : undefined}>
          <div style={{ position: "relative", width: "100%", aspectRatio: "1490 / 1064", background: "#F0F0F0", borderRadius: 12, overflow: "hidden" }}>
            <Suspense fallback={<Loading />}>
              <Canvas
                dpr={[1, 3]}
                shadows="soft"
                gl={{ antialias: true, preserveDrawingBuffer: true }}
                camera={{ position: [54, 45, 34], fov: 28, near: 1, far: 200 }}
                onCreated={({ gl, scene }) => {
                  gl.shadowMap.type = THREE.PCFSoftShadowMap;
                  gl.toneMapping = THREE.NoToneMapping;
                  scene.background = new THREE.Color(C.paper);
                }}
              >
                <Scene
                  waitingByDept={waitingByDept}
                  selected={selected}
                  onSelectIsland={select}
                  onEnterHouse={(x, y) => window.dispatchEvent(new CustomEvent("agentoffice-house", { detail: { x, y } }))}
                  onEnterBrain={() => window.dispatchEvent(new CustomEvent("agentoffice-hub"))}
                />
              </Canvas>
            </Suspense>
          </div>
        </div>

        <aside ref={panelRef} className="floor__panel" data-dept={dept?.id}>
          <p className="floor__panel-headline" data-clear={needsCount === 0 || undefined}>
            {needsCount === 0 ? (
              "Nothing needs you. Go open."
            ) : (
              <><AnimatedNumber value={needsCount} /> {needsCount === 1 ? "thing needs" : "things need"} you.</>
            )}
          </p>

          {dept ? (
            <>
              <div className="floor__panel-head">
                <p className="floor__panel-dept">
                  <span className="floor__panel-n">{dept.n}</span>
                  <span className="floor__panel-sep" aria-hidden> · </span>
                  {dept.name.toUpperCase()}
                </p>
                <button type="button" className="floor__panel-back" onClick={() => select("")}>All departments</button>
              </div>
              <StackRow dept={dept} />
              <ul className="floor__tasks">
                {[...dept.tasks]
                  .sort((a, b) => ["needs", "watching", "done"].indexOf(states[a.id]) - ["needs", "watching", "done"].indexOf(states[b.id]))
                  .map((t) => <TaskRow key={t.id} task={t} state={states[t.id]} dept={dept} onApprove={approve} />)}
              </ul>
            </>
          ) : (
            <ul className="floor__tasks">
              {ALL_TASKS.filter((t) => states[t.id] === "needs").map((t) => (
                <TaskRow key={t.id} task={t} state="needs" dept={TASK_DEPT.get(t.id)!} onApprove={approve} />
              ))}
              {needsCount === 0 ? (
                <li className="floor__task-empty">Both cleared. The order is with Ordermentum and the quote is in their inbox, and both are on the log with what they cost.</li>
              ) : null}
            </ul>
          )}

          <p className="floor__panel-note">Drag to look around, scroll to zoom, click an island for its desks.</p>
        </aside>
      </div>
    </section>
  );
}


/* ------------------------------------------------------------------ *
 * The scene on its own.
 *
 * RealFloor3D above is the whole standalone page: the canvas plus a side
 * panel carrying its own ~270 CSS rules. Inside the app shell that panel
 * already exists (src/dashboard/TaskPanel), so this exports just the room
 * — the coloured department islands, the house and the brain — and takes
 * callbacks rather than firing CustomEvents into the void.
 * ------------------------------------------------------------------ */

export function RealFloorScene({
  onOpenDepartment,
  onEnterVenue,
  onOpenBrain,
  waitingByDept = {},
  resetFocus = 0,
}: {
  onOpenDepartment?: (id: string) => void;
  onEnterVenue?: () => void;
  onOpenBrain?: () => void;
  waitingByDept?: Record<string, number>;
  resetFocus?: number;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (document.getElementById("real-floor-3d-keyframes")) return;
    const st = document.createElement("style");
    st.id = "real-floor-3d-keyframes";
    st.textContent = KEYFRAMES3D;
    document.head.appendChild(st);
  }, []);

  /* Held in a ref so the effect depends on `selected` alone — hosts pass
     inline arrows, and as dependencies they re-fire it every render, which
     makes a popup impossible to close. */
  const open = useRef(onOpenDepartment);
  open.current = onOpenDepartment;
  useEffect(() => {
    if (selected) open.current?.(selected);
  }, [selected]);

  useEffect(() => {
    if (resetFocus > 0) setSelected(null);
  }, [resetFocus]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: C.paper, overflow: "hidden" }}>
      <Suspense fallback={<Loading />}>
        <Canvas
          dpr={[1, 3]}
          shadows="soft"
          gl={{ antialias: true, preserveDrawingBuffer: true }}
          camera={{ position: [54, 45, 34], fov: 28, near: 1, far: 200 }}
          onCreated={({ gl, scene }) => {
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
            gl.toneMapping = THREE.NoToneMapping;
            scene.background = new THREE.Color(C.paper);
          }}
        >
          <FirstPaint />
          <Scene
            waitingByDept={waitingByDept}
            selected={selected}
            onSelectIsland={(id: string) => setSelected(id || null)}
            onEnterHouse={() => onEnterVenue?.()}
            onEnterBrain={() => onOpenBrain?.()}
          />
        </Canvas>
      </Suspense>
    </div>
  );
}
