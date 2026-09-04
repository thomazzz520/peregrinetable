import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
} from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  OrbitControls,
  ContactShadows,
  Html,
} from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import Constellation from "../brain/Constellation";
import FirstPaint from "../three/FirstPaint";

/* ------------------------------------------------------------------ *
 * Types — all scene state comes in through `agents` / `platforms`.
 * ------------------------------------------------------------------ */

export type AgentStatus = "idle" | "alert";
export type AgentBadge = "approval" | "input";

export interface Agent {
  id: string;
  name: string;
  platform: PlatformId;
  status: AgentStatus;
  /** only rendered when status === 'alert' */
  badge?: AgentBadge;
  /** 0 | 1 | 2 — muted ochre / sage / dusty rose. omit for auto */
  tone?: 0 | 1 | 2;
}

export type PlatformId = "suppliers" | "roster" | "marketing" | "finance" | "bookings" | "admin";

export interface PlatformStat {
  label: string;
  value: number;
}

export interface Platform {
  id: PlatformId;
  title: string;
  agentCount: number;
  stats: PlatformStat[];
  /** shown in amber on the card when set */
  attention?: string;
}

export interface AgentOfficeProps {
  agents?: Agent[];
  platforms?: Platform[];
  onSelect?: (agentId: string, platform: PlatformId) => void;
  /** Fired when the brain on the island is clicked — opens the chat. */
  onOpenBrain?: () => void;
  /** Fired when a department platform is clicked — opens its popup. The
   *  camera still flies to the platform underneath; the popup is what the
   *  owner reads, the zoom is what tells them where they are. */
  onOpenDepartment?: (id: PlatformId) => void;
  /** How long the brain has been learning this venue. Drives its density. */
  daysLearned?: number;
  className?: string;
}

/* ------------------------------------------------------------------ *
 * Palette — mirrors the dashboard: card white on paper, ink / sage / ochre.
 * ------------------------------------------------------------------ */

const C = {
  bone: "#F7F7F5", // platform faces
  sand: "#EFEFEC", // paths
  clay: "#FFFFFF", // buildings, desks, secondary surfaces
  paper: "#FBFBF9", // ground / scene background
  cream: "#FFFFFF", // heads
  ink: "#2B2E28",
  amber: "#7C2B24", // needs-you
  green: "#5B6A58",
  torso: ["#2B2E28", "#33362F", "#26281F"], // near-monochrome charcoal
};

/** Per-platform ground tint — most platforms are plain white; a couple get
 *  a faint colour wash, matching the real site's reference look. */
const PLATFORM_TINT: Partial<Record<PlatformId, string>> = {};

/* ------------------------------------------------------------------ *
 * Layout — six platforms in a hexagon ring, ramps into a central hub.
 * ------------------------------------------------------------------ */

const R = 9.5; // hub centre -> platform centre
const PLATFORM_R = 2.6;
const HUB_R = 1.9;
const SLAB = 0.16;

/* theta measured clockwise from north; x = R sin(theta), z = -R cos(theta) */
const PLATFORM_POS: Record<PlatformId, [number, number, number]> = {
  admin: [0, 0, -R],
  finance: [R * 0.866, 0, -R * 0.5],
  suppliers: [R * 0.866, 0, R * 0.5],
  bookings: [0, 0, R],
  marketing: [-R * 0.866, 0, R * 0.5],
  roster: [-R * 0.866, 0, -R * 0.5],
};

const DEFAULT_PLATFORMS: Platform[] = [
  {
    id: "suppliers",
    title: "Suppliers",
    agentCount: 4,
    stats: [
      { label: "invoices matched", value: 12 },
      { label: "flagged", value: 2 },
    ],
    attention: "2 awaiting approval",
  },
  {
    id: "roster",
    title: "Roster",
    agentCount: 3,
    stats: [
      { label: "shifts drafted", value: 9 },
      { label: "awaiting approval", value: 1 },
    ],
  },
  {
    id: "marketing",
    title: "Marketing",
    agentCount: 2,
    stats: [
      { label: "posts queued", value: 4 },
      { label: "scheduled", value: 3 },
    ],
  },
  {
    id: "finance",
    title: "Finance",
    agentCount: 5,
    stats: [
      { label: "transactions cleared", value: 148 },
      { label: "unmatched", value: 6 },
    ],
  },
  {
    id: "bookings",
    title: "Bookings",
    agentCount: 2,
    stats: [
      { label: "covers confirmed", value: 86 },
      { label: "waitlisted", value: 5 },
    ],
  },
  {
    id: "admin",
    title: "Admin",
    agentCount: 2,
    stats: [
      { label: "documents filed", value: 21 },
      { label: "renewals due", value: 1 },
    ],
  },
];

