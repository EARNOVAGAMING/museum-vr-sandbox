import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { woodTexture, plasterTexture } from '../textures/procedural'
import { LAYOUT_SCALE } from '../data/museumMapModel'

// ─────────────────────────────────────────────────────────────────────────────
// ROOM SHAPE — matches architect floorplan: narrow portrait room
// ─────────────────────────────────────────────────────────────────────────────
const RW = 5.0    // width  X
const RD = 9.0    // depth  Z
const RH = 3.8    // height Y
const WT = 0.25   // wall thickness

// Doorway — right side of front wall (Z+), player enters bottom-right
const DW = 1.4
const DH = 2.4
const DOOR_CX = (RW / 2) - WT - DW / 2 - 0.05   // doorway centre X (right side)

// ─────────────────────────────────────────────────────────────────────────────
// U-SHAPED SWITCHBACK STAIRCASE (from floorplan)
// Flight A: left side, climbs going -Z (away from entrance)
// Landing:  flat platform at far end (near lightboxes)
// Flight B: right side of A, returns +Z (back toward entrance) but climbing
// Both flights side-by-side with a spine wall between them
// ─────────────────────────────────────────────────────────────────────────────
const SW   = 1.1    // each flight tread width
const SR   = 0.16   // step rise (gentler)
const SD   = 0.28   // step run (depth)
const NS   = 7      // steps per flight  → top of each flight = 1.12 m
const SP_W = 0.20   // central spine wall thickness

// X extents — stair block hugs left wall
const FA_X1 = -(RW / 2) + WT             // left edge of flight A = left wall inner
const FA_X2 = FA_X1 + SW                  // right edge of flight A
const FA_CX = (FA_X1 + FA_X2) / 2

const SPN_X1 = FA_X2
const SPN_X2 = SPN_X1 + SP_W

const FB_X1 = SPN_X2
const FB_X2 = FB_X1 + SW
const FB_CX = (FB_X1 + FB_X2) / 2

// Z extents
const FA_BASE_Z  = -1.0             // stairs start in back half of room (away from entrance)
const FA_TOP_Z   = FA_BASE_Z - NS * SD    // = 2.2 - 1.82 = 0.38  (top of flight A)
const LAND_DEPTH = 1.0
const LAND_Z2    = FA_TOP_Z - LAND_DEPTH  // far edge of landing
const LAND_MID_Z = (FA_TOP_Z + LAND_Z2) / 2

const FLIGHT_TOP_Y = NS * SR         // = 1.4m — top of flight A / bottom elevation of flight B

// Flight B starts at the landing far edge and climbs back +Z
const FB_BASE_Z = LAND_Z2            // = -0.62
const FB_TOP_Z  = FB_BASE_Z + NS * SD   // = -0.62 + 1.82 = 1.2

// ─────────────────────────────────────────────────────────────────────────────
// FURNITURE / FIXTURES
// ─────────────────────────────────────────────────────────────────────────────
// Welcome LED banner — right wall, near entrance (from floorplan: "Welcome LED" right side)
const BAN_W   = 1.0
const BAN_H   = 2.5
const BAN_BOT = 0.25
const BAN_Z   = 1.2     // Z position along right wall
// POS counter — left wall, mid room
const POS_W = 1.0, POS_H = 0.9, POS_D = 0.55
const POS_X = -(RW / 2) + WT + POS_D / 2
const POS_Z = -0.2
// Museum Guide curved desk — bottom-left corner (approx. with wedge of boxes)
const MG_X  = -(RW / 2) + WT + 0.65
const MG_Z  = (RD / 2) - WT - 0.65
// Lightbox 1 & 2 — far wall, side by side
const LB_W = 0.9, LB_H = 0.45
const LB_Z = -(RD / 2) + WT + 0.05
const LB1_X = -0.6, LB2_X = 0.6
// Glowing pyramid — right side, near entrance (accent piece)
const PYR_X  = (RW / 2) - 0.9
const PYR_Z  = 2.6
const PLI_W  = 0.45, PLI_H = 0.95, PLI_D = 0.45
const PYR_COL = '#ffd060'

// ─────────────────────────────────────────────────────────────────────────────
// MATERIAL COLOURS
// ─────────────────────────────────────────────────────────────────────────────
const CREAM   = '#e8e2d4'
const CEILING = '#ede8de'
const TREAD   = '#7a5530'
const RISER   = '#5e4020'
const DARK    = '#1e1c18'

