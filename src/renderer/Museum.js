import * as THREE from 'three'
import { woodTexture } from '../textures/procedural.js'
import { createAomMuseumMap, LAYOUT_SCALE, HEIGHT_SCALE } from '../data/museumMapModel.js'
import { buildLevelSpec, pointInFootprint } from '../data/museumMapScene.js'

// ── Level 01 — VR-comfort scale: footprint ×1.4 vs plan, ceiling ×1.2 ─────────
// Plan: 3.27 × 5.52 × 3.0 m  →  VR: 4.60 × 7.70 × 3.6 m
const RW = 4.60, RD = 7.70, RH = 3.60, WT = 0.28
const DW = 1.40, DH = 2.45
const DOOR_CX = (RW / 2) - WT - DW / 2

// Staircase — single straight flight, visual prop only (no collision)
// Kept against left wall, climbing toward back wall (-Z)
const SW = 1.26, SR = 0.22, SD = 0.36, NS = 10, SP_W = 0.17
const STAIR_X1  = -(RW / 2) + WT           // left wall inner face
const STAIR_X2  = STAIR_X1 + SW
const STAIR_CX  = (STAIR_X1 + STAIR_X2) / 2
const STAIR_BASE_Z = (RD / 2) - WT - 0.56  // near the front
const STAIR_TOP_Z  = STAIR_BASE_Z - NS * SD // toward the back wall
const STAIR_TOP_Y  = NS * SR               // 10 × 0.22 = 2.20 m

// Trigger zone (world coords) — a box at the stair base the player walks into
const TRIG_MIN_X = STAIR_X1 - 0.20
const TRIG_MAX_X = STAIR_X2 + 0.60
const TRIG_MIN_Z = STAIR_BASE_Z - 0.80
const TRIG_MAX_Z = STAIR_BASE_Z + 0.55

// Furniture ×1.4
const BAN_H = 3.20, BAN_W = 1.00, BAN_BOT = 0.25, BAN_Z = 0.10
const KIOSK_X = STAIR_X2 + 0.20, KIOSK_Z = STAIR_BASE_Z - 0.50
const KIOSK_SW = 0.84, KIOSK_SH = 2.10
const POS_D = 0.60, POS_H = 1.26, POS_WW = 1.20
const POS_X = -(RW / 2) + WT + POS_D / 2, POS_Z = -0.84
const MG_X = -(RW / 2) + WT + 0.56, MG_Z = (RD / 2) - WT - 0.77
const LB_W = 0.90, LB_H = 0.70
const LB_Z = -(RD / 2) + WT + 0.06
const LB1_X = -0.55, LB2_X = 0.55

const WALL_COL  = '#1c1915'
const CEIL_COL  = '#0d0b09'
const FLOOR_COL = '#6b4422'
const TREAD_COL = '#7a5530'
const RISER_COL = '#342010'
const RAIL_COL  = '#5a3820'

// Level 01/02 stacking — ceiling raised to 3.6 m
const L1_H = 3.60, L1_GAP = 0.6, L2_Y = L1_H + L1_GAP
const S = LAYOUT_SCALE, HS = HEIGHT_SCALE

// ── Geometry helpers ──────────────────────────────────────────────────────────

function mesh(geom, mat, { pos, rot, cast, recv } = {}) {
  const m = new THREE.Mesh(geom, mat)
  if (pos) m.position.set(...pos)
  if (rot) m.rotation.set(...rot)
  if (cast)  m.castShadow = true
  if (recv)  m.receiveShadow = true
  return m
}

function box(w, h, d, mat, opts) {
  return mesh(new THREE.BoxGeometry(w, h, d), mat, opts)
}

function plane(w, h, mat, opts) {
  return mesh(new THREE.PlaneGeometry(w, h), mat, opts)
}

function pt(color, intensity, distance, decay, pos) {
  const l = new THREE.PointLight(color, intensity, distance, decay)
  l.position.set(...pos)
  return l
}

// ── Canvas textures ────────────────────────────────────────────────────────────