const DEFAULT_AGENTS: Agent[] = [
  { id: "sup-1", name: "Invoice match", platform: "suppliers", status: "alert", badge: "approval" },
  { id: "sup-2", name: "PO reconcile", platform: "suppliers", status: "alert", badge: "approval" },
  { id: "sup-3", name: "Vendor intake", platform: "suppliers", status: "idle" },
  { id: "sup-4", name: "Price watch", platform: "suppliers", status: "idle" },
  { id: "ros-1", name: "Shift drafter", platform: "roster", status: "alert", badge: "input" },
  { id: "ros-2", name: "Leave cover", platform: "roster", status: "idle" },
  { id: "ros-3", name: "Hours audit", platform: "roster", status: "idle" },
  { id: "mkt-1", name: "Post queue", platform: "marketing", status: "idle" },
  { id: "mkt-2", name: "Reply triage", platform: "marketing", status: "idle" },
  { id: "fin-1", name: "Ledger sweep", platform: "finance", status: "idle" },
  { id: "fin-2", name: "Card feed", platform: "finance", status: "idle" },
  { id: "fin-3", name: "Unmatched", platform: "finance", status: "alert", badge: "input" },
  { id: "fin-4", name: "FX rounding", platform: "finance", status: "idle" },
  { id: "fin-5", name: "Month close", platform: "finance", status: "idle" },
  { id: "bkg-1", name: "Reservation intake", platform: "bookings", status: "alert", badge: "input" },
  { id: "bkg-2", name: "Waitlist manager", platform: "bookings", status: "idle" },
  { id: "adm-1", name: "Compliance check", platform: "admin", status: "idle" },
  { id: "adm-2", name: "Filing", platform: "admin", status: "idle" },
];

/* ------------------------------------------------------------------ *
 * Deterministic per-instance jitter so the grid never reads as cloned.
 * ------------------------------------------------------------------ */

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}
const rand = (seed: string) => hash(seed);

/* Shared low-poly geometry — every worker is ~190 tris. */
const GEO = {
  head: new THREE.SphereGeometry(0.17, 48, 32),
  torso: new THREE.CapsuleGeometry(0.16, 0.3, 2, 7),
  arm: new THREE.CapsuleGeometry(0.05, 0.24, 1, 5),
};

/* ------------------------------------------------------------------ *
 * Worker — primitives only, no external model.
 * ------------------------------------------------------------------ */

interface WorkerProps {
  agent: Agent;
  position: [number, number, number];
  /** true when the worker's platform is focused: idle bob runs */
  live: boolean;
  onSelect?: (id: string, platform: PlatformId) => void;
  onHoverChange: (hovering: boolean) => void;
}

function Worker({ agent, position, live, onSelect, onHoverChange }: WorkerProps) {
  const group = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Mesh>(null);
  const armR = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const hoverPulse = useRef(0);
  const compact = useThree((st) => st.size.width) < 520;

  const seed = useMemo(
    () => ({
      phase: rand(agent.id) * Math.PI * 2,
      yaw: (rand(agent.id + "y") - 0.5) * 0.5,
      tone: agent.tone ?? (Math.floor(rand(agent.id + "t") * 3) as 0 | 1 | 2),
      shade: 0.97 + rand(agent.id + "s") * 0.06,
    }),
    [agent.id, agent.tone]
  );

  const torsoColor = useMemo(() => {
    const c = new THREE.Color(C.torso[seed.tone]);
    c.multiplyScalar(seed.shade);
    return c;
  }, [seed.tone, seed.shade]);

  const alert = agent.status === "alert";

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (hoverPulse.current > 0) hoverPulse.current = Math.max(0, hoverPulse.current - dt * 1.6);

    // Static unless this worker actually needs a per-frame update.
    const animating = alert || hovered || hoverPulse.current > 0 || live;
    if (!animating) return;

    const g = torso.current;
    if (!g) return;

    const pulse = hoverPulse.current > 0 ? Math.sin(hoverPulse.current * Math.PI) : 0;
    const amp = 0.04 * (alert ? 2 : 1) + pulse * 0.05;
    const period = alert ? 1.1 : 3;
    g.position.y = Math.sin((t / period) * Math.PI * 2 + seed.phase) * amp;

    if (armL.current && armR.current) {
      const raise = alert ? 1 : 0;
      const osc = alert ? Math.sin(t * 7 + seed.phase) * 0.35 : 0;
      const target = raise * (2.35 + osc);
      armL.current.rotation.z = THREE.MathUtils.lerp(armL.current.rotation.z, target, 0.18);
      armR.current.rotation.z = THREE.MathUtils.lerp(armR.current.rotation.z, -target, 0.18);
    }
  });

  const enter = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setHovered(true);
      onHoverChange(true);
      hoverPulse.current = 1;
      document.body.style.cursor = "pointer";
    },
    [onHoverChange]
  );
  const leave = useCallback(() => {
    setHovered(false);
    onHoverChange(false);
    document.body.style.cursor = "";
  }, [onHoverChange]);

  useEffect(() => () => void (document.body.style.cursor = ""), []);

  return (
    <group ref={group} position={position} rotation={[0, seed.yaw, 0]}>
      <group
        onPointerOver={enter}
        onPointerOut={leave}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(agent.id, agent.platform);
        }}
      >
        {/* generous invisible hit target */}
        <mesh position={[0, 0.42, 0]} visible={false}>
          <boxGeometry args={[0.6, 0.95, 0.5]} />
        </mesh>

        <group ref={torso}>
          <mesh castShadow geometry={GEO.torso} position={[0, 0.34, 0]}>
            <meshStandardMaterial
              color={torsoColor}
              roughness={1}
              metalness={0}
              flatShading
              emissive={C.paper}
              emissiveIntensity={hovered ? 0.22 : 0}
            />
          </mesh>
          <mesh castShadow geometry={GEO.head} position={[0, 0.72, 0]}>
            <meshStandardMaterial
              color={C.cream}
              roughness={0.85}
              metalness={0}
              emissive={C.paper}
              emissiveIntensity={hovered ? 0.25 : 0}
            />
          </mesh>
          {/* shoulder-pivoted arms */}
          <group position={[0.17, 0.47, 0]}>
            <mesh ref={armL} geometry={GEO.arm} castShadow position={[0.02, -0.14, 0]}>
              <meshStandardMaterial color={torsoColor} roughness={1} metalness={0} flatShading />
            </mesh>
          </group>
          <group position={[-0.17, 0.47, 0]}>
            <mesh ref={armR} geometry={GEO.arm} castShadow position={[-0.02, -0.14, 0]}>
              <meshStandardMaterial color={torsoColor} roughness={1} metalness={0} flatShading />
            </mesh>
          </group>
        </group>
      </group>

      <AnimatePresence>
        {alert && agent.badge && (
          <Html position={[0, 1.15, 0]} center zIndexRange={[20, 0]}>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [1, 1.12, 1], opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{
                scale: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
                opacity: { type: "spring", stiffness: 380, damping: 18 },
              }}
              style={{
                pointerEvents: "none",
                userSelect: "none",
                display: "flex",
                width: compact ? 15 : 22,
                height: compact ? 15 : 22,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                fontSize: compact ? 9 : 12,
                fontWeight: 500,
                color: "#F8F8F3",
                background: C.amber,
                fontFamily: "Archivo, Helvetica, Arial, sans-serif",
                boxShadow: "0 1px 3px rgba(38,51,44,0.18)",
              }}
            >
              {agent.badge === "approval" ? "!" : "?"}
            </motion.div>
          </Html>
        )}
      </AnimatePresence>
    </group>
  );
}

