import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { woodTexture, plasterTexture } from '../textures/procedural'
import { LAYOUT_SCALE } from '../data/museumMapModel'

// ── Room dimensions (world metres) ──────────────────────────────────────────
const RW = 10.0   // width  X
const RD = 9.0    // depth  Z
const RH = 5.0    // height Y
const WT = 0.3    // wall thickness

// Doorway in front wall (Z+)
const DW = 1.8
const DH = 2.6

// ── Staircase (EXACT spec) ───────────────────────────────────────────────────
// One simple box per step — no overlap, no rotation. Loop math below is in
// LOCAL coords; the whole rig is translated to the back-left of the room by
// STAIR_ORIGIN. Flight 1 rises along -Z, then a square landing, then Flight 2
// turns LEFT and rises along -X to the Level 02 floor height (~2.16m).
const STEP_W = 1.2          // tread width
const STEP_D = 0.3          // tread depth (run)
const STEP_RISE = 0.18      // step height
const FLIGHT_STEPS = 6
const STAIR_ORIGIN = [-1.2, -1.6]   // [worldX, worldZ] offset for the staircase

// ── Plinth + pyramid ────────────────────────────────────────────────────────
const PLI_W = 0.55
const PLI_H = 1.1
const PLI_D = 0.55
// Place plinth in open area right of door, roughly centred
const PLI_X = 2.0
const PLI_Z = 0.0

// ── Poster on back wall (Z-) ─────────────────────────────────────────────────
const POST_W = 2.2
const POST_H = 3.4
const POST_BOTTOM = 0.5

// ── Map kiosk at the foot of the stairs (just left of flight 1) ──────────────
const KIOSK_X = STAIR_ORIGIN[0] - STEP_W / 2 - 0.5
const KIOSK_Z = STAIR_ORIGIN[1] + 0.4

// ── Canvas textures ──────────────────────────────────────────────────────────
function makeWelcomeTex() {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 896
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#0e0a06'
  ctx.fillRect(0, 0, 512, 896)
  ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 12
  ctx.strokeRect(16, 16, 480, 864)
  ctx.lineWidth = 4
  ctx.strokeRect(28, 28, 456, 840)
  const grd = ctx.createRadialGradient(256, 380, 40, 256, 380, 320)
  grd.addColorStop(0, 'rgba(200,140,40,0.22)')
  grd.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grd; ctx.fillRect(0, 0, 512, 896)
  ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(140, 110); ctx.lineTo(140, 180)
  ctx.lineTo(256, 130); ctx.lineTo(372, 180); ctx.lineTo(372, 110)
  ctx.stroke()
  ctx.beginPath(); ctx.arc(256, 130, 30, 0, Math.PI * 2)
  ctx.strokeStyle = '#e8c060'; ctx.lineWidth = 2; ctx.stroke()
  ctx.fillStyle = '#e8c060'; ctx.font = 'bold 46px serif'; ctx.textAlign = 'center'
  ctx.fillText('ASIAN', 256, 280)
  ctx.fillText('OPERATIC', 256, 335)
  ctx.fillText('MUSEUM', 256, 390)
  ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(100, 415); ctx.lineTo(412, 415); ctx.stroke()
  ctx.fillStyle = '#d4b96a'; ctx.font = '24px serif'
  ctx.fillText('WELCOME', 256, 460)
  ctx.fillStyle = '#a89060'; ctx.font = '18px serif'
  ctx.fillText('A journey through the art,', 256, 520)
  ctx.fillText('history & soul of opera', 256, 548)
  ctx.fillText('in Southeast Asia', 256, 576)
  ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(100, 620); ctx.lineTo(412, 620); ctx.stroke()
  for (let i = -1; i <= 1; i++) {
    ctx.fillStyle = '#c9a84c'
    ctx.beginPath(); ctx.arc(256 + i * 60, 660, 5, 0, Math.PI * 2); ctx.fill()
  }
  return new THREE.CanvasTexture(c)
}

function makeKioskTex() {
  const c = document.createElement('canvas')
  c.width = 256; c.height = 512
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#f0ede6'; ctx.fillRect(0, 0, 256, 512)
  // header
  ctx.fillStyle = '#8b1a1a'; ctx.fillRect(0, 0, 256, 60)
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'
  ctx.fillText('MUSEUM DIRECTORY', 128, 36)
  // floor blocks
  const rooms = [
    { label: 'L1 · ENTRANCE', color: '#d4a84a', y: 80, h: 80 },
    { label: 'L2 · GALLERY', color: '#4a7ab5', y: 180, h: 80 },
    { label: 'L3 · ARCHIVE', color: '#5a9a6a', y: 280, h: 80 },
  ]
  rooms.forEach(r => {
    ctx.fillStyle = r.color + '44'; ctx.fillRect(20, r.y, 216, r.h)
    ctx.strokeStyle = r.color; ctx.lineWidth = 2; ctx.strokeRect(20, r.y, 216, r.h)
    ctx.fillStyle = '#333'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(r.label, 128, r.y + r.h / 2 + 5)
  })
  ctx.fillStyle = '#888'; ctx.font = '12px sans-serif'
  ctx.fillText('↑ Stairs to Level 02', 128, 420)
  ctx.fillText('You are here  ●', 128, 445)
  return new THREE.CanvasTexture(c)
}

