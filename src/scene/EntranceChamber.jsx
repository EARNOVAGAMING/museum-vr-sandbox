import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { woodTexture } from '../textures/procedural'

// ── ROOM DIMENSIONS — architect floorplan, in metres ─────────────────────────
const RW = 3.27   // width  X  (narrow portrait room)
const RD = 5.52   // depth  Z
const RH = 3.0    // ceiling Y
const WT = 0.20   // wall thickness

// Entrance doorway — front wall (Z+), right side
const DW = 1.0
const DH = 2.2
const DOOR_CX = (RW / 2) - WT - DW / 2   // X centre of doorway

// ── SWITCHBACK STAIRCASE ──────────────────────────────────────────────────────
// Flight A: left wall, climbing toward back (-Z)
// Half-landing at back
// Flight B: parallel, returning toward front (+Z), continuing to climb → Level 2
const SW   = 0.90   // tread width per flight
const SR   = 0.17   // step rise
const SD   = 0.27   // step run (depth)
const NS   = 7      // steps per flight  →  top elevation = 7 × 0.17 = 1.19 m
const SP_W = 0.12   // spine wall between the two flights

// X layout — stair block flush to left wall inner face
const FA_X1 = -(RW / 2) + WT
const FA_X2 = FA_X1 + SW
const FA_CX = (FA_X1 + FA_X2) / 2
const SPN_X1 = FA_X2
const SPN_X2 = SPN_X1 + SP_W
const FB_X1 = SPN_X2
const FB_X2 = FB_X1 + SW
const FB_CX = (FB_X1 + FB_X2) / 2

// Z layout — stairs fill most of room depth
const FA_BASE_Z  = (RD / 2) - WT - 0.40    // base of Flight A (near front)
const FA_TOP_Z   = FA_BASE_Z - NS * SD       // top of Flight A (toward back)
const LAND_D     = 0.80                      // landing depth
const LAND_Z2    = FA_TOP_Z - LAND_D         // back edge of landing
const LAND_MID_Z = (FA_TOP_Z + LAND_Z2) / 2
const FLIGHT_TOP_Y = NS * SR                 // 1.19 m — elevation at top of each flight
const FB_BASE_Z  = LAND_Z2                   // Flight B starts at landing back edge
const FB_TOP_Z   = FB_BASE_Z + NS * SD       // Flight B top (toward front)

// ── WELCOME LED BANNER — right wall, portrait, nearly floor-to-ceiling ────────
const BAN_H   = 2.55   // banner height (leaves ~0.2 m gap top & bottom)
const BAN_W   = 0.72   // banner width
const BAN_BOT = 0.22   // gap from floor to banner bottom
const BAN_Z   = 0.10   // Z centre (slightly toward entrance end)

// ── FURNITURE ─────────────────────────────────────────────────────────────────
// Floorplan kiosk — free-standing, front-left (foot of stairs)
const KIOSK_X  = FB_X2 + 0.15   // just right of stair block, near front
const KIOSK_Z  = FA_BASE_Z - 0.3
const KIOSK_SW = 0.60   // screen width
const KIOSK_SH = 1.50   // screen height

// POS counter — left wall, mid-room
const POS_D = 0.42, POS_H = 0.90, POS_WW = 0.85
const POS_X = -(RW / 2) + WT + POS_D / 2
const POS_Z = -0.60

// Museum Guide desk — front-left corner
const MG_X = -(RW / 2) + WT + 0.40
const MG_Z = (RD / 2) - WT - 0.55

// Lightboxes — back wall, side by side (two emissive panels near landing)
const LB_W = 0.65, LB_H = 0.50
const LB_Z  = -(RD / 2) + WT + 0.06
const LB1_X = -0.38, LB2_X = 0.38

// ── MATERIAL COLOURS ──────────────────────────────────────────────────────────
const WALL_COL  = '#1c1915'   // dark warm charcoal / espresso
const CEIL_COL  = '#0d0b09'   // near-black ceiling
const FLOOR_COL = '#6b4422'   // warm medium-brown wood
const TREAD_COL = '#7a5530'   // stair tread — warm wood
const RISER_COL = '#342010'   // dark riser
const SPINE_COL = '#1a1612'   // spine wall — very dark
const RAIL_COL  = '#5a3820'   // wall-mounted handrail