/* ------------------------------------------------------------------ *
 * Furniture
 * ------------------------------------------------------------------ */

function Desk({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.21, 0]}>
        <boxGeometry args={[0.74, 0.42, 0.42]} />
        <meshStandardMaterial color={C.clay} roughness={1} metalness={0} flatShading />
      </mesh>
      <mesh castShadow position={[0, 0.52, 0.06]} rotation={[0.24, 0, 0]}>
        <boxGeometry args={[0.42, 0.26, 0.03]} />
        <meshStandardMaterial color="#26332C" roughness={1} metalness={0} flatShading />
      </mesh>
    </group>
  );
}

/* One square slab. */
function Slab({
  radius,
  position,
  onClick,
  color = C.bone,
}: {
  radius: number;
  position: [number, number, number];
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  color?: string;
}) {
  return (
    <group position={position} onClick={onClick}>
      <mesh castShadow receiveShadow position={[0, -SLAB / 2, 0]}>
        <boxGeometry args={[radius * 2, SLAB, radius * 2]} />
        <meshStandardMaterial color={color} roughness={1} metalness={0} flatShading />
      </mesh>
    </group>
  );
}

/* Bridge: a single plank. */
function Ramp({ to }: { to: [number, number, number] }) {
  const dir = new THREE.Vector3(to[0], 0, to[2]).normalize();
  const inner = HUB_R - 0.05;
  const outer = R - PLATFORM_R + 0.05;
  const len = outer - inner;
  const mid = dir.clone().multiplyScalar(inner + len / 2);
  const angle = Math.atan2(dir.x, dir.z);
  return (
    <mesh position={[mid.x, -SLAB / 2, mid.z]} rotation={[0, angle, 0]} castShadow receiveShadow>
      <boxGeometry args={[1.0, SLAB, len]} />
      <meshStandardMaterial color={C.sand} roughness={1} metalness={0} flatShading />
    </mesh>
  );
}

/* ------------------------------------------------------------------ *
 * Platform props — each department gets its own small, distinct set of
 * furniture so the six platforms read as six different jobs, not one
 * desk shape repeated six times.
 * ------------------------------------------------------------------ */

const PROP_POS: [number, number, number] = [1.55, 0, -1.55];

/* Shared white "building" volume — every platform gets one, matching the
 * reference's small architectural-model look rather than a bare desk. */
/* ------------------------------------------------------------------ *
 * Shape kit — small reusable architectural pieces. Every platform is
 * built from a handful of these, composed at different heights, so the
 * office reads as a cluster of little buildings rather than one plain
 * box with a coloured trinket next to it.
 * ------------------------------------------------------------------ */

function Building({
  size = [0.42, 0.4, 0.36] as [number, number, number],
  position = [0, 0, 0] as [number, number, number],
  color = "#FFFFFF",
}: {
  size?: [number, number, number];
  position?: [number, number, number];
  color?: string;
}) {
  return (
    <mesh castShadow receiveShadow position={[position[0], size[1] / 2, position[2]]}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.92} flatShading />
    </mesh>
  );
}

/* A low flat-top block with a three-bar "ledger/crate" icon on its front
 * face — the recurring detail that reads as documents, stock, or shelving
 * depending on context. */