// ── Floor data for FirstPersonRig (plan units = world / LAYOUT_SCALE) ────────
const S = LAYOUT_SCALE
const planHX = (RW / 2) / S
const planHZ = (RD / 2) / S

export function getEntranceChamberFloorData(yOffset = 0) {
  const inset = WT / S + 0.04
  return {
    floorY: yOffset,
    footprint: [
      { x: -planHX + inset, z: -planHZ + inset },
      { x:  planHX - inset, z: -planHZ + inset },
      { x:  planHX - inset, z:  planHZ - inset },
      { x: -planHX + inset, z:  planHZ - inset },
    ],
    walls: [],
    spawn: [0, (RD / 2 - 0.9)],
    short: 'L1',
    centerW: [0, 0],
  }
}

// ── Shared material colors ────────────────────────────────────────────────────
const CREAM = '#e8e2d4'     // warm cream plaster
const CEILING_COL = '#ede8de'
const TREAD_COL = '#7a5530'  // medium walnut wood tread
const RISER_COL = '#5e4020'
const RAIL_COL = '#3b2510'   // dark espresso rail cap

// Closed stringer — a solid angled side panel for a flight of stairs. `pts` is
// a right-triangle in the shape's local (a,b) plane; it's extruded by
// `thickness` then rotated/positioned to sit flush against the outer step edge.
function Stringer({ pts, thickness = 0.05, position, rotation, map }) {
  const geom = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(pts[0][0], pts[0][1])
    shape.lineTo(pts[1][0], pts[1][1])
    shape.lineTo(pts[2][0], pts[2][1])
    shape.closePath()
    return new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <mesh geometry={geom} position={position} rotation={rotation} castShadow receiveShadow>
      <meshStandardMaterial color={RISER_COL} roughness={0.7} map={map || null} />
    </mesh>
  )
}