// ─────────────────────────────────────────────────────────────────────────────
// CANVAS TEXTURES
// ─────────────────────────────────────────────────────────────────────────────

// Rich AOM welcome banner — matches the reference artwork's style:
// dark background, gold ornaments, figures, title hierarchy.
// To use the REAL image: place it at public/textures/welcome-banner.png
// and the THREE.TextureLoader call in useMemo will pick it up automatically.
function makeBannerCanvas() {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 1280
  const ctx = c.getContext('2d')

  // Deep dark background gradient (reference is very dark navy/black)
  const bg = ctx.createLinearGradient(0, 0, 0, 1280)
  bg.addColorStop(0,   '#070410')
  bg.addColorStop(0.3, '#0e0818')
  bg.addColorStop(0.7, '#100610')
  bg.addColorStop(1,   '#060308')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 1280)

  // Gold floral top-left corner (reference has gold lacework)
  ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 1.5
  for (let i = 0; i < 6; i++) {
    ctx.beginPath(); ctx.arc(i * 12, 0, 28 - i * 4, 0, Math.PI / 2)
    ctx.strokeStyle = `rgba(201,168,76,${0.8 - i * 0.12})`; ctx.stroke()
  }
  // Mirror bottom-right
  ctx.save(); ctx.translate(512, 1280); ctx.rotate(Math.PI)
  for (let i = 0; i < 6; i++) {
    ctx.beginPath(); ctx.arc(i * 12, 0, 28 - i * 4, 0, Math.PI / 2)
    ctx.strokeStyle = `rgba(201,168,76,${0.8 - i * 0.12})`; ctx.stroke()
  }
  ctx.restore()

  // Outer gold border
  ctx.strokeStyle = '#b8941e'; ctx.lineWidth = 8; ctx.strokeRect(12, 12, 488, 1256)
  ctx.strokeStyle = '#e8d060'; ctx.lineWidth = 2; ctx.strokeRect(20, 20, 472, 1240)

  // Cherry blossom branch suggestion (reference: top-right pink blossoms)
  const blossom = (x, y, r, col) => {
    ctx.fillStyle = col
    for (let a = 0; a < 5; a++) {
      ctx.beginPath()
      ctx.ellipse(x + Math.cos(a * 1.257) * r * 0.7, y + Math.sin(a * 1.257) * r * 0.7, r, r * 0.6, a * 1.257, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = '#ffcc80'; ctx.beginPath(); ctx.arc(x, y, r * 0.3, 0, Math.PI * 2); ctx.fill()
  }
  ctx.globalAlpha = 0.55
  blossom(400, 80,  11, '#e86070'); blossom(440, 50,  9, '#f08090')
  blossom(460, 100, 8, '#e87080'); blossom(420, 120, 7, '#f09090')
  ctx.globalAlpha = 1.0

  // "WELCOME" header
  ctx.fillStyle = '#fffae8'; ctx.font = 'bold italic 54px serif'; ctx.textAlign = 'center'
  ctx.shadowColor = '#e8c040'; ctx.shadowBlur = 16
  ctx.fillText('WELCOME', 256, 105)
  ctx.shadowBlur = 0

  // "— TO —" divider
  ctx.fillStyle = '#e8c060'; ctx.font = '22px serif'
  ctx.fillText('— T O —', 256, 145)

  // Ornament line
  ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(60, 162); ctx.lineTo(452, 162); ctx.stroke()

  // Large title — glowing gold
  ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 22
  ctx.fillStyle = '#ffd050'; ctx.font = 'bold 78px serif'
  ctx.fillText('ASIAN', 256, 255)
  ctx.fillStyle = '#f0c040'; ctx.font = 'bold 65px serif'
  ctx.fillText('OPERATIC', 256, 335)
  ctx.fillStyle = '#ffd050'; ctx.font = 'bold 78px serif'
  ctx.fillText('MUSEUM', 256, 420)
  ctx.shadowBlur = 0

  // Centre ornament
  ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(80, 445); ctx.lineTo(432, 445); ctx.stroke()
  ctx.fillStyle = '#c9a84c'; ctx.font = '16px serif'
  ctx.fillText('✦  ✦  ✦', 256, 478)

  // LEFT FIGURE: gold king (Sang Nila Utama) silhouette
  ctx.save(); ctx.translate(115, 760)
  // robe
  ctx.fillStyle = 'rgba(180,130,35,0.72)'
  ctx.beginPath(); ctx.ellipse(0, -70, 32, 42, 0, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-28, -32); ctx.lineTo(-38, 60); ctx.lineTo(38, 60); ctx.lineTo(28, -32)
  ctx.closePath(); ctx.fill()
  // crown
  ctx.fillStyle = '#c9a84c'
  ctx.beginPath()
  ctx.moveTo(-22, -105); ctx.lineTo(-28, -82); ctx.lineTo(-12, -90)
  ctx.lineTo(0, -115); ctx.lineTo(12, -90); ctx.lineTo(28, -82)
  ctx.lineTo(22, -105); ctx.closePath(); ctx.fill()
  ctx.restore()

  // RIGHT FIGURE: red warrior woman (Mulan-esque) silhouette
  ctx.save(); ctx.translate(395, 750)
  // red robe
  ctx.fillStyle = 'rgba(160,28,28,0.75)'
  ctx.beginPath(); ctx.ellipse(0, -68, 30, 40, 0, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-24, -32); ctx.lineTo(-45, 65); ctx.lineTo(45, 65); ctx.lineTo(24, -32)
  ctx.closePath(); ctx.fill()
  // flowing cape
  ctx.fillStyle = 'rgba(160,28,28,0.45)'
  ctx.beginPath()
  ctx.moveTo(24, -32); ctx.quadraticCurveTo(68, 0, 60, 65)
  ctx.lineTo(45, 65); ctx.closePath(); ctx.fill()
  // sword / spear tip
  ctx.strokeStyle = '#aab8c8'; ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(30, -80); ctx.lineTo(30, -120); ctx.stroke()
  ctx.restore()

  // Costume on mannequin (centre bottom)
  ctx.save(); ctx.translate(256, 850)
  ctx.fillStyle = '#c8d8e8'
  ctx.fillRect(-20, -60, 40, 100)
  ctx.fillStyle = '#a0b8cc'
  ctx.fillRect(-30, -45, 60, 20)
  // decorative band
  ctx.strokeStyle = '#4468a0'; ctx.lineWidth = 2
  for (let i = 0; i < 6; i++) {
    ctx.beginPath(); ctx.moveTo(-28, -40 + i * 15); ctx.lineTo(28, -40 + i * 15); ctx.stroke()
  }
  ctx.restore()

  // Fan in background (centre, muted)
  ctx.globalAlpha = 0.3
  ctx.strokeStyle = '#b89040'; ctx.lineWidth = 1.5
  for (let a = -0.5; a <= 0.5; a += 0.1) {
    ctx.beginPath()
    ctx.moveTo(256, 950)
    ctx.lineTo(256 + Math.sin(a) * 120, 950 - Math.cos(a) * 100)
    ctx.stroke()
  }
  ctx.beginPath(); ctx.arc(256, 950, 45, Math.PI + 0.5, Math.PI * 2 - 0.5)
  ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 2.5; ctx.stroke()
  ctx.globalAlpha = 1.0

  // Divider
  ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(60, 980); ctx.lineTo(452, 980); ctx.stroke()

  // Subtitle captions
  ctx.fillStyle = '#d4b86a'; ctx.font = 'bold 18px serif'
  ctx.fillText('SANG NILA UTAMA  ·  MULAN', 256, 1015)
  ctx.fillStyle = '#b8a060'; ctx.font = '16px serif'
  ctx.fillText('OPERATIC COSTUMES', 256, 1042)

  ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(80, 1070); ctx.lineTo(432, 1070); ctx.stroke()

  // Star row
  for (let i = -2; i <= 2; i++) {
    ctx.fillStyle = '#c9a84c'; ctx.beginPath()
    ctx.arc(256 + i * 36, 1100, 4, 0, Math.PI * 2); ctx.fill()
  }

  // Bottom identity
  ctx.fillStyle = '#8a7040'; ctx.font = '14px serif'
  ctx.fillText('ASIAN OPERATIC MUSEUM · SINGAPORE', 256, 1165)

  const t = new THREE.CanvasTexture(c)
  return t
}

function makeKioskTex() {
  const c = document.createElement('canvas')
  c.width = 256; c.height = 512
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#f0ede6'; ctx.fillRect(0, 0, 256, 512)
  ctx.fillStyle = '#8b1a1a'; ctx.fillRect(0, 0, 256, 55)
  ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'
  ctx.fillText('MUSEUM DIRECTORY', 128, 34)
  const floors = [
    { label: 'L1 · ENTRANCE', color: '#d4a84a', y: 72 },
    { label: 'L2 · GALLERY',  color: '#4a7ab5', y: 155 },
    { label: 'L3 · ARCHIVE',  color: '#5a9a6a', y: 238 },
  ]
  floors.forEach(r => {
    ctx.fillStyle = r.color + '33'; ctx.fillRect(18, r.y, 220, 70)
    ctx.strokeStyle = r.color; ctx.lineWidth = 2; ctx.strokeRect(18, r.y, 220, 70)
    ctx.fillStyle = '#333'; ctx.font = 'bold 13px sans-serif'
    ctx.fillText(r.label, 128, r.y + 41)
  })
  ctx.fillStyle = '#666'; ctx.font = '12px sans-serif'
  ctx.fillText('↑ Stairs to Level 02', 128, 365)
  ctx.fillText('● You are here', 128, 385)
  const t = new THREE.CanvasTexture(c)
  return t
}

// ─────────────────────────────────────────────────────────────────────────────
// FLOOR DATA — for FirstPersonRig collision (plan units = world / S)
// ─────────────────────────────────────────────────────────────────────────────
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
    // spawn right of entrance doorway, facing into room (-Z)
    spawn: [DOOR_CX - 0.2, (RD / 2) - 0.8],
    short: 'L1',
    centerW: [0, 0],
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function EntranceChamber({ yOffset = 0 }) {
  const spotRef  = useRef()
  const targRef  = useRef()
  useEffect(() => {
    if (spotRef.current && targRef.current)
      spotRef.current.target = targRef.current
  }, [])

  const tex = useMemo(() => {
    const wood   = woodTexture();    wood.repeat.set(RW / 3, RD / 3)
    const plstr  = plasterTexture(CREAM); plstr.repeat.set(3, 2)
    const tread  = woodTexture();    tread.repeat.set(2, 0.5)
    const banner = makeBannerCanvas()
    const kiosk  = makeKioskTex()
    return { wood, plstr, tread, banner, kiosk }
  }, [])

  const y = yOffset

  // Derived banner position (right wall, portrait)
  const banX = (RW / 2) - WT - 0.05
  const banY = y + BAN_BOT + BAN_H / 2

  // Spine wall covers the full stair Z range + landing
  const SPINE_Z_LEN = (FA_BASE_Z - LAND_Z2) + 0.01   // total Z depth of stair block
  const SPINE_Z_MID = (FA_BASE_Z + LAND_Z2) / 2
  const STAIR_FULL_Y = FLIGHT_TOP_Y * 2              // total stair height ≈ 2.24m
  // Spine wall only rises to handrail height above upper flight top — a visible half-wall
  const SPINE_HEIGHT = STAIR_FULL_Y + 0.15           // just above top step, not ceiling-high

  return (
    <group>

      {/* ══ LIGHTING ══════════════════════════════════════════════════════════ */}
      <ambientLight intensity={0.55} color="#fff4e6" />
      {/* Main ceiling fills */}
      <pointLight position={[0, y + RH - 0.3,  1.5]} intensity={14} distance={6} decay={1.3} color="#fff8f0" />
      <pointLight position={[0, y + RH - 0.3, -2.0]} intensity={14} distance={6} decay={1.3} color="#fff8f0" />
      <pointLight position={[0, y + RH - 0.3, -RD * 0.42]} intensity={10} distance={5} decay={1.4} color="#fff8f0" />
      {/* Stair wash */}
      <pointLight position={[FA_CX, y + RH - 0.4,  1.0]} intensity={5} distance={4} decay={2} color="#ffe8c0" />
      <pointLight position={[FA_CX, y + RH - 0.4, -0.6]} intensity={5} distance={4} decay={2} color="#ffe8c0" />
      {/* Banner spotlight */}
      <spotLight
        ref={spotRef}
        position={[banX - 1.2, y + RH - 0.25, BAN_Z + 1.2]}
        intensity={60}
        angle={0.38}
        penumbra={0.38}
        distance={RH + 2}
        decay={1.2}
        color="#ffefd0"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <object3D ref={targRef} position={[banX, banY, BAN_Z]} />
      {/* Lightbox glow */}
      <pointLight position={[0, y + RH * 0.75, -(RD / 2) + 1.2]} intensity={8} distance={3.5} decay={1.6} color="#e8f0ff" />
      {/* Pyramid glow */}
      <pointLight position={[PYR_X, y + PLI_H + 0.4, PYR_Z]} intensity={5} distance={3} decay={1.8} color="#ffbb44" />

      {/* ══ FLOOR ═════════════════════════════════════════════════════════════ */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
        <planeGeometry args={[RW, RD]} />
        <meshStandardMaterial color="#6b4422" roughness={0.55} map={tex.wood} />
      </mesh>

      {/* ══ CEILING ═══════════════════════════════════════════════════════════ */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, y + RH, 0]}>
        <planeGeometry args={[RW, RD]} />
        <meshStandardMaterial color={CEILING} roughness={0.92} side={THREE.DoubleSide} />
      </mesh>

      {/* ══ WALLS — cream plaster ═════════════════════════════════════════════ */}
      {/* Back wall (Z-) */}
      <mesh position={[0, y + RH / 2, -(RD / 2) + WT / 2]} castShadow receiveShadow>
        <boxGeometry args={[RW, RH, WT]} />
        <meshStandardMaterial color={CREAM} roughness={0.82} map={tex.plstr} />
      </mesh>
      {/* Left wall (X-) */}
      <mesh position={[-(RW / 2) + WT / 2, y + RH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[WT, RH, RD]} />
        <meshStandardMaterial color={CREAM} roughness={0.82} map={tex.plstr} />
      </mesh>
      {/* Right wall (X+) */}
      <mesh position={[(RW / 2) - WT / 2, y + RH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[WT, RH, RD]} />
        <meshStandardMaterial color={CREAM} roughness={0.82} map={tex.plstr} />
      </mesh>
      {/* Front wall (Z+): left panel, right panel, header above doorway */}
      {/* Left panel: from left wall to doorway left edge */}
      <mesh position={[
        (-(RW / 2) + WT + DOOR_CX - DW / 2) / 2,
        y + RH / 2,
        (RD / 2) - WT / 2
      ]} castShadow receiveShadow>
        <boxGeometry args={[DOOR_CX - DW / 2 + RW / 2 - WT, RH, WT]} />
        <meshStandardMaterial color={CREAM} roughness={0.82} map={tex.plstr} />
      </mesh>
      {/* Right panel: from doorway right edge to right wall */}
      <mesh position={[
        (DOOR_CX + DW / 2 + RW / 2 - WT) / 2,
        y + RH / 2,
        (RD / 2) - WT / 2
      ]} castShadow receiveShadow>
        <boxGeometry args={[RW / 2 - WT - DOOR_CX - DW / 2, RH, WT]} />
        <meshStandardMaterial color={CREAM} roughness={0.82} map={tex.plstr} />
      </mesh>
      {/* Header above doorway */}
      <mesh position={[DOOR_CX, y + DH + (RH - DH) / 2, (RD / 2) - WT / 2]} castShadow receiveShadow>
        <boxGeometry args={[DW, RH - DH, WT]} />
        <meshStandardMaterial color={CREAM} roughness={0.82} map={tex.plstr} />
      </mesh>

      {/* ══ WELCOME LED BANNER — right wall ═══════════════════════════════════ */}
      {/* Frame */}
      <mesh position={[banX, banY, BAN_Z]} castShadow>
        <boxGeometry args={[0.07, BAN_H + 0.10, BAN_W + 0.10]} />
        <meshStandardMaterial color="#1a1814" roughness={0.4} />
      </mesh>
      {/* Screen */}
      <mesh position={[banX - 0.05, banY, BAN_Z]}>
        <planeGeometry args={[BAN_W, BAN_H]} />
        <meshStandardMaterial
          map={tex.banner}
          emissive="#4a3010"
          emissiveIntensity={0.25}
          roughness={0.85}
          side={THREE.FrontSide}
          rotation={[0, -Math.PI / 2, 0]}
        />
      </mesh>
      {/* Screen plane: face left (toward room) — the plane is in YZ, rotated */}
      <mesh position={[banX - 0.05, banY, BAN_Z]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[BAN_W, BAN_H]} />
        <meshStandardMaterial map={tex.banner} emissive="#4a3010" emissiveIntensity={0.25} roughness={0.85} />
      </mesh>

      {/* ══ POS COUNTER — left wall ═══════════════════════════════════════════ */}
      <mesh position={[POS_X, y + POS_H / 2, POS_Z]} castShadow receiveShadow>
        <boxGeometry args={[POS_D, POS_H, POS_W]} />
        <meshStandardMaterial color="#3a2e22" roughness={0.7} />
      </mesh>
      {/* counter top */}
      <mesh position={[POS_X, y + POS_H + 0.03, POS_Z]} receiveShadow>
        <boxGeometry args={[POS_D, 0.06, POS_W]} />
        <meshStandardMaterial color="#2a2018" roughness={0.4} metalness={0.1} />
      </mesh>
      {/* Digital signage on counter */}
      <mesh position={[POS_X + POS_D / 2 - 0.02, y + POS_H + 0.3, POS_Z]}>
        <boxGeometry args={[0.04, 0.55, 0.38]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.3} />
      </mesh>
      <mesh position={[POS_X + POS_D / 2 - 0.04, y + POS_H + 0.3, POS_Z]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.36, 0.52]} />
        <meshStandardMaterial map={tex.kiosk} emissive="#ffffff" emissiveIntensity={0.3} roughness={0.9} />
      </mesh>

      {/* ══ MUSEUM GUIDE CURVED DESK — bottom-left corner ═════════════════════ */}
      {/* Approximated as 3 boxes forming a quarter-circle arc */}
      {[0, 30, 60].map((deg, i) => {
        const a = (deg * Math.PI) / 180
        const r = 0.65
        const dx = Math.sin(a) * r, dz = Math.cos(a) * r
        return (
          <mesh key={i} position={[MG_X - dx, y + 0.45, MG_Z - dz]} rotation={[0, -a, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.38, 0.9, 0.22]} />
            <meshStandardMaterial color="#4a3828" roughness={0.7} />
          </mesh>
        )
      })}
      {/* Guide desk top cap */}
      {[0, 30, 60].map((deg, i) => {
        const a = (deg * Math.PI) / 180
        const r = 0.65
        return (
          <mesh key={`t${i}`} position={[MG_X - Math.sin(a) * r, y + 0.92, MG_Z - Math.cos(a) * r]} rotation={[0, -a, 0]}>
            <boxGeometry args={[0.38, 0.05, 0.24]} />
            <meshStandardMaterial color="#2e2018" roughness={0.45} />
          </mesh>
        )
      })}

      {/* ══ LIGHTBOX 1 & 2 — far wall ═════════════════════════════════════════ */}
      {[LB1_X, LB2_X].map((lx, i) => (
        <group key={i}>
          <mesh position={[lx, y + RH * 0.72, LB_Z]} castShadow>
            <boxGeometry args={[LB_W, LB_H, 0.08]} />
            <meshStandardMaterial color="#c8d4e8" emissive="#8090c0" emissiveIntensity={0.6} roughness={0.4} />
          </mesh>
          {/* Frame */}
          <mesh position={[lx, y + RH * 0.72, LB_Z - 0.05]}>
            <boxGeometry args={[LB_W + 0.08, LB_H + 0.08, 0.04]} />
            <meshStandardMaterial color="#d0c8b8" roughness={0.5} />
          </mesh>
        </group>
      ))}

      {/* ══ GLOWING PYRAMID PEDESTAL ══════════════════════════════════════════ */}
      <mesh position={[PYR_X, y + PLI_H / 2, PYR_Z]} castShadow>
        <boxGeometry args={[PLI_W, PLI_H, PLI_D]} />
        <meshStandardMaterial color="#2a2824" roughness={0.72} metalness={0.1} />
      </mesh>
      <mesh position={[PYR_X, y + PLI_H + 0.28, PYR_Z]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.28, 0.56, 4, 1]} />
        <meshStandardMaterial color={PYR_COL} emissive={PYR_COL} emissiveIntensity={2.2} roughness={0.12} metalness={0.1} />
      </mesh>

      {/* ══ U-SHAPED SWITCHBACK STAIRCASE ════════════════════════════════════ */}
      {/*
          Looking from above (top = far wall / Z-):
          ┌──────┬───┬──────┐
          │  A   │ S │  B   │  ← landing at top (Z-)
          │ ↑ ↑  │ P │  ↑ ↑ │
          │ ↑ ↑  │ I │  ↑ ↑ │  Steps in each flight (climbing away from viewer in A,
          │      │ N │      │   returning toward viewer in B but at higher elevation)
          └──────┴───┴──────┘  ← base (Z+, near entrance)
          A = flight A (left, goes -Z)
          B = flight B (right, returns +Z but keeps climbing)
          S = spine wall
      */}

      {/* FLIGHT A — 7 steps going -Z, solid fill from floor up */}
      {Array.from({ length: NS }, (_, i) => {
        const topY = (i + 1) * SR          // top of this step
        const boxH = topY                   // solid fill from y=0 to topY
        const cz   = FA_BASE_Z - i * SD - SD / 2
        return (
          <mesh key={`fa${i}`} position={[FA_CX, y + boxH / 2, cz]} castShadow receiveShadow>
            <boxGeometry args={[SW, boxH, SD]} />
            <meshStandardMaterial color={i % 2 === 0 ? TREAD : RISER} roughness={0.65} map={tex.tread} />
          </mesh>
        )
      })}

      {/* LANDING — solid block from floor up to flight A top, full stair width */}
      <mesh position={[(FA_X1 + FB_X2) / 2, y + FLIGHT_TOP_Y / 2, LAND_MID_Z]} castShadow receiveShadow>
        <boxGeometry args={[FA_X2 - FA_X1 + SP_W + SW, FLIGHT_TOP_Y, LAND_DEPTH]} />
        <meshStandardMaterial color={RISER} roughness={0.65} />
      </mesh>
      {/* Landing top tread */}
      <mesh position={[(FA_X1 + FB_X2) / 2, y + FLIGHT_TOP_Y + 0.02, LAND_MID_Z]} receiveShadow>
        <boxGeometry args={[FA_X2 - FA_X1 + SP_W + SW, 0.04, LAND_DEPTH]} />
        <meshStandardMaterial color={TREAD} roughness={0.55} map={tex.tread} />
      </mesh>

      {/* FLIGHT B — 7 steps going +Z (returning), climbing from FLIGHT_TOP_Y up */}
      {Array.from({ length: NS }, (_, i) => {
        const fromY = FLIGHT_TOP_Y          // flight B base elevation
        const topY  = fromY + (i + 1) * SR  // top of this step
        const boxH  = topY                  // solid fill from y=0 (looks grounded)
        const cz    = FB_BASE_Z + i * SD + SD / 2
        return (
          <mesh key={`fb${i}`} position={[FB_CX, y + boxH / 2, cz]} castShadow receiveShadow>
            <boxGeometry args={[SW, boxH, SD]} />
            <meshStandardMaterial color={i % 2 === 0 ? TREAD : RISER} roughness={0.65} map={tex.tread} />
          </mesh>
        )
      })}

      {/* SPINE WALL — runs the full Z length of the stair block */}
      <mesh position={[(SPN_X1 + SPN_X2) / 2, y + SPINE_HEIGHT / 2, SPINE_Z_MID]} castShadow receiveShadow>
        <boxGeometry args={[SP_W, SPINE_HEIGHT, SPINE_Z_LEN]} />
        <meshStandardMaterial color={DARK} roughness={0.8} />
      </mesh>

      {/* OUTER STRINGER WALLS — close the exposed sides of both flights */}
      {/* Flight A outer (left) — from floor up to step height along Z */}
      <mesh position={[FA_X1 - 0.06, y + FLIGHT_TOP_Y / 2, (FA_BASE_Z + FA_TOP_Z) / 2]} castShadow>
        <boxGeometry args={[0.12, FLIGHT_TOP_Y, NS * SD]} />
        <meshStandardMaterial color={RISER} roughness={0.72} />
      </mesh>
      {/* Flight B outer (right) — same */}
      <mesh position={[FB_X2 + 0.06, y + SPINE_HEIGHT / 2, (FB_BASE_Z + FB_TOP_Z) / 2]} castShadow>
        <boxGeometry args={[0.12, SPINE_HEIGHT, NS * SD]} />
        <meshStandardMaterial color={RISER} roughness={0.72} />
      </mesh>

    </group>
  )
}