function StockBlock({
  position,
  size = [0.3, 0.2, 0.26] as [number, number, number],
  color = "#FFFFFF",
}: {
  position: [number, number, number];
  size?: [number, number, number];
  color?: string;
}) {
  const [w, h, d] = size;
  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, h / 2, 0]}>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} roughness={0.92} flatShading />
      </mesh>
      <group position={[0, h * 0.62, d / 2 + 0.001]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0, (i - 1) * 0.032, 0]}>
            <planeGeometry args={[w * 0.55, 0.012]} />
            <meshStandardMaterial color={C.ink} roughness={1} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* A tall slender tower — the vertical accent every cluster needs so it
 * doesn't read as one flat mass. */
function Tower({
  position,
  height = 1.1,
  size = 0.22,
  color = "#FFFFFF",
}: {
  position: [number, number, number];
  height?: number;
  size?: number;
  color?: string;
}) {
  return (
    <mesh castShadow receiveShadow position={[position[0], height / 2, position[2]]}>
      <boxGeometry args={[size, height, size]} />
      <meshStandardMaterial color={color} roughness={0.92} flatShading />
    </mesh>
  );
}

/* A small freestanding screen on a thin base. */
function Monitor({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.02, 0]}>
        <boxGeometry args={[0.16, 0.04, 0.12]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.9} flatShading />
      </mesh>
      <mesh castShadow position={[0, 0.11, -0.03]}>
        <boxGeometry args={[0.14, 0.14, 0.012]} />
        <meshStandardMaterial color={C.ink} roughness={0.7} flatShading />
      </mesh>
    </group>
  );
}

/* A low block with a raised knob — a button, bell, or vent depending on
 * where it's used; a small punctuation mark next to the bigger volumes. */
function KnobBlock({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, 0.05, 0]}>
        <boxGeometry args={[0.14, 0.1, 0.14]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.9} flatShading />
      </mesh>
      <mesh castShadow position={[0, 0.108, 0]}>
        <sphereGeometry args={[0.025, 12, 10]} />
        <meshStandardMaterial color={C.ink} roughness={0.6} flatShading />
      </mesh>
    </group>
  );
}

/* Two thin posts and a rail — the handrail line that runs alongside a
 * platform's steps or its outer edge. */
function Railing({
  position,
  length = 0.5,
  rotation = 0,
}: {
  position: [number, number, number];
  length?: number;
  rotation?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow position={[-length / 2, 0.12, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.24, 6]} />
        <meshStandardMaterial color={C.ink} roughness={0.6} flatShading />
      </mesh>
      <mesh castShadow position={[length / 2, 0.12, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.24, 6]} />
        <meshStandardMaterial color={C.ink} roughness={0.6} flatShading />
      </mesh>
      <mesh castShadow position={[0, 0.22, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.008, 0.008, length, 6]} />
        <meshStandardMaterial color={C.ink} roughness={0.6} flatShading />
      </mesh>
    </group>
  );
}

/* A minimal standing figure — tapered body, round head, no arms. Purely
 * decorative scenery (distinct from the interactive desk `Worker`s),
 * matching the reference's plain pin-shaped bystanders. */
function Pin({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow position={[0, 0.14, 0]}>
        <coneGeometry args={[0.06, 0.28, 10]} />
        <meshStandardMaterial color={C.ink} roughness={0.8} flatShading />
      </mesh>
      <mesh castShadow position={[0, 0.32, 0]}>
        <sphereGeometry args={[0.05, 12, 10]} />
        <meshStandardMaterial color={C.ink} roughness={0.8} flatShading />
      </mesh>
    </group>
  );
}