function makeBannerCanvas() {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 1280
  const ctx = c.getContext('2d')
  const bg = ctx.createLinearGradient(0, 0, 0, 1280)
  bg.addColorStop(0, '#070410'); bg.addColorStop(0.3, '#0e0818')
  bg.addColorStop(0.7, '#100610'); bg.addColorStop(1, '#060308')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 1280)
  ctx.strokeStyle = '#b8941e'; ctx.lineWidth = 8; ctx.strokeRect(12, 12, 488, 1256)
  ctx.strokeStyle = '#e8d060'; ctx.lineWidth = 2; ctx.strokeRect(20, 20, 472, 1240)
  ctx.fillStyle = '#fffae8'; ctx.font = 'bold italic 54px serif'; ctx.textAlign = 'center'
  ctx.shadowColor = '#e8c040'; ctx.shadowBlur = 16
  ctx.fillText('WELCOME', 256, 110); ctx.shadowBlur = 0
  ctx.fillStyle = '#e8c060'; ctx.font = '22px serif'; ctx.fillText('— T O —', 256, 150)
  ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(60, 168); ctx.lineTo(452, 168); ctx.stroke()
  ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 22
  ctx.fillStyle = '#ffd050'; ctx.font = 'bold 78px serif'; ctx.fillText('ASIAN', 256, 260)
  ctx.fillStyle = '#f0c040'; ctx.font = 'bold 65px serif'; ctx.fillText('OPERATIC', 256, 340)
  ctx.fillStyle = '#ffd050'; ctx.font = 'bold 78px serif'; ctx.fillText('MUSEUM', 256, 425)
  ctx.shadowBlur = 0
  ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(80, 450); ctx.lineTo(432, 450); ctx.stroke()
  ctx.fillStyle = '#c9a84c'; ctx.font = '16px serif'; ctx.fillText('✦  ✦  ✦', 256, 480)
  // King
  ctx.save(); ctx.translate(115, 780)
  ctx.fillStyle = 'rgba(180,130,35,0.72)'
  ctx.beginPath(); ctx.ellipse(0, -70, 32, 42, 0, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.moveTo(-28, -32); ctx.lineTo(-38, 60); ctx.lineTo(38, 60); ctx.lineTo(28, -32); ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#c9a84c'
  ctx.beginPath(); ctx.moveTo(-22, -105); ctx.lineTo(-28, -82); ctx.lineTo(-12, -90); ctx.lineTo(0, -115); ctx.lineTo(12, -90); ctx.lineTo(28, -82); ctx.lineTo(22, -105); ctx.closePath(); ctx.fill()
  ctx.restore()
  // Warrior
  ctx.save(); ctx.translate(395, 770)
  ctx.fillStyle = 'rgba(160,28,28,0.75)'
  ctx.beginPath(); ctx.ellipse(0, -68, 30, 40, 0, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.moveTo(-24, -32); ctx.lineTo(-45, 65); ctx.lineTo(45, 65); ctx.lineTo(24, -32); ctx.closePath(); ctx.fill()
  ctx.restore()
  ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(60, 990); ctx.lineTo(452, 990); ctx.stroke()
  ctx.fillStyle = '#8a7040'; ctx.font = '14px serif'
  ctx.fillText('ASIAN OPERATIC MUSEUM · SINGAPORE', 256, 1175)
  return new THREE.CanvasTexture(c)
}

function makeKioskCanvas() {
  const c = document.createElement('canvas')
  c.width = 256; c.height = 512
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#0a0e14'; ctx.fillRect(0, 0, 256, 512)
  ctx.fillStyle = '#1a2e48'; ctx.fillRect(0, 0, 256, 60)
  ctx.fillStyle = '#7ab8e8'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'
  ctx.fillText('MUSEUM DIRECTORY', 128, 38)
  const floors = [
    { label: 'L1 · ENTRANCE', color: '#d4a84a', y: 80 },
    { label: 'L2 · GALLERY',  color: '#4a7ab5', y: 175 },
    { label: 'L3 · ARCHIVE',  color: '#5a9a6a', y: 270 },
  ]
  floors.forEach(r => {
    ctx.fillStyle = r.color + '22'; ctx.fillRect(16, r.y, 224, 72)
    ctx.strokeStyle = r.color; ctx.lineWidth = 1.5; ctx.strokeRect(16, r.y, 224, 72)
    ctx.fillStyle = r.color; ctx.font = 'bold 13px sans-serif'; ctx.fillText(r.label, 128, r.y + 42)
  })
  ctx.fillStyle = '#4a8ab8'; ctx.font = '11px sans-serif'
  ctx.fillText('↑ Stairs to Level 02', 128, 380)
  ctx.fillStyle = '#e8c060'; ctx.fillText('● You are here  (L1)', 128, 400)
  return new THREE.CanvasTexture(c)
}

// ── Level 01 — Entrance Chamber ───────────────────────────────────────────────

function buildEntranceChamber(g) {
  const woodTex = woodTexture(); woodTex.repeat.set(RW / 3.0, RD / 3.0)
  const treadTex = woodTexture(); treadTex.repeat.set(2, 0.5)

  const bannerCanvas = makeBannerCanvas()
  const bannerTex = bannerCanvas
  bannerTex.wrapS = bannerTex.wrapT = THREE.ClampToEdgeWrapping

  // Try loading the real image
  new THREE.TextureLoader().load(
    'https://raw.githubusercontent.com/EARNOVAGAMING/museum-vr-sandbox/main/Banner%20first%20level.jpg',
    (t) => {
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
      bannerTex.image = t.image
      bannerTex.needsUpdate = true
    },
    undefined,
    () => { /* 404 — canvas stays */ }
  )

  const kioskTex = makeKioskCanvas()

  // ── Materials ────────────────────────────────────────────────────────────
  const mWall   = new THREE.MeshStandardMaterial({ color: WALL_COL, roughness: 0.88 })
  const mCeil   = new THREE.MeshStandardMaterial({ color: CEIL_COL, roughness: 0.95, side: THREE.DoubleSide })
  const mFloor  = new THREE.MeshStandardMaterial({ color: FLOOR_COL, roughness: 0.55, map: woodTex })
  const mTread  = new THREE.MeshStandardMaterial({ color: TREAD_COL, roughness: 0.65, map: treadTex })
  const mRiser  = new THREE.MeshStandardMaterial({ color: RISER_COL, roughness: 0.70 })
  const mSpine  = new THREE.MeshStandardMaterial({ color: '#1a1612', roughness: 0.90 })
  const mRail   = new THREE.MeshStandardMaterial({ color: RAIL_COL, roughness: 0.55 })
  const mDark   = new THREE.MeshStandardMaterial({ color: '#2e2416', roughness: 0.75 })
  const mGold   = new THREE.MeshStandardMaterial({ color: '#c9a84c', metalness: 0.65, roughness: 0.3 })
  const mBlack  = new THREE.MeshStandardMaterial({ color: '#0a0806', roughness: 0.4 })
  const mKiosk  = new THREE.MeshStandardMaterial({ color: '#0d0d0d', roughness: 0.4 })
  const mBanner = new THREE.MeshStandardMaterial({
    map: bannerTex, emissiveMap: bannerTex, emissive: new THREE.Color('#ffffff'),
    emissiveIntensity: 1.1, roughness: 0.9, toneMapped: false,
  })
  const mKioskScreen = new THREE.MeshStandardMaterial({
    map: kioskTex, emissiveMap: kioskTex, emissive: new THREE.Color('#ffffff'),
    emissiveIntensity: 0.85, roughness: 0.9, toneMapped: false,
  })
  const mLightbox = new THREE.MeshStandardMaterial({
    color: '#c8dff8', emissive: new THREE.Color('#8ab0e0'), emissiveIntensity: 0.8, roughness: 0.3,
  })
  const mLbFrame = new THREE.MeshStandardMaterial({ color: '#2a2820', roughness: 0.6 })
  const mMetalPole = new THREE.MeshStandardMaterial({ color: '#1a1814', roughness: 0.6, metalness: 0.3 })
  const mKioskFoot = new THREE.MeshStandardMaterial({ color: '#111010', roughness: 0.5, metalness: 0.4 })

  // ── Lighting ─────────────────────────────────────────────────────────────
  g.add(new THREE.AmbientLight('#ffd090', 0.18))
  g.add(pt('#ffb060', 3.5, 3.5, 2, [ 0.3, RH - 0.15,  1.0]))
  g.add(pt('#ffb060', 3.0, 3.5, 2, [-0.2, RH - 0.15, -1.5]))
  g.add(pt('#ffcc88', 4.0, 3.0, 2, [STAIR_CX, RH - 0.3, STAIR_BASE_Z - 0.5]))
  g.add(pt('#ffcc88', 4.0, 3.0, 2, [STAIR_CX, RH - 0.3, STAIR_TOP_Z  + 0.5]))

  const banX  = (RW / 2) - WT - 0.03
  const banCY = BAN_BOT + BAN_H / 2
  g.add(pt('#ffeacc', 22, 4.5, 1.6, [banX - 0.6, BAN_BOT + BAN_H * 0.55, BAN_Z]))

  const spot = new THREE.SpotLight('#fff4e0', 60)
  spot.position.set(banX - 1.0, RH - 0.12, BAN_Z)
  spot.angle = 0.42; spot.penumbra = 0.35; spot.distance = RH + 1; spot.decay = 1.4
  spot.castShadow = true; spot.shadow.mapSize.set(512, 512)
  const spotTarget = new THREE.Object3D()
  spotTarget.position.set(banX, banCY, BAN_Z)
  g.add(spot); g.add(spotTarget); spot.target = spotTarget

  g.add(pt('#b8deff', 6.0, 2.5, 2, [KIOSK_X, KIOSK_SH * 0.6, KIOSK_Z - 0.3]))
  g.add(pt('#c8e0ff', 5.0, 3.0, 1.8, [0, RH * 0.72, -(RD / 2) + 1.0]))

  // ── Floor / Ceiling ───────────────────────────────────────────────────────
  g.add(plane(RW, RD, mFloor, { pos: [0, 0, 0], rot: [-Math.PI / 2, 0, 0], recv: true }))
  g.add(plane(RW, RD, mCeil,  { pos: [0, RH, 0], rot: [Math.PI / 2, 0, 0] }))

  // ── Walls ─────────────────────────────────────────────────────────────────
  // Back
  g.add(box(RW, RH, WT, mWall, { pos: [0, RH / 2, -(RD / 2) + WT / 2], cast: true, recv: true }))
  // Left
  g.add(box(WT, RH, RD, mWall, { pos: [-(RW / 2) + WT / 2, RH / 2, 0], cast: true, recv: true }))
  // Right
  g.add(box(WT, RH, RD, mWall, { pos: [(RW / 2) - WT / 2, RH / 2, 0], cast: true, recv: true }))

  // Front wall — left panel
  const lpW = Math.max(0.001, DOOR_CX - DW / 2 + RW / 2 - WT)
  const lpX = (-(RW / 2) + WT + DOOR_CX - DW / 2) / 2
  g.add(box(lpW, RH, WT, mWall, { pos: [lpX, RH / 2, (RD / 2) - WT / 2], cast: true, recv: true }))
  // Front wall — right panel
  const rpW = Math.max(0.001, (RW / 2) - WT - DOOR_CX - DW / 2)
  const rpX = (DOOR_CX + DW / 2 + (RW / 2) - WT) / 2
  g.add(box(rpW, RH, WT, mWall, { pos: [rpX, RH / 2, (RD / 2) - WT / 2], cast: true, recv: true }))
  // Header above door
  g.add(box(DW, RH - DH, WT, mWall, { pos: [DOOR_CX, DH + (RH - DH) / 2, (RD / 2) - WT / 2], cast: true, recv: true }))

  // ── Banner ────────────────────────────────────────────────────────────────
  g.add(box(0.05, BAN_H + 0.10, BAN_W + 0.10, mBlack, { pos: [banX + 0.01, banCY, BAN_Z], cast: true }))
  g.add(box(0.025, BAN_H + 0.04, BAN_W + 0.04, mGold, { pos: [banX - 0.01, banCY, BAN_Z] }))
  g.add(plane(BAN_W, BAN_H, mBanner, { pos: [banX - 0.03, banCY, BAN_Z], rot: [0, Math.PI / 2, 0] }))

  // ── Floorplan kiosk ───────────────────────────────────────────────────────
  g.add(box(0.08, KIOSK_SH * 0.55, 0.08, mMetalPole, { pos: [KIOSK_X, KIOSK_SH * 0.28, KIOSK_Z], cast: true }))
  g.add(box(0.40, 0.08, 0.30, mKioskFoot, { pos: [KIOSK_X, 0.04, KIOSK_Z], cast: true }))
  g.add(box(0.08, KIOSK_SH * 0.72, KIOSK_SW + 0.06, mKiosk, { pos: [KIOSK_X, KIOSK_SH * 0.64, KIOSK_Z], cast: true }))
  g.add(plane(KIOSK_SW, KIOSK_SH * 0.70, mKioskScreen, {
    pos: [KIOSK_X - 0.05, KIOSK_SH * 0.64, KIOSK_Z], rot: [0, Math.PI / 2, 0],
  }))

  // ── POS counter ───────────────────────────────────────────────────────────
  g.add(box(POS_D, POS_H, POS_WW, mDark, { pos: [POS_X, POS_H / 2, POS_Z], cast: true, recv: true }))
  g.add(box(POS_D + 0.06, 0.05, POS_WW + 0.06, new THREE.MeshStandardMaterial({ color: '#1c1610', roughness: 0.4, metalness: 0.1 }),
    { pos: [POS_X, POS_H + 0.03, POS_Z] }))

  // ── Museum Guide desk ─────────────────────────────────────────────────────
  for (let i = 0; i < 3; i++) {
    const a = (i * 35 * Math.PI) / 180, r = 0.48
    const dm = box(0.32, 0.88, 0.20, mDark, {
      pos: [MG_X - Math.sin(a) * r, 0.44, MG_Z - Math.cos(a) * r],
      rot: [0, -a, 0], cast: true, recv: true,
    })
    g.add(dm)
  }

  // ── Lightboxes ────────────────────────────────────────────────────────────
  for (const lx of [LB1_X, LB2_X]) {
    g.add(box(LB_W + 0.06, LB_H + 0.06, 0.03, mLbFrame, { pos: [lx, RH * 0.68, LB_Z - 0.04] }))
    g.add(box(LB_W, LB_H, 0.06, mLightbox, { pos: [lx, RH * 0.68, LB_Z], cast: true }))
  }

  // ── STAIRCASE — visual prop only, single straight flight ─────────────────
  // Solid-fill steps climbing from STAIR_BASE_Z toward back wall (-Z)
  for (let i = 0; i < NS; i++) {
    const topY = (i + 1) * SR
    const cz   = STAIR_BASE_Z - i * SD - SD / 2
    g.add(box(SW, topY, SD, i % 2 === 0 ? mTread : mRiser, {
      pos: [STAIR_CX, topY / 2, cz], cast: true, recv: true,
    }))
  }
  // Side stringer (right side, closes the open face)
  g.add(box(0.10, STAIR_TOP_Y, NS * SD, mRiser, {
    pos: [STAIR_X2 + 0.05, STAIR_TOP_Y / 2, (STAIR_BASE_Z + STAIR_TOP_Z) / 2],
  }))
  // Handrail — wall side, slope-aligned, precisely 0.9 m above step noses
  const stairAngle = Math.atan2(SR, SD)
  const railLen    = Math.hypot(NS * SD, NS * SR) + 0.30
  const railY      = STAIR_TOP_Y / 2 + 0.90
  g.add(box(0.08, 0.08, railLen, mRail, {
    pos: [STAIR_X1 + 0.08, railY, (STAIR_BASE_Z + STAIR_TOP_Z) / 2],
    rot: [stairAngle, 0, 0], cast: true,
  }))

  // ── TRIGGER ZONE — glowing floor patch at stair base ─────────────────────
  // A subtle emissive plane on the floor signals "walk here → go to Level 2"
  const mTrigger = new THREE.MeshStandardMaterial({
    color: '#c9a84c', emissive: new THREE.Color('#c9a84c'),
    emissiveIntensity: 0.35, roughness: 0.9, transparent: true, opacity: 0.55,
  })
  const trigW = TRIG_MAX_X - TRIG_MIN_X
  const trigD = TRIG_MAX_Z - TRIG_MIN_Z
  g.add(plane(trigW, trigD, mTrigger, {
    pos: [(TRIG_MIN_X + TRIG_MAX_X) / 2, 0.01, (TRIG_MIN_Z + TRIG_MAX_Z) / 2],
    rot: [-Math.PI / 2, 0, 0],
  }))
}

// ── Level 02 — generic renderer ───────────────────────────────────────────────

function buildLevel2(g, spec, yOffset) {
  const accent = spec.mood?.accent || '#e7c789'
  const ceilY = yOffset + spec.height * HS
  const WALL_T = 0.12

  const mFloor = new THREE.MeshStandardMaterial({ color: spec.floorColor || '#5a4020', roughness: 0.65 })
  const mCeil  = new THREE.MeshStandardMaterial({ color: '#1e1a16', roughness: 0.98, side: THREE.DoubleSide })
  const mWall  = new THREE.MeshStandardMaterial({ color: spec.wallColor || '#252018', roughness: 0.97 })

  // Floor slab
  const shape = new THREE.Shape()
  spec.footprint.forEach((p, i) => {
    const x = p.x * S, z = -p.z * S
    if (i === 0) shape.moveTo(x, z); else shape.lineTo(x, z)
  })
  shape.closePath()
  const floorGeom = new THREE.ShapeGeometry(shape)
  const floorMesh = new THREE.Mesh(floorGeom, mFloor)
  floorMesh.rotation.set(-Math.PI / 2, 0, 0)
  floorMesh.position.set(0, yOffset, 0)
  floorMesh.receiveShadow = true
  g.add(floorMesh)

  // Ceiling slab
  const ceilMesh = new THREE.Mesh(new THREE.ShapeGeometry(shape.clone()), mCeil)
  ceilMesh.rotation.set(-Math.PI / 2, 0, 0)
  ceilMesh.position.set(0, ceilY, 0)
  g.add(ceilMesh)

  // Walls
  for (const seg of spec.wallSegments) {
    const ax = seg.a.x * S, az = seg.a.z * S
    const bx = seg.b.x * S, bz = seg.b.z * S
    const dx = bx - ax, dz = bz - az
    const len = Math.hypot(dx, dz)
    if (len < 0.001) continue
    const angle = Math.atan2(dz, dx)
    const h = (seg.height || spec.height) * HS
    const wm = box(len + WALL_T, h, WALL_T, mWall, {
      pos: [(ax + bx) / 2, yOffset + h / 2, (az + bz) / 2],
      rot: [0, -angle, 0], cast: true, recv: true,
    })
    g.add(wm)
  }

  // Lights
  g.add(new THREE.DirectionalLight('#ffffff', 0.25))
  for (const l of spec.lights) {
    g.add(pt(l.color || '#ffe1b0', (l.intensity || 4) * 4.5, (l.range || 4) * S * 1.6, 1.6,
      [l.x * S, yOffset + (l.y || 2.5) * HS, l.z * S]))
  }
}

// ── Triggers — world-space boxes that jump the player to another floor ─────────

export function getTriggers() {
  return [
    {
      onFloor: 0,
      toFloor: 1,
      box: { minX: TRIG_MIN_X, maxX: TRIG_MAX_X, minZ: TRIG_MIN_Z, maxZ: TRIG_MAX_Z },
    },
  ]
}

// ── Collision floor data ───────────────────────────────────────────────────────

let _floorsCache = null

export function getFloors() {
  if (_floorsCache) return _floorsCache

  // Floor 0 — Level 01 entrance (footprint in plan units = world / LAYOUT_SCALE)
  const hx  = (RW / 2) / LAYOUT_SCALE
  const hz  = (RD / 2) / LAYOUT_SCALE
  const ins = (WT / LAYOUT_SCALE) + 0.06
  const f0 = {
    floorY: 0,
    footprint: [
      { x: -hx + ins, z: -hz + ins },
      { x:  hx - ins, z: -hz + ins },
      { x:  hx - ins, z:  hz - ins },
      { x: -hx + ins, z:  hz - ins },
    ],
    walls: [],
    // Spawn just inside the entrance doorway (world X/Z)
    spawn: [DOOR_CX - 0.20, (RD / 2) - 0.75],
    short: 'L1',
    centerW: [0, 0],
  }

  // Floor 1 — Level 02 from data model
  const map = createAomMuseumMap()
  const lv2raw = (map.levels || [])[1]
  let f1 = null
  if (lv2raw) {
    const spec = buildLevelSpec(lv2raw)
    const sp = spec.spawn || { x: 0, z: 0 }
    const cx = spec.bounds?.cx || 0
    const cz = spec.bounds?.cz || 0
    f1 = {
      floorY: L2_Y,
      footprint: spec.footprint,
      walls: spec.wallSegments,
      spawn: [sp.x * S, sp.z * S],
      short: 'L2',
      centerW: [cx * S, cz * S],
    }
  }

  _floorsCache = f1 ? [f0, f1] : [f0]
  return _floorsCache
}

// ── Root builder ───────────────────────────────────────────────────────────────

export function buildMuseum() {
  const root = new THREE.Group()

  // Level 01 — entrance chamber
  const l1 = new THREE.Group()
  buildEntranceChamber(l1)
  root.add(l1)

  // Level 02 — data-driven
  const map = createAomMuseumMap()
  const lv2raw = (map.levels || [])[1]
  if (lv2raw) {
    const spec = buildLevelSpec(lv2raw)
    const l2 = new THREE.Group()
    buildLevel2(l2, spec, L2_Y)
    root.add(l2)
  }

  return root
}