export default function EntranceChamber({ yOffset = 0 }) {
  const spotRef = useRef()
  const targetRef = useRef()

  useEffect(() => {
    if (spotRef.current && targetRef.current)
      spotRef.current.target = targetRef.current
  }, [])

  const tex = useMemo(() => {
    const wood = woodTexture(); wood.repeat.set(RW / 3, RD / 3)
    const plaster = plasterTexture(CREAM); plaster.repeat.set(4, 3)
    const tread = woodTexture(); tread.repeat.set(1.5, 0.5)
    const post = makeWelcomeTex()
    const kiosk = makeKioskTex()
    return { wood, plaster, tread, post, kiosk }
  }, [])

  const y = yOffset
  const posterZ = -(RD / 2) + WT + 0.02
  const posterY = y + POST_BOTTOM + POST_H / 2
  const pyrCol = '#ffd060'
  const plinthTopY = y + PLI_H
  const pyrSize = 0.36

  // Staircase wall-wash accent lights (above the new staircase)
  const wallWashLights = [
    { x: STAIR_ORIGIN[0], y: y + RH - 0.4, z: STAIR_ORIGIN[1] - 0.8 },
    { x: STAIR_ORIGIN[0], y: y + RH - 0.4, z: STAIR_ORIGIN[1] - 2.0 },
    { x: STAIR_ORIGIN[0] - 1.5, y: y + RH - 0.4, z: STAIR_ORIGIN[1] - 1.95 },
  ]

  return (
    <group>

      {/* ══ LIGHTING ══════════════════════════════════════════════════════════ */}
      {/* Warm bright ambient — gallery feel */}
      <ambientLight intensity={0.55} color="#fff4e6" />

      {/* Overhead fill — even ceiling wash */}
      <pointLight position={[0, y + RH - 0.3, 0]} intensity={18} distance={RW + 2} decay={1.4} color="#fff8f0" />
      <pointLight position={[0, y + RH - 0.3, -RD * 0.3]} intensity={12} distance={8} decay={1.4} color="#fff8f0" />
      <pointLight position={[0, y + RH - 0.3,  RD * 0.3]} intensity={12} distance={8} decay={1.4} color="#fff8f0" />

      {/* Staircase wall-wash accent lights */}
      {wallWashLights.map((l, i) => (
        <pointLight key={i} position={[l.x, l.y, l.z]} intensity={6} distance={4} decay={1.8} color="#ffe8c0" />
      ))}

      {/* Focused spotlight on poster — 3200K warm */}
      <spotLight
        ref={spotRef}
        position={[0, y + RH - 0.3, posterZ + 3]}
        intensity={50}
        angle={0.38}
        penumbra={0.4}
        distance={RH + 3}
        decay={1.3}
        color="#ffefd0"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <object3D ref={targetRef} position={[0, posterY, posterZ]} />

      {/* Pyramid warm glow */}
      <pointLight position={[PLI_X, y + PLI_H + pyrSize * 1.2, PLI_Z]} intensity={8} distance={5} decay={1.6} color="#ffbb44" />

      {/* ══ FLOOR — warm wood planks ══════════════════════════════════════════ */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
        <planeGeometry args={[RW, RD]} />
        <meshStandardMaterial color="#6b4422" roughness={0.55} map={tex.wood} />
      </mesh>

      {/* ══ CEILING — warm off-white ══════════════════════════════════════════ */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, y + RH, 0]}>
        <planeGeometry args={[RW, RD]} />
        <meshStandardMaterial color={CEILING_COL} roughness={0.92} side={THREE.DoubleSide} />
      </mesh>

      {/* ══ WALLS — cream plaster ═════════════════════════════════════════════ */}
      {/* Back wall (Z-) */}
      <mesh position={[0, y + RH / 2, -(RD / 2) + WT / 2]} castShadow receiveShadow>
        <boxGeometry args={[RW, RH, WT]} />
        <meshStandardMaterial color={CREAM} roughness={0.82} map={tex.plaster} />
      </mesh>
      {/* Left wall (X-) */}
      <mesh position={[-(RW / 2) + WT / 2, y + RH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[WT, RH, RD]} />
        <meshStandardMaterial color={CREAM} roughness={0.82} map={tex.plaster} />
      </mesh>
      {/* Right wall (X+) */}
      <mesh position={[(RW / 2) - WT / 2, y + RH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[WT, RH, RD]} />
        <meshStandardMaterial color={CREAM} roughness={0.82} map={tex.plaster} />
      </mesh>
      {/* Front wall (Z+) — left column, right column, header with doorway */}
      <mesh position={[-(DW / 2 + (RW / 2 - DW / 2) / 2), y + RH / 2, (RD / 2) - WT / 2]} castShadow receiveShadow>
        <boxGeometry args={[RW / 2 - DW / 2, RH, WT]} />
        <meshStandardMaterial color={CREAM} roughness={0.82} map={tex.plaster} />
      </mesh>
      <mesh position={[(DW / 2 + (RW / 2 - DW / 2) / 2), y + RH / 2, (RD / 2) - WT / 2]} castShadow receiveShadow>
        <boxGeometry args={[RW / 2 - DW / 2, RH, WT]} />
        <meshStandardMaterial color={CREAM} roughness={0.82} map={tex.plaster} />
      </mesh>
      <mesh position={[0, y + DH + (RH - DH) / 2, (RD / 2) - WT / 2]} castShadow receiveShadow>
        <boxGeometry args={[DW, RH - DH, WT]} />
        <meshStandardMaterial color={CREAM} roughness={0.82} map={tex.plaster} />
      </mesh>

      {/* ══ WELCOME POSTER ════════════════════════════════════════════════════ */}
      <mesh position={[0, posterY, posterZ]} receiveShadow>
        <boxGeometry args={[POST_W, POST_H, 0.06]} />
        <meshStandardMaterial color="#120e08" roughness={0.55} />
      </mesh>
      <mesh position={[0, posterY, posterZ + 0.04]}>
        <planeGeometry args={[POST_W - 0.08, POST_H - 0.08]} />
        <meshStandardMaterial map={tex.post} emissive="#7a5a18" emissiveIntensity={0.22} roughness={0.85} />
      </mesh>

      {/* ══ PLINTH + GLOWING PYRAMID ══════════════════════════════════════════ */}
      <mesh position={[PLI_X, y + PLI_H / 2, PLI_Z]} castShadow>
        <boxGeometry args={[PLI_W, PLI_H, PLI_D]} />
        <meshStandardMaterial color="#2e2c28" roughness={0.72} metalness={0.1} />
      </mesh>
      <mesh position={[PLI_X, y + PLI_H + pyrSize * 0.9, PLI_Z]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[pyrSize, pyrSize * 1.8, 4, 1]} />
        <meshStandardMaterial color={pyrCol} emissive={pyrCol} emissiveIntensity={2.2} roughness={0.12} metalness={0.1} />
      </mesh>

      {/* ══ L-SHAPED STAIRCASE — solid steps (tread + riser fill) + stringers ══ */}
      <group position={[STAIR_ORIGIN[0], y, STAIR_ORIGIN[1]]}>

        {/* FLIGHT 1 — climbs straight back (-Z), steps face the player */}
        {Array.from({ length: FLIGHT_STEPS }, (_, i) => (
          <group key={`f1-${i}`}>
            {/* tread (top wood surface) */}
            <mesh position={[0, 0.09 + i * STEP_RISE, -(i * STEP_D)]} castShadow receiveShadow>
              <boxGeometry args={[STEP_W, STEP_RISE, STEP_D]} />
              <meshStandardMaterial color={TREAD_COL} roughness={0.6} map={tex.tread} />
            </mesh>
            {/* riser fill — solid block down to the floor (no gap underneath) */}
            {i > 0 && (
              <mesh position={[0, (i * STEP_RISE) / 2, -(i * STEP_D)]} castShadow receiveShadow>
                <boxGeometry args={[STEP_W, i * STEP_RISE, STEP_D]} />
                <meshStandardMaterial color={RISER_COL} roughness={0.7} map={tex.tread} />
              </mesh>
            )}
          </group>
        ))}

        {/* LANDING — solid block to the floor, top flush at y = 1.08 */}
        <mesh position={[0, 0.54, -1.95]} castShadow receiveShadow>
          <boxGeometry args={[STEP_W, 1.08, STEP_W]} />
          <meshStandardMaterial color={RISER_COL} roughness={0.7} map={tex.tread} />
        </mesh>
        <mesh position={[0, 1.06, -1.95]} receiveShadow>
          <boxGeometry args={[STEP_W, 0.05, STEP_W]} />
          <meshStandardMaterial color={TREAD_COL} roughness={0.6} map={tex.tread} />
        </mesh>

        {/* FLIGHT 2 — turns LEFT, climbs along -X; steps rotated 90° from flight 1 */}
        {Array.from({ length: FLIGHT_STEPS }, (_, i) => (
          <group key={`f2-${i}`}>
            {/* tread */}
            <mesh position={[-(0.6 + i * STEP_D), 1.17 + i * STEP_RISE, -1.95]} castShadow receiveShadow>
              <boxGeometry args={[STEP_D, STEP_RISE, STEP_W]} />
              <meshStandardMaterial color={TREAD_COL} roughness={0.6} map={tex.tread} />
            </mesh>
            {/* riser fill — solid block down to the landing top (y = 1.08) */}
            {i > 0 && (
              <mesh position={[-(0.6 + i * STEP_D), 1.08 + (i * STEP_RISE) / 2, -1.95]} castShadow receiveShadow>
                <boxGeometry args={[STEP_D, i * STEP_RISE, STEP_W]} />
                <meshStandardMaterial color={RISER_COL} roughness={0.7} map={tex.tread} />
              </mesh>
            )}
          </group>
        ))}

        {/* CLOSED STRINGERS — solid angled side panels on each flight's OUTER edge */}
        {/* Flight 1 outer edge = +X side; triangle in (z,y), extruded along X */}
        <Stringer
          pts={[[0.15, 0], [-1.65, 0], [-1.65, 1.08]]}
          position={[0.62, 0, 0]}
          rotation={[0, -Math.PI / 2, 0]}
          map={tex.tread}
        />
        {/* Flight 2 outer edge = -Z side; triangle in (x,y), extruded along Z */}
        <Stringer
          pts={[[-0.45, 1.08], [-2.25, 1.08], [-2.25, 2.16]]}
          position={[0, 0, -2.57]}
          rotation={[0, 0, 0]}
          map={tex.tread}
        />
      </group>

      {/* ══ MAP KIOSK ═════════════════════════════════════════════════════════ */}
      {/* Base */}
      <mesh position={[KIOSK_X, y + 0.1, KIOSK_Z]} castShadow>
        <boxGeometry args={[0.5, 0.2, 0.3]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
      </mesh>
      {/* Pole */}
      <mesh position={[KIOSK_X, y + 0.7, KIOSK_Z]} castShadow>
        <boxGeometry args={[0.06, 1.0, 0.06]} />
        <meshStandardMaterial color="#111111" roughness={0.4} metalness={0.5} />
      </mesh>
      {/* Screen panel */}
      <mesh position={[KIOSK_X, y + 1.5, KIOSK_Z - 0.05]} castShadow>
        <boxGeometry args={[0.62, 1.1, 0.06]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.3} />
      </mesh>
      {/* Emissive map display */}
      <mesh position={[KIOSK_X, y + 1.5, KIOSK_Z - 0.09]}>
        <planeGeometry args={[0.56, 1.0]} />
        <meshStandardMaterial map={tex.kiosk} emissive="#ffffff" emissiveIntensity={0.35} roughness={0.9} />
      </mesh>
      {/* Kiosk screen glow */}
      <pointLight position={[KIOSK_X, y + 1.5, KIOSK_Z - 0.3]} intensity={2.5} distance={2.5} decay={2} color="#ffe8d0" />

    </group>
  )
}