/* Three ascending blocks read as a stairway up to a platform's building. */
function Steps({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} castShadow receiveShadow position={[i * 0.13, 0.08 + i * 0.08, 0]}>
          <boxGeometry args={[0.13, 0.16 + i * 0.16, 0.36]} />
          <meshStandardMaterial color="#F0F0EE" roughness={0.92} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function PlatformProps({ id }: { id: PlatformId }) {
  switch (id) {
    case "suppliers":
      /* stairway up to the building, two stock blocks, a tower accent */
      return (
        <group position={PROP_POS} rotation={[0, 0.3, 0]}>
          <Steps position={[-0.62, 0, 0.05]} rotation={Math.PI} />
          <Railing position={[-0.62, 0, 0.28]} length={0.4} rotation={Math.PI / 2} />
          <Building />
          <StockBlock position={[0.4, 0, -0.3]} size={[0.3, 0.22, 0.26]} />
          <StockBlock position={[0.62, 0, -0.02]} size={[0.24, 0.16, 0.24]} color="#F2F2EE" />
          <Tower position={[0.12, 0, 0.4]} height={1.05} size={0.2} />
          <Pin position={[-0.42, 0, 0.42]} rotation={0.5} />
        </group>
      );

    case "marketing":
      /* building, a stock block, a slim easel flag, a monitor */
      return (
        <group position={PROP_POS} rotation={[0, -0.35, 0]}>
          <Building />
          <StockBlock position={[0.4, 0, -0.28]} size={[0.26, 0.18, 0.24]} color="#F2F2EE" />
          <Monitor position={[0.6, 0, 0.05]} rotation={0.3} />
          <group position={[-0.15, 0, 0.5]} rotation={[0, 0.4, 0]}>
            <mesh castShadow position={[0, 0.24, 0]} rotation={[0, 0, 0.06]}>
              <cylinderGeometry args={[0.01, 0.01, 0.48, 6]} />
              <meshStandardMaterial color={C.ink} roughness={0.6} flatShading />
            </mesh>
            <mesh castShadow position={[0.09, 0.42, 0]} rotation={[0, 0, -0.55]}>
              <planeGeometry args={[0.28, 0.2]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.85} side={THREE.DoubleSide} />
            </mesh>
          </group>
          <Pin position={[0.05, 0, 0.72]} rotation={-0.6} />
        </group>
      );

    case "bookings":
      /* building, a stock block, a monitor, a scatter of outdoor tables */
      return (
        <group position={PROP_POS} rotation={[0, 0.1, 0]}>
          <Building size={[0.4, 0.36, 0.34]} />
          <StockBlock position={[0.36, 0, -0.26]} size={[0.22, 0.14, 0.22]} color="#F2F2EE" />
          <Monitor position={[0.55, 0, 0.05]} rotation={0.2} />
          {[
            [0.55, 0.4],
            [0.75, 0.12],
            [0.28, 0.62],
          ].map(([x, z], i) => (
            <group key={i} position={[x, 0, z]}>
              <mesh castShadow position={[0, 0.11, 0]}>
                <cylinderGeometry args={[0.012, 0.012, 0.22, 6]} />
                <meshStandardMaterial color={C.ink} roughness={0.6} flatShading />
              </mesh>
              <mesh castShadow receiveShadow position={[0, 0.225, 0]}>
                <cylinderGeometry args={[0.11, 0.11, 0.02, 20]} />
                <meshStandardMaterial color="#FFFFFF" roughness={0.88} flatShading />
              </mesh>
            </group>
          ))}
          <Pin position={[-0.1, 0, 0.6]} rotation={0.2} />
        </group>
      );

    case "finance":
      /* the books — a tall tower, two ledger blocks, a monitor, a knob */
      return (
        <group position={PROP_POS} rotation={[0, 0.15, 0]}>
          <Tower position={[-0.1, 0, -0.05]} height={1.6} size={0.3} />
          <StockBlock position={[0.42, 0, 0.05]} size={[0.34, 0.22, 0.3]} />
          <StockBlock position={[0.7, 0, 0.3]} size={[0.26, 0.18, 0.26]} color="#F2F2EE" />
          <Monitor position={[-0.42, 0, 0.3]} rotation={0.4} />
          <KnobBlock position={[-0.55, 0, 0.02]} />
          <Railing position={[-0.7, 0, 0.35]} length={0.4} rotation={0.3} />
          <Pin position={[-0.85, 0, 0.5]} rotation={-0.3} />
        </group>
      );

    case "roster":
      /* building, a stairway, a stock block, a coat rack with a clock */
      return (
        <group position={PROP_POS} rotation={[0, -0.15, 0]}>
          <Building />
          <Steps position={[0.45, 0, -0.12]} />
          <StockBlock position={[-0.4, 0, -0.3]} size={[0.24, 0.16, 0.24]} color="#F2F2EE" />
          <mesh castShadow position={[-0.55, 0.35, 0.2]}>
            <cylinderGeometry args={[0.012, 0.012, 0.7, 8]} />
            <meshStandardMaterial color={C.ink} roughness={0.6} flatShading />
          </mesh>
          <mesh position={[-0.55, 0.62, 0.2]}>
            <circleGeometry args={[0.06, 20]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.85} flatShading />
          </mesh>
          <mesh position={[-0.55, 0.62, 0.201]} rotation={[0, 0, 0.5]}>
            <planeGeometry args={[0.008, 0.045]} />
            <meshStandardMaterial color={C.ink} />
          </mesh>
          <Pin position={[0.65, 0, 0.15]} rotation={-0.4} />
        </group>
      );

    case "admin":
    default:
      /* building with a dot-grid facade, a stock block, a monitor */
      return (
        <group position={PROP_POS} rotation={[0, 0.25, 0]}>
          <Building size={[0.46, 0.42, 0.38]} />
          {Array.from({ length: 9 }).map((_, i) => {
            const gx = i % 3;
            const gy = Math.floor(i / 3);
            return (
              <mesh key={i} position={[(gx - 1) * 0.11, 0.24 + (gy - 1) * 0.11, 0.191]}>
                <circleGeometry args={[0.016, 12]} />
                <meshStandardMaterial color={C.ink} roughness={1} />
              </mesh>
            );
          })}
          <StockBlock position={[0.42, 0, -0.05]} size={[0.24, 0.16, 0.24]} color="#F2F2EE" />
          <Monitor position={[-0.4, 0, 0.35]} rotation={-0.3} />
          <Pin position={[0.55, 0, 0.35]} rotation={0.3} />
        </group>
      );
  }
}

/* ------------------------------------------------------------------ *
 * Platform — slab, desks, workers, floating card.
 * ------------------------------------------------------------------ */

function deskLayout(count: number): { pos: [number, number, number]; rot: number }[] {
  const cols = count <= 4 ? 2 : 3;
  const rows = Math.ceil(count / cols);
  const out: { pos: [number, number, number]; rot: number }[] = [];
  for (let i = 0; i < count; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const jx = (rand(`${count}-${i}-x`) - 0.5) * 0.24;
    const jz = (rand(`${count}-${i}-z`) - 0.5) * 0.24;
    out.push({
      pos: [
        (c - (cols - 1) / 2) * 1.25 + jx,
        0,
        (r - (rows - 1) / 2) * 1.35 + jz,
      ],
      rot: (rand(`${count}-${i}-r`) - 0.5) * 0.28,
    });
  }
  return out;
}

function PlatformNode({
  platform,
  agents,
  focused,
  onFocus,
  onSelect,
}: {
  platform: Platform;
  agents: Agent[];
  focused: boolean;
  onFocus: (id: PlatformId) => void;
  onSelect?: (id: string, platform: PlatformId) => void;
}) {
  const pos = PLATFORM_POS[platform.id];
  const desks = useMemo(() => deskLayout(agents.length), [agents.length]);
  const [, setHoverCount] = useState(0);
  const onHoverChange = useCallback(
    (h: boolean) => setHoverCount((n) => Math.max(0, n + (h ? 1 : -1))),
    []
  );

  /* small caps label just outside the platform's outer edge, away from
   * the hub — mirrors the real product's per-platform floor labels. */
  const labelPos = useMemo((): [number, number, number] => {
    const len = Math.hypot(pos[0], pos[2]) || 1;
    const dx = pos[0] / len, dz = pos[2] / len;
    return [pos[0] + dx * PLATFORM_R * 0.95, 0.02, pos[2] + dz * PLATFORM_R * 0.95];
  }, [pos]);

  return (
    <group>
      <Slab
        radius={PLATFORM_R}
        position={pos}
        color={PLATFORM_TINT[platform.id] ?? C.bone}
        onClick={(e) => {
          e.stopPropagation();
          onFocus(platform.id);
        }}
      />
      <Html position={labelPos} center zIndexRange={[4, 0]}>
        <div
          style={{
            pointerEvents: "none",
            userSelect: "none",
            fontFamily: "Archivo, Helvetica, Arial, sans-serif",
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#8B9384",
            whiteSpace: "nowrap",
          }}
        >
          {platform.title}
        </div>
      </Html>
      <group position={pos}>
        {desks.map((d, i) => (
          <React.Fragment key={agents[i]?.id ?? i}>
            <Desk position={d.pos} rotation={d.rot} />
            {agents[i] && (
              <Worker
                agent={agents[i]}
                position={[d.pos[0], 0, d.pos[2] - 0.55]}
                live={focused}
                onSelect={onSelect}
                onHoverChange={onHoverChange}
              />
            )}
          </React.Fragment>
        ))}

        <PlatformProps id={platform.id} />
      </group>

      <ContactShadows
        position={[pos[0], -SLAB - 0.7, pos[2]]}
        scale={PLATFORM_R * 3}
        blur={1.6}
        opacity={0.14}
        far={4}
        resolution={512}
        color="#1B2420"
        frames={focused ? Infinity : 1}
      />
    </group>
  );
}

/* ------------------------------------------------------------------ *
 * Hub orb — the same deterministic node web as the dashboard's hub.
 * ------------------------------------------------------------------ */

const HOUSE_H = 1.15;
const HOUSE_R = 0.85;

/* The hub building — "step inside" target. Sits under the HubOrb; clicking
 * it is a distinct action (opens the venue interior) from clicking the
 * orb above it (opens the brain chat) or the exposed slab around it
 * (returns to the wide view). */
function HubBuilding() {
  const [hovered, setHovered] = useState(false);
  return (
    <group position={[0, 0, 0]}>
      {/* generous invisible hit target — the visible box alone is a small
       * target to aim at against the wider slab beneath it */}
      <mesh
        position={[0, 0.7, 0]}
        visible={false}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = ""; }}
        onClick={(e) => {
          e.stopPropagation();
          window.dispatchEvent(new CustomEvent("agentoffice-house", {
            detail: { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY },
          }));
        }}
      >
        <boxGeometry args={[HOUSE_R * 2.6, 1.6, HOUSE_R * 2.6]} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, HOUSE_H / 2, 0]}>
        <boxGeometry args={[HOUSE_R * 2, HOUSE_H, HOUSE_R * 2]} />
        <meshStandardMaterial color="#161616" roughness={0.82} metalness={0.06} flatShading emissive="#161616" emissiveIntensity={hovered ? 0.3 : 0} />
      </mesh>
      <Html position={[0, HOUSE_H + 0.16, 0]} center zIndexRange={[7, 0]}>
        <div
          style={{
            pointerEvents: "none",
            userSelect: "none",
            fontFamily: "Archivo, Helvetica, Arial, sans-serif",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#F8F8F3",
            background: "#161616",
            padding: "5px 10px",
            borderRadius: 3,
            whiteSpace: "nowrap",
          }}
        >
          Peregrine
        </div>
      </Html>
    </group>
  );
}

