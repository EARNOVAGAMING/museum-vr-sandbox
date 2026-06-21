import { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { woodTexture, rockTexture } from '../textures/procedural'
import { LAYOUT_SCALE } from '../data/museumMapModel'

// Room dimensions (world metres)
const RW = 8.0   // width  X
const RD = 7.0   // depth  Z
const RH = 4.5   // height Y
const WT = 0.4   // wall thickness

// Doorway in front wall (Z = +RD/2)
const DW = 1.6   // doorway width
const DH = 2.5   // doorway height

// Platform (left side)
const PLAT_W = 2.2   // platform top width
const PLAT_H = 1.0   // platform top height above floor
const PLAT_D = 2.4   // platform depth (Z)
const PLAT_X = -(RW / 2 - PLAT_W / 2 - WT) // left side
const PLAT_Z = -0.4  // centred slightly back

// Steps: 4 steps, each 0.25m high, 0.3m deep, 2m wide
const STEP_COUNT = 4
const STEP_H = 0.25
const STEP_D = 0.3
const STEPS_W = PLAT_W

// Plinth on platform
const PLI_W = 0.6
const PLI_H = 1.2
const PLI_D = 0.6

// Poster on back wall (Z = -RD/2)
const POST_W = 2.0
const POST_H = 3.5
const POST_BOTTOM = 0.4

function makeWelcomeTex() {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 896
  const ctx = c.getContext('2d')
  // deep background
  ctx.fillStyle = '#0e0a06'
  ctx.fillRect(0, 0, 512, 896)
  // gold border
  ctx.strokeStyle = '#c9a84c'
  ctx.lineWidth = 12
  ctx.strokeRect(16, 16, 480, 864)
  ctx.lineWidth = 4
  ctx.strokeRect(28, 28, 456, 840)
  // inner warm glow
  const grd = ctx.createRadialGradient(256, 380, 40, 256, 380, 320)
  grd.addColorStop(0, 'rgba(200,140,40,0.22)')
  grd.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, 512, 896)
  // decorative top motif — stylised gate arch
  ctx.strokeStyle = '#c9a84c'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(140, 110); ctx.lineTo(140, 180)
  ctx.lineTo(256, 130); ctx.lineTo(372, 180); ctx.lineTo(372, 110)
  ctx.stroke()
  ctx.beginPath(); ctx.arc(256, 130, 30, 0, Math.PI * 2); ctx.strokeStyle = '#e8c060'; ctx.lineWidth = 2; ctx.stroke()
  // title
  ctx.fillStyle = '#e8c060'
  ctx.font = 'bold 46px serif'
  ctx.textAlign = 'center'
  ctx.fillText('ASIAN', 256, 280)
  ctx.fillText('OPERATIC', 256, 335)
  ctx.fillText('MUSEUM', 256, 390)
  // divider
  ctx.strokeStyle = '#c9a84c'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(100, 415); ctx.lineTo(412, 415); ctx.stroke()
  // subtitle
  ctx.fillStyle = '#d4b96a'
  ctx.font = '24px serif'
  ctx.fillText('WELCOME', 256, 460)
  // body text lines
  ctx.fillStyle = '#a89060'
  ctx.font = '18px serif'
  ctx.fillText('A journey through the art,', 256, 520)
  ctx.fillText('history & soul of opera', 256, 548)
  ctx.fillText('in Southeast Asia', 256, 576)
  // lower divider
  ctx.strokeStyle = '#c9a84c'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(100, 620); ctx.lineTo(412, 620); ctx.stroke()
  // bottom motif — three stars
  for (let i = -1; i <= 1; i++) {
    ctx.fillStyle = '#c9a84c'
    ctx.beginPath(); ctx.arc(256 + i * 60, 660, 5, 0, Math.PI * 2); ctx.fill()
  }
  const t = new THREE.CanvasTexture(c)
  return t
}

// Floor data for FirstPersonRig (plan units = world / LAYOUT_SCALE)
const S = LAYOUT_SCALE
const planHX = (RW / 2) / S
const planHZ = (RD / 2) / S