// ── CANVAS TEXTURES (fallbacks) ───────────────────────────────────────────────
function makeBannerCanvas() {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 1280
  const ctx = c.getContext('2d')

  const bg = ctx.createLinearGradient(0, 0, 0, 1280)
  bg.addColorStop(0,   '#070410')
  bg.addColorStop(0.3, '#0e0818')
  bg.addColorStop(0.7, '#100610')
  bg.addColorStop(1,   '#060308')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 1280)

  ctx.strokeStyle = '#b8941e'; ctx.lineWidth = 8; ctx.strokeRect(12, 12, 488, 1256)
  ctx.strokeStyle = '#e8d060'; ctx.lineWidth = 2; ctx.strokeRect(20, 20, 472, 1240)

  ctx.fillStyle = '#fffae8'; ctx.font = 'bold italic 54px serif'; ctx.textAlign = 'center'
  ctx.shadowColor = '#e8c040'; ctx.shadowBlur = 16
  ctx.fillText('WELCOME', 256, 110)
  ctx.shadowBlur = 0
  ctx.fillStyle = '#e8c060'; ctx.font = '22px serif'
  ctx.fillText('— T O —', 256, 150)
  ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(60, 168); ctx.lineTo(452, 168); ctx.stroke()

  ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 22
  ctx.fillStyle = '#ffd050'; ctx.font = 'bold 78px serif'
  ctx.fillText('ASIAN', 256, 260)
  ctx.fillStyle = '#f0c040'; ctx.font = 'bold 65px serif'
  ctx.fillText('OPERATIC', 256, 340)
  ctx.fillStyle = '#ffd050'; ctx.font = 'bold 78px serif'
  ctx.fillText('MUSEUM', 256, 425)
  ctx.shadowBlur = 0

  ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(80, 450); ctx.lineTo(432, 450); ctx.stroke()
  ctx.fillStyle = '#c9a84c'; ctx.font = '16px serif'
  ctx.fillText('✦  ✦  ✦', 256, 480)

  // King silhouette
  ctx.save(); ctx.translate(115, 780)
  ctx.fillStyle = 'rgba(180,130,35,0.72)'
  ctx.beginPath(); ctx.ellipse(0, -70, 32, 42, 0, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.moveTo(-28, -32); ctx.lineTo(-38, 60); ctx.lineTo(38, 60); ctx.lineTo(28, -32); ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#c9a84c'
  ctx.beginPath(); ctx.moveTo(-22, -105); ctx.lineTo(-28, -82); ctx.lineTo(-12, -90); ctx.lineTo(0, -115); ctx.lineTo(12, -90); ctx.lineTo(28, -82); ctx.lineTo(22, -105); ctx.closePath(); ctx.fill()
  ctx.restore()

  // Warrior woman silhouette
  ctx.save(); ctx.translate(395, 770)
  ctx.fillStyle = 'rgba(160,28,28,0.75)'
  ctx.beginPath(); ctx.ellipse(0, -68, 30, 40, 0, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.moveTo(-24, -32); ctx.lineTo(-45, 65); ctx.lineTo(45, 65); ctx.lineTo(24, -32); ctx.closePath(); ctx.fill()
  ctx.fillStyle = 'rgba(160,28,28,0.45)'
  ctx.beginPath(); ctx.moveTo(24, -32); ctx.quadraticCurveTo(68, 0, 60, 65); ctx.lineTo(45, 65); ctx.closePath(); ctx.fill()
  ctx.restore()

  ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(60, 990); ctx.lineTo(452, 990); ctx.stroke()
  ctx.fillStyle = '#8a7040'; ctx.font = '14px serif'
  ctx.fillText('ASIAN OPERATIC MUSEUM · SINGAPORE', 256, 1175)

  return new THREE.CanvasTexture(c)
}

function makeKioskTex() {
  const c = document.createElement('canvas')
  c.width = 256; c.height = 512
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#0a0e14'; ctx.fillRect(0, 0, 256, 512)
  ctx.fillStyle = '#1a2e48'; ctx.fillRect(0, 0, 256, 60)
  ctx.fillStyle = '#7ab8e8'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'
  ctx.fillText('MUSEUM DIRECTORY', 128, 38)

  const floors = [
    { label: 'L1 · ENTRANCE',  color: '#d4a84a', y: 80 },
    { label: 'L2 · GALLERY',   color: '#4a7ab5', y: 175 },
    { label: 'L3 · ARCHIVE',   color: '#5a9a6a', y: 270 },
  ]
  floors.forEach(r => {
    ctx.fillStyle = r.color + '22'; ctx.fillRect(16, r.y, 224, 72)
    ctx.strokeStyle = r.color; ctx.lineWidth = 1.5; ctx.strokeRect(16, r.y, 224, 72)
    ctx.fillStyle = r.color; ctx.font = 'bold 13px sans-serif'
    ctx.fillText(r.label, 128, r.y + 42)
  })
  ctx.fillStyle = '#4a8ab8'; ctx.font = '11px sans-serif'
  ctx.fillText('↑ Stairs to Level 02', 128, 380)
  ctx.fillStyle = '#e8c060'
  ctx.fillText('● You are here  (L1)', 128, 400)
  return new THREE.CanvasTexture(c)
}

// ── COLLISION DATA for FirstPersonRig ─────────────────────────────────────────
// footprint + walls must be in PLAN UNITS (world metres / LAYOUT_SCALE = 2.7)
import { LAYOUT_SCALE } from '../data/museumMapModel'
const S = LAYOUT_SCALE

export function getEntranceChamberFloorData(yOffset = 0) {
  const hx = (RW / 2) / S
  const hz = (RD / 2) / S
  const ins = (WT / S) + 0.05
  return {
    floorY : yOffset,
    footprint: [
      { x: -hx + ins, z: -hz + ins },
      { x:  hx - ins, z: -hz + ins },
      { x:  hx - ins, z:  hz - ins },
      { x: -hx + ins, z:  hz - ins },
    ],
    walls: [],
    spawn : [DOOR_CX - 0.15, (RD / 2) - 0.55],   // world X/Z, just inside entrance
    short : 'L1',
    centerW: [0, 0],
  }
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export default function EntranceChamber({ yOffset = 0 }) {
  const spotRef = useRef()
  const targRef = useRef()
  useEffect(() => {
    if (spotRef.current && targRef.current)
      spotRef.current.target = targRef.current
  }, [])

  const tex = useMemo(() => {
    const wood  = woodTexture(); wood.repeat.set(RW / 2.5, RD / 2.5)
    const tread = woodTexture(); tread.repeat.set(2, 0.5)
    const bannerCanvas = makeBannerCanvas()
    const banner = new THREE.TextureLoader().load(
      'https://raw.githubusercontent.com/EARNOVAGAMING/museum-vr-sandbox/main/Banner%20first%20level.jpg',
      (t) => {
        t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
        // swap canvas out for real image in-place
        bannerCanvas.image = t.image
        bannerCanvas.needsUpdate = true
      },
      undefined,
      () => { /* network error — canvas stays */ }
    )
    void banner
    const kiosk = makeKioskTex()
    return { wood, tread, banner: bannerCanvas, kiosk }
  }, [])

  const y = yOffset

  // Banner position — right wall
  const banX = (RW / 2) - WT - 0.03
  const banCY = y + BAN_BOT + BAN_H / 2

  // Handrail geometry helper — a thin rounded rod along the stair slope
  // mounted on the left wall for Flight A, spine side for Flight B
  const flightALen  = NS * SD
  const flightBLen  = NS * SD
  const stairAngleA = Math.atan2(NS * SR, NS * SD)   // slope angle
  const railH       = 0.90   // rail height above step noses

  return (
    <group>

      {/* ══ LIGHTING — moody, dim, glowing elements dominate ═════════════════ */}
      {/* Very soft warm ambient — just enough to see walls in shadow */}
      <ambientLight intensity={0.18} color="#ffd090" />

      {/* Two recessed warm downlights in ceiling */}
      <pointLight position={[0.3,  y + RH - 0.15,  1.0]} intensity={3.5} distance={3.5} decay={2} color="#ffb060" />
      <pointLight position={[-0.2, y + RH - 0.15, -1.5]} intensity={3.0} distance={3.5} decay={2} color="#ffb060" />

      {/* Stair wash — dim warm spot picking out step treads */}
      <pointLight position={[FA_CX, y + RH - 0.3, FA_BASE_Z - 0.5]} intensity={4} distance={3} decay={2} color="#ffcc88" />
      <pointLight position={[FB_CX, y + RH - 0.3, FB_TOP_Z  - 0.5]} intensity={4} distance={3} decay={2} color="#ffcc88" />

      {/* BANNER GLOW — the visual hero, cast light into room */}
      <pointLight position={[banX - 0.6, y + BAN_BOT + BAN_H * 0.55, BAN_Z]} intensity={22} distance={4.5} decay={1.6} color="#ffeacc" />
      {/* Tight spotlight aimed at banner face */}
      <spotLight
        ref={spotRef}
        position={[banX - 1.0, y + RH - 0.12, BAN_Z]}
        intensity={60}
        angle={0.42}
        penumbra={0.35}
        distance={RH + 1}
        decay={1.4}
        color="#fff4e0"
        castShadow
        shadow-mapSize={[512, 512]}
      />
      <object3D ref={targRef} position={[banX, banCY, BAN_Z]} />

      {/* Kiosk cool-white glow */}
      <pointLight position={[KIOSK_X, y + KIOSK_SH * 0.6, KIOSK_Z - 0.3]} intensity={6} distance={2.5} decay={2} color="#b8deff" />

      {/* Lightbox glow on back wall */}
      <pointLight position={[0, y + RH * 0.72, -(RD / 2) + 1.0]} intensity={5} distance={3} decay={1.8} color="#c8e0ff" />

      {/* ══ FLOOR — warm medium-brown wood ════════════════════════════════════ */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
        <planeGeometry args={[RW, RD]} />
        <meshStandardMaterial color={FLOOR_COL} roughness={0.55} map={tex.wood} />
      </mesh>

      {/* ══ CEILING — near black ══════════════════════════════════════════════ */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, y + RH, 0]}>
        <planeGeometry args={[RW, RD]} />
        <meshStandardMaterial color={CEIL_COL} roughness={0.95} side={THREE.DoubleSide} />
      </mesh>

      {/* ══ WALLS — dark warm charcoal ════════════════════════════════════════ */}
      {/* Back wall (Z-) */}
      <mesh position={[0, y + RH / 2, -(RD / 2) + WT / 2]} castShadow receiveShadow>
        <boxGeometry args={[RW, RH, WT]} />
        <meshStandardMaterial color={WALL_COL} roughness={0.88} />
      </mesh>
      {/* Left wall (X-) */}
      <mesh position={[-(RW / 2) + WT / 2, y + RH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[WT, RH, RD]} />
        <meshStandardMaterial color={WALL_COL} roughness={0.88} />
      </mesh>
      {/* Right wall (X+) */}
      <mesh position={[(RW / 2) - WT / 2, y + RH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[WT, RH, RD]} />
        <meshStandardMaterial color={WALL_COL} roughness={0.88} />
      </mesh>
      {/* Front wall — left panel */}
      <mesh position={[
        (-(RW / 2) + WT + DOOR_CX - DW / 2) / 2,
        y + RH / 2,
        (RD / 2) - WT / 2
      ]} castShadow receiveShadow>
        <boxGeometry args={[Math.max(0.001, DOOR_CX - DW / 2 + RW / 2 - WT), RH, WT]} />
        <meshStandardMaterial color={WALL_COL} roughness={0.88} />
      </mesh>
      {/* Front wall — right panel (very thin strip on hinge side) */}
      <mesh position={[
        (DOOR_CX + DW / 2 + (RW / 2) - WT) / 2,
        y + RH / 2,
        (RD / 2) - WT / 2
      ]} castShadow receiveShadow>
        <boxGeometry args={[Math.max(0.001, (RW / 2) - WT - DOOR_CX - DW / 2), RH, WT]} />
        <meshStandardMaterial color={WALL_COL} roughness={0.88} />
      </mesh>
      {/* Front wall — header above door */}
      <mesh position={[DOOR_CX, y + DH + (RH - DH) / 2, (RD / 2) - WT / 2]} castShadow receiveShadow>
        <boxGeometry args={[DW, RH - DH, WT]} />
        <meshStandardMaterial color={WALL_COL} roughness={0.88} />
      </mesh>

      {/* ══ WELCOME LED BANNER — right wall, portrait, emissive lightbox ══════ */}
      {/* Thin backing slab (dark) */}
      <mesh position={[banX + 0.01, banCY, BAN_Z]} castShadow>
        <boxGeometry args={[0.05, BAN_H + 0.10, BAN_W + 0.10]} />
        <meshStandardMaterial color="#0a0806" roughness={0.4} />
      </mesh>
      {/* Gold frame */}
      <mesh position={[banX - 0.01, banCY, BAN_Z]}>
        <boxGeometry args={[0.025, BAN_H + 0.04, BAN_W + 0.04]} />
        <meshStandardMaterial color="#c9a84c" metalness={0.65} roughness={0.3} />
      </mesh>
      {/* Artwork plane — emissive so it glows like a lightbox */}
      <mesh position={[banX - 0.03, banCY, BAN_Z]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[BAN_W, BAN_H]} />
        <meshStandardMaterial
          map={tex.banner}
          emissiveMap={tex.banner}
          emissive="#ffffff"
          emissiveIntensity={1.1}
          roughness={0.9}
          toneMapped={false}
        />
      </mesh>

      {/* ══ FLOORPLAN KIOSK — free-standing, front-left ═══════════════════════ */}
      {/* Thin base pole */}
      <mesh position={[KIOSK_X, y + KIOSK_SH * 0.28, KIOSK_Z]} castShadow>
        <boxGeometry args={[0.08, KIOSK_SH * 0.55, 0.08]} />
        <meshStandardMaterial color="#1a1814" roughness={0.6} metalness={0.3} />
      </mesh>
      {/* Foot plate */}
      <mesh position={[KIOSK_X, y + 0.04, KIOSK_Z]} castShadow>
        <boxGeometry args={[0.40, 0.08, 0.30]} />
        <meshStandardMaterial color="#111010" roughness={0.5} metalness={0.4} />
      </mesh>
      {/* Screen housing */}
      <mesh position={[KIOSK_X, y + KIOSK_SH * 0.64, KIOSK_Z]} castShadow>
        <boxGeometry args={[0.08, KIOSK_SH * 0.72, KIOSK_SW + 0.06]} />
        <meshStandardMaterial color="#0d0d0d" roughness={0.4} />
      </mesh>
      {/* Emissive screen face (facing -X into room) */}
      <mesh position={[KIOSK_X - 0.05, y + KIOSK_SH * 0.64, KIOSK_Z]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[KIOSK_SW, KIOSK_SH * 0.70]} />
        <meshStandardMaterial
          map={tex.kiosk}
          emissiveMap={tex.kiosk}
          emissive="#ffffff"
          emissiveIntensity={0.85}
          roughness={0.9}
          toneMapped={false}
        />
      </mesh>

      {/* ══ POS COUNTER — left wall, mid-room ════════════════════════════════ */}
      <mesh position={[POS_X, y + POS_H / 2, POS_Z]} castShadow receiveShadow>
        <boxGeometry args={[POS_D, POS_H, POS_WW]} />
        <meshStandardMaterial color="#2e2416" roughness={0.75} />
      </mesh>
      <mesh position={[POS_X, y + POS_H + 0.03, POS_Z]}>
        <boxGeometry args={[POS_D + 0.06, 0.05, POS_WW + 0.06]} />
        <meshStandardMaterial color="#1c1610" roughness={0.4} metalness={0.1} />
      </mesh>

      {/* ══ MUSEUM GUIDE DESK — front-left corner ════════════════════════════ */}
      {[0, 35, 70].map((deg, i) => {
        const a = (deg * Math.PI) / 180
        const r = 0.48
        return (
          <mesh key={i} position={[MG_X - Math.sin(a) * r, y + 0.44, MG_Z - Math.cos(a) * r]} rotation={[0, -a, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.32, 0.88, 0.20]} />
            <meshStandardMaterial color="#2e2416" roughness={0.75} />
          </mesh>
        )
      })}

      {/* ══ LIGHTBOXES — back wall, two panels side by side ══════════════════ */}
      {[LB1_X, LB2_X].map((lx, i) => (
        <group key={i}>
          <mesh position={[lx, y + RH * 0.68, LB_Z - 0.04]}>
            <boxGeometry args={[LB_W + 0.06, LB_H + 0.06, 0.03]} />
            <meshStandardMaterial color="#2a2820" roughness={0.6} />
          </mesh>
          <mesh position={[lx, y + RH * 0.68, LB_Z]} castShadow>
            <boxGeometry args={[LB_W, LB_H, 0.06]} />
            <meshStandardMaterial color="#c8dff8" emissive="#8ab0e0" emissiveIntensity={0.8} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* ══ SWITCHBACK STAIRCASE — warm wood, solid-fill risers ══════════════ */}

      {/* FLIGHT A — climbing toward back (-Z), 7 steps */}
      {Array.from({ length: NS }, (_, i) => {
        const topY = (i + 1) * SR
        const cz   = FA_BASE_Z - i * SD - SD / 2
        return (
          <mesh key={`fa${i}`} position={[FA_CX, y + topY / 2, cz]} castShadow receiveShadow>
            <boxGeometry args={[SW, topY, SD]} />
            <meshStandardMaterial color={i % 2 === 0 ? TREAD_COL : RISER_COL} roughness={0.65} map={i % 2 === 0 ? tex.tread : null} />
          </mesh>
        )
      })}

      {/* FLIGHT A — wall-mounted handrail, left wall side */}
      <mesh
        position={[FA_X1 - 0.03, y + FLIGHT_TOP_Y * 0.55 + railH * 0.5, (FA_BASE_Z + FA_TOP_Z) / 2]}
        rotation={[stairAngleA, 0, 0]}
        castShadow
      >
        <boxGeometry args={[0.06, 0.06, Math.hypot(NS * SD, NS * SR) + 0.2]} />
        <meshStandardMaterial color={RAIL_COL} roughness={0.55} />
      </mesh>

      {/* HALF-LANDING */}
      <mesh position={[(FA_X1 + FB_X2) / 2, y + FLIGHT_TOP_Y / 2, LAND_MID_Z]} castShadow receiveShadow>
        <boxGeometry args={[SW * 2 + SP_W, FLIGHT_TOP_Y, LAND_D]} />
        <meshStandardMaterial color={RISER_COL} roughness={0.7} />
      </mesh>
      {/* Landing tread surface */}
      <mesh position={[(FA_X1 + FB_X2) / 2, y + FLIGHT_TOP_Y + 0.015, LAND_MID_Z]} receiveShadow>
        <boxGeometry args={[SW * 2 + SP_W, 0.03, LAND_D]} />
        <meshStandardMaterial color={TREAD_COL} roughness={0.55} map={tex.tread} />
      </mesh>

      {/* FLIGHT B — returning toward front (+Z), climbing from FLIGHT_TOP_Y */}
      {Array.from({ length: NS }, (_, i) => {
        const topY = FLIGHT_TOP_Y + (i + 1) * SR
        const cz   = FB_BASE_Z + i * SD + SD / 2
        return (
          <mesh key={`fb${i}`} position={[FB_CX, y + topY / 2, cz]} castShadow receiveShadow>
            <boxGeometry args={[SW, topY, SD]} />
            <meshStandardMaterial color={i % 2 === 0 ? TREAD_COL : RISER_COL} roughness={0.65} map={i % 2 === 0 ? tex.tread : null} />
          </mesh>
        )
      })}

      {/* FLIGHT B — wall-mounted handrail, spine wall side */}
      <mesh
        position={[FB_X1 + 0.03, y + FLIGHT_TOP_Y + NS * SR * 0.5 + railH * 0.4, (FB_BASE_Z + FB_TOP_Z) / 2]}
        rotation={[-stairAngleA, 0, 0]}
        castShadow
      >
        <boxGeometry args={[0.06, 0.06, Math.hypot(NS * SD, NS * SR) + 0.2]} />
        <meshStandardMaterial color={RAIL_COL} roughness={0.55} />
      </mesh>

      {/* SPINE WALL — separates the two flights, full stair height */}
      {(() => {
        const spineLen = (FA_BASE_Z - LAND_Z2)
        const spineMidZ = (FA_BASE_Z + LAND_Z2) / 2
        const spineH = FLIGHT_TOP_Y * 2 + SR + 0.10
        return (
          <mesh position={[(SPN_X1 + SPN_X2) / 2, y + spineH / 2, spineMidZ]} castShadow receiveShadow>
            <boxGeometry args={[SP_W, spineH, spineLen]} />
            <meshStandardMaterial color={SPINE_COL} roughness={0.9} />
          </mesh>
        )
      })()}

    </group>
  )
}