/**
 * The brain, sitting above the hub building on the centre island.
 *
 * This was a flat SVG web drawn in an <Html> overlay — a placeholder that
 * always floated on top of the scene rather than living in it. It is the
 * real constellation now, the same component the standalone brain page
 * renders, so the two cannot drift apart.
 *
 * A point light rides inside it: the art direction for the office is that
 * the room is lit as though the brain were the light source, so the island
 * is brightest and the platforms fall away the further out they sit.
 */
function HubBrain({ onTap, daysLearned }: { onTap: () => void; daysLearned: number }) {
  const [hovered, setHovered] = useState(false);
  // Low enough to read as sitting on the island rather than floating away
  // from it, and small enough that the platforms still lead the composition.
  return (
    <group position={[0, 3.4, 0]}>
      <Constellation days={daysLearned} scale={0.3} />
      <pointLight
        position={[0, 0, 0]}
        color="#DFF3E8"
        intensity={hovered ? 340 : 260}
        distance={38}
        decay={2}
      />
      {/* Generous invisible target: the cloud itself is mostly empty space
          and picking individual points would be a lottery. */}
      <mesh
        visible={false}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = ""; }}
        onClick={(e) => { e.stopPropagation(); onTap(); }}
      >
        <sphereGeometry args={[1.5, 16, 16]} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ *
 * Camera rig — lerp target + distance on focus.
 * ------------------------------------------------------------------ */