export function getEntranceChamberFloorData(yOffset = 0) {
  // footprint in plan units, wall thickness inset so player can't walk through walls
  const inset = WT / S + 0.05
  return {
    floorY: yOffset,
    footprint: [
      { x: -planHX + inset, z: -planHZ + inset },
      { x:  planHX - inset, z: -planHZ + inset },
      { x:  planHX - inset, z:  planHZ - inset },
      { x: -planHX + inset, z:  planHZ - inset },
    ],
    // no additional wall segments — footprint handles it
    walls: [],
    spawn: [0, (RD / 2 - 0.8)],  // world coords, near front door
    short: 'L1',
    centerW: [0, 0],
  }
}

export default function EntranceChamber({ yOffset = 0 }) {
  const spotRef = useRef()
  const targetRef = useRef()

  useEffect(() => {
    if (spotRef.current && targetRef.current) {
      spotRef.current.target = targetRef.current
    }
  }, [])

  const tex = useMemo(() => {
    const wood = woodTexture()
    wood.repeat.set(RW / 3, RD / 3)
    const rock = rockTexture()
    rock.repeat.set(3, 2)
    const post = makeWelcomeTex()
    return { wood, rock, post }
  }, [])

  const y = yOffset
  // Convenience: back wall Z, poster position
  const backZ = -(RD / 2) + WT / 2  // inner face of back wall
  const posterZ = -(RD / 2) + WT + 0.02
  const posterY = y + POST_BOTTOM + POST_H / 2
  // Platform step start Z — steps descend from platform toward +Z
  const platFrontZ = PLAT_Z + PLAT_D / 2
  const stepStartZ = platFrontZ  // front face of bottom step

  // Pyramid color
  const pyrCol = '#ffd060'
  // Plinth position (on top of platform)
  const plinthTopY = y + PLAT_H + PLI_H
  const pyrBaseY = y + PLAT_H + PLI_H
  const pyrSize = 0.38

  return (
    <group>
      {/* ── LIGHTING ── */}
      <ambientLight intensity={1.8} color="#ffffff" />
      <directionalLight position={[0, 10, 0]} intensity={1.5} color="#ffffff" />
      <pointLight position={[0, RH - 0.5, 0]} intensity={20} distance={12} decay={1.2} color="#ffffff" />

      {/* spotlight on poster */}
      <spotLight
        ref={spotRef}
        position={[0, y + RH - 0.3, posterZ + 2.5]}
        intensity={40}
        angle={0.45}
        penumbra={0.4}
        distance={RH + 2}
        decay={1.2}
        color="#ffffff"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <object3D ref={targetRef} position={[0, posterY, posterZ]} />

      {/* pyramid warm glow */}
      <pointLight
        position={[PLAT_X, pyrBaseY + pyrSize * 0.8, PLAT_Z]}
        intensity={12}
        distance={6}
        decay={1.2}
        color="#ffcc66"
      />

      {/* ── FLOOR — wood planks ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
        <planeGeometry args={[RW, RD]} />
        <meshStandardMaterial color="#5c3b1a" roughness={0.55} map={tex.wood} />
      </mesh>

      {/* ── CEILING — rock ── */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, y + RH, 0]}>
        <planeGeometry args={[RW, RD]} />
        <meshStandardMaterial color="#6a6258" roughness={0.85} map={tex.rock} side={THREE.DoubleSide} />
      </mesh>

      {/* ── BACK WALL (Z-) ── */}
      <mesh position={[0, y + RH / 2, -(RD / 2) + WT / 2]} castShadow receiveShadow>
        <boxGeometry args={[RW, RH, WT]} />
        <meshStandardMaterial color="#7a7060" roughness={0.85} map={tex.rock} />
      </mesh>

      {/* ── LEFT WALL (X-) ── */}
      <mesh position={[-(RW / 2) + WT / 2, y + RH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[WT, RH, RD]} />
        <meshStandardMaterial color="#7a7060" roughness={0.85} map={tex.rock} />
      </mesh>

      {/* ── RIGHT WALL (X+) ── */}
      <mesh position={[(RW / 2) - WT / 2, y + RH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[WT, RH, RD]} />
        <meshStandardMaterial color="#7a7060" roughness={0.85} map={tex.rock} />
      </mesh>

      {/* ── FRONT WALL (Z+) — doorway opening: left column, right column, header ── */}
      {/* left column */}
      <mesh position={[-(DW / 2 + (RW / 2 - DW / 2) / 2), y + RH / 2, (RD / 2) - WT / 2]} castShadow receiveShadow>
        <boxGeometry args={[RW / 2 - DW / 2, RH, WT]} />
        <meshStandardMaterial color="#7a7060" roughness={0.85} map={tex.rock} />
      </mesh>
      {/* right column */}
      <mesh position={[(DW / 2 + (RW / 2 - DW / 2) / 2), y + RH / 2, (RD / 2) - WT / 2]} castShadow receiveShadow>
        <boxGeometry args={[RW / 2 - DW / 2, RH, WT]} />
        <meshStandardMaterial color="#7a7060" roughness={0.85} map={tex.rock} />
      </mesh>
      {/* header beam above doorway */}
      <mesh position={[0, y + DH + (RH - DH) / 2, (RD / 2) - WT / 2]} castShadow receiveShadow>
        <boxGeometry args={[DW, RH - DH, WT]} />
        <meshStandardMaterial color="#7a7060" roughness={0.85} map={tex.rock} />
      </mesh>

      {/* ── WELCOME POSTER ── */}
      <mesh position={[0, posterY, posterZ]} receiveShadow>
        <boxGeometry args={[POST_W, POST_H, 0.06]} />
        <meshStandardMaterial color="#120e08" roughness={0.55} />
      </mesh>
      <mesh position={[0, posterY, posterZ + 0.04]}>
        <planeGeometry args={[POST_W - 0.08, POST_H - 0.08]} />
        <meshStandardMaterial map={tex.post} emissive="#8b6a20" emissiveIntensity={0.28} roughness={0.85} />
      </mesh>

      {/* ── RAISED PLATFORM (left side) ── */}
      <mesh position={[PLAT_X, y + PLAT_H / 2, PLAT_Z]} castShadow receiveShadow>
        <boxGeometry args={[PLAT_W, PLAT_H, PLAT_D]} />
        <meshStandardMaterial color="#3a3530" roughness={0.82} />
      </mesh>

      {/* ── STEPS (4 concrete steps rising to platform) ── */}
      {Array.from({ length: STEP_COUNT }, (_, i) => {
        const stepH = (i + 1) * STEP_H
        const stepDepth = (i + 1) * STEP_D
        // steps grow toward -Z (into the room) and up
        return (
          <mesh
            key={i}
            position={[PLAT_X, y + stepH / 2, platFrontZ - stepDepth / 2]}
            castShadow receiveShadow
          >
            <boxGeometry args={[STEPS_W, stepH, stepDepth]} />
            <meshStandardMaterial color="#4a4640" roughness={0.88} metalness={0.04} />
          </mesh>
        )
      })}

      {/* ── PLINTH on platform ── */}
      <mesh position={[PLAT_X, y + PLAT_H + PLI_H / 2, PLAT_Z]} castShadow>
        <boxGeometry args={[PLI_W, PLI_H, PLI_D]} />
        <meshStandardMaterial color="#2a2824" roughness={0.75} metalness={0.08} />
      </mesh>

      {/* ── GLOWING PYRAMID on plinth ── */}
      <mesh position={[PLAT_X, plinthTopY + pyrSize * 0.9, PLAT_Z]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[pyrSize, pyrSize * 1.8, 4, 1]} />
        <meshStandardMaterial color={pyrCol} emissive={pyrCol} emissiveIntensity={2.0} roughness={0.15} metalness={0.1} />
      </mesh>
    </group>
  )
}