const CENTER = new THREE.Vector3(0, 0, 0);
const SPAN = R + PLATFORM_R + 0.6; // half-extent the wide view must contain

/* Half-width of the hex ring — six-fold symmetry varies little with azimuth,
   so a constant reach (rather than the old plus-shape's az-dependent squeeze)
   keeps every platform comfortably on screen at any rotation. */
function spanFor(_camera: THREE.Camera) {
  return SPAN;
}

function Rig({ focus, auto }: { focus: PlatformId | null; auto: boolean }) {
  const controls = useRef<any>(null);
  const { camera, size, gl } = useThree();
  const desiredTarget = useRef(CENTER.clone());
  const desiredDist = useRef(40);
  const dragging = useRef(false);
  const wide = useRef(true);
  const compact = size.width < 520;

  // Frame the layout whatever the container's aspect — the scene sits in a
  // phone screen as well as a wide window.
  const fit = useCallback(
    (half: number) => {
      const cam = camera as THREE.PerspectiveCamera;
      const t = Math.tan((cam.fov * Math.PI) / 360);
      return Math.max(half / t, half / (t * Math.max(cam.aspect, 0.05))) * 1.02;
    },
    [camera]
  );

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const down = () => (dragging.current = true);
    const up = () => (dragging.current = false);
    c.addEventListener("start", down);
    c.addEventListener("end", up);
    return () => {
      c.removeEventListener("start", down);
      c.removeEventListener("end", up);
    };
  }, []);

  // Plain scroll (wheel / two-finger trackpad scroll) should scroll the
  // page like anywhere else on the site. Only a genuine pinch gesture
  // (trackpads report this as wheel + ctrlKey) zooms the camera — using
  // the same desiredDist the focus-transitions already animate toward,
  // so it stays smooth and doesn't fight the home-view easing above.
  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return; // let the browser scroll the page normally
      e.preventDefault();
      const factor = Math.pow(1.0025, e.deltaY);
      desiredDist.current = THREE.MathUtils.clamp(desiredDist.current * factor, 8, 400);
      wide.current = false;
    };
    el.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => el.removeEventListener("wheel", onWheel, { capture: true } as any);
  }, [gl]);

  useEffect(() => {
    if (focus) {
      const p = PLATFORM_POS[focus];
      wide.current = false;
      desiredTarget.current.set(p[0], 0.2, p[2]);
      desiredDist.current = fit(PLATFORM_R * 1.45);
    } else {
      desiredTarget.current.copy(CENTER);
      wide.current = true;
      desiredDist.current = fit(compact ? spanFor(camera) : SPAN);
    }
  }, [focus, fit, size.width, size.height]);

  useFrame(() => {
    const c = controls.current;
    if (!c) return;
    c.target.lerp(desiredTarget.current, 0.055);
    if (compact && wide.current) desiredDist.current = fit(spanFor(camera));
    const offset = camera.position.clone().sub(c.target);
    const sph = new THREE.Spherical().setFromVector3(offset);
    sph.radius = THREE.MathUtils.lerp(sph.radius, desiredDist.current, 0.055);
    // orientation is left exactly where the user leaves it — no easing
    // back to a "home" angle once they let go.
    offset.setFromSpherical(sph);
    camera.position.copy(c.target).add(offset);
    c.update();
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableZoom={false}
      enableDamping
      dampingFactor={0.06}
      autoRotate={auto}
      autoRotateSpeed={0.45}
      minPolarAngle={0.5}
      maxPolarAngle={1.3}
      minDistance={8}
      maxDistance={400}
    />
  );
}

/* ------------------------------------------------------------------ *
 * Scene
 * ------------------------------------------------------------------ */

function Scene({
  agents,
  platforms,
  onSelect,
  onOpenBrain,
  daysLearned,
  focus,
  setFocus,
}: {
  agents: Agent[];
  platforms: Platform[];
  onSelect?: (id: string, platform: PlatformId) => void;
  onOpenBrain?: () => void;
  daysLearned: number;
  focus: PlatformId | null;
  setFocus: (id: PlatformId | null) => void;
}) {
  const [auto, setAuto] = useState(false);

  /* Prefer the prop; the CustomEvent stays only so the older standalone
     demo page keeps working while it is still around. Once nothing listens
     for it, drop the dispatch. */
  const hub = useCallback(() => {
    setFocus(null);
    if (onOpenBrain) onOpenBrain();
    else window.dispatchEvent(new CustomEvent("agentoffice-hub"));
  }, [onOpenBrain, setFocus]);

  // Host-driven tour: orbit slowly, settle on one platform, stop.
  useEffect(() => {
    const timers: number[] = [];
    const onTour = () => {
      setAuto(true);
      setFocus(null);
      timers.push(window.setTimeout(() => setFocus("roster"), 2600));
      timers.push(window.setTimeout(() => setAuto(false), 6400));
    };
    window.addEventListener("agentoffice-tour", onTour);
    return () => {
      window.removeEventListener("agentoffice-tour", onTour);
      timers.forEach(clearTimeout);
    };
  }, []);
  const byPlatform = useMemo(() => {
    const m = new Map<PlatformId, Agent[]>();
    platforms.forEach((p) => m.set(p.id, []));
    agents.forEach((a) => m.get(a.platform)?.push(a));
    return m;
  }, [agents, platforms]);

  return (
    <>
      {/* click-through backdrop: empty space returns to the wide view */}
      <mesh position={[0, -6, 0]} rotation={[-Math.PI / 2, 0, 0]} onClick={() => setFocus(null)}>
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Dimmed from 0.85/0.7. The brain's point light does the lifting now,
          so the island reads as the brightest thing in the room and the
          platforms fall off with distance. Fill only — enough that nothing
          in the far corners goes to pure black. */}
      {/* Down from 0.85 / 0.7. Fill only — enough that nothing in the far
          corners goes to pure black, and low enough that the brain's own
          light is what shapes the room. */}
      <ambientLight intensity={0.22} color="#FFFFFF" />
      <hemisphereLight intensity={0.18} color="#E8F5EE" groundColor="#D8D8D2" />
      <directionalLight
        castShadow
        position={[9, 14, 7]}
        intensity={2.6}
        color="#FFFFFF"
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0006}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
      />

      <FirstPaint />
      <Slab radius={HUB_R} position={[0, 0, 0]} onClick={hub} />
      <HubBuilding />
      <HubBrain onTap={hub} daysLearned={daysLearned} />
      <ContactShadows
        position={[0, -SLAB - 0.7, 0]}
        scale={HUB_R * 3}
        blur={1.6}
        opacity={0.14}
        far={4}
        resolution={512}
        color="#1B2420"
        frames={1}
      />
      {platforms.map((p) => (
        <Ramp key={p.id} to={PLATFORM_POS[p.id]} />
      ))}
      {platforms.map((p) => (
        <PlatformNode
          key={p.id}
          platform={p}
          agents={byPlatform.get(p.id) ?? []}
          focused={focus === p.id}
          onFocus={setFocus}
          onSelect={onSelect}
        />
      ))}

      <Rig focus={focus} auto={auto} />
    </>
  );
}

function Loading() {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        background: "#EEEFE8",
      }}
    >
      <span
        style={{
          fontFamily: "Archivo, Helvetica, Arial, sans-serif",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#6C7466",
        }}
      >
        preparing office
      </span>
    </div>
  );
}

const KEYFRAMES = `@keyframes aoSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes aoDrift{0%,100%{transform:translate(0,0)}33%{transform:translate(3px,-2px)}66%{transform:translate(-2px,3px)}}`;

export default function AgentOffice({
  agents = DEFAULT_AGENTS,
  platforms = DEFAULT_PLATFORMS,
  onSelect,
  onOpenBrain,
  onOpenDepartment,
  daysLearned = 120,
  className = "",
}: AgentOfficeProps) {
  const box = useRef<HTMLDivElement>(null);
  const [focus, setFocus] = useState<PlatformId | null>(null);

  /* Focus is the camera's business; the popup is the host's. Watching focus
     rather than wiring a second click keeps the two in step however the
     platform came to be selected. */
  useEffect(() => {
    if (focus) onOpenDepartment?.(focus);
  }, [focus, onOpenDepartment]);

  useEffect(() => {
    if (document.getElementById("agent-office-keyframes")) return;
    const st = document.createElement("style");
    st.id = "agent-office-keyframes";
    st.textContent = KEYFRAMES;
    document.head.appendChild(st);
  }, []);

  return (
    <div
      ref={box}
      className={className}
      style={{ position: "relative", width: "100%", height: "100%", background: "var(--pp-paper)", overflow: "hidden" }}
    >
      <Suspense fallback={<Loading />}>
        <Canvas
          dpr={[1, 3]}
          resize={{ offsetSize: true, scroll: false }}
          shadows="soft"
          gl={{ antialias: true, preserveDrawingBuffer: true }}
          camera={{ position: [22, 18, 22], fov: 25, near: 1, far: 200 }}
          onCreated={({ gl, scene }) => {
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
            gl.toneMapping = THREE.NoToneMapping;
            gl.toneMappingExposure = 1;
            scene.background = new THREE.Color(C.paper);
          }}
        >
          <Scene
            agents={agents}
            platforms={platforms}
            onSelect={onSelect}
            onOpenBrain={onOpenBrain}
            daysLearned={daysLearned}
            focus={focus}
            setFocus={setFocus}
          />
        </Canvas>
      </Suspense>
    </div>
  );
}

export { DEFAULT_AGENTS, DEFAULT_PLATFORMS };
