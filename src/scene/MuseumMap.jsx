import { useMemo } from 'react'
import * as THREE from 'three'
import { Text } from '@react-three/drei'
import { createAomMuseumMap, LAYOUT_SCALE, HEIGHT_SCALE } from '../data/museumMapModel'
import { buildLevelSpec } from '../data/museumMapScene'
import { woodTexture, plasterTexture, marbleTexture, rockTexture } from '../textures/procedural'
import EntranceChamber, { getEntranceChamberFloorData } from './EntranceChamber'

// Clean R3F renderer for Aidil's real AOM floorplan data (museumMapModel.js).
// We reuse his DATA (footprints, walls, zones, placed objects, stairs) and draw
// it with simple, lightweight geometry — synthetic, not photoreal splats. Two
// levels are stacked vertically (L1 on the ground, L2 above) so you can see the
// whole twin at once. Positions are plan-metres → multiplied by LAYOUT_SCALE
// (XZ) and HEIGHT_SCALE (Y); object sizes come from buildLevelSpec already
// resolved to world metres.
const S = LAYOUT_SCALE
const HS = HEIGHT_SCALE
const WALL_T = 0.12
const FLOOR_GAP = 0.6 // vertical gap between a level's ceiling and the next floor

// ── one wall segment (a→b, already opening-carved by splitWall) ──
function WallSeg({ a, b, height, color, roughness = 0.8, y, map }) {
  const ax = a.x * S, az = a.z * S, bx = b.x * S, bz = b.z * S
  const dx = bx - ax, dz = bz - az
  const len = Math.hypot(dx, dz)
  if (len < 0.001) return null
  const angle = Math.atan2(dz, dx)
  const h = height * HS
  return (
    <mesh position={[(ax + bx) / 2, y + h / 2, (az + bz) / 2]} rotation={[0, -angle, 0]} castShadow receiveShadow>
      <boxGeometry args={[len + WALL_T, h, WALL_T]} />
      <meshStandardMaterial color={color} roughness={roughness} map={map || null} />
    </mesh>
  )
}

// ── footprint polygon → a flat slab (floor or ceiling) ──
function Slab({ points, color, roughness = 0.5, y, map }) {
  const geom = useMemo(() => {
    const shape = new THREE.Shape()
    points.forEach((p, i) => {
      const x = p.x * S, z = -p.z * S
      if (i === 0) shape.moveTo(x, z)
      else shape.lineTo(x, z)
    })
    shape.closePath()
    const g = new THREE.ShapeGeometry(shape)
    g.computeBoundingBox()
    return g
  }, [points])
  return (
    <mesh geometry={geom} rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
      <meshStandardMaterial color={color} roughness={roughness} side={THREE.DoubleSide} map={map || null} />
    </mesh>
  )
}

// ── a single placed exhibit, drawn by type ──
function PlacedObject({ o, floorY, accent, marble }) {
  const x = o.position.x * S
  const z = o.position.z * S
  const r = (o.rotationY || 0) * Math.PI / 180
  const { w = 1, h = 1, d = 0.4 } = o.resolved || {}
  const wallMount = ['wall_frame', 'led_panel', 'video_wall', 'merch_shelf'].includes(o.type)
  // Floor objects sit on the floor PLUS their own base elevation (stair flights
  // and the reception/landing platforms are raised — y = 0.4 / 1.5 etc.), so a
  // multi-flight staircase stacks into one rising run instead of piling up.
  const baseY = floorY + (o.position.y || (wallMount ? 1.5 : 0)) * HS
  const col = o.color || accent || '#caa64a'

  let body = null
  switch (o.type) {
    case 'wall_frame':
      body = (
        <group position={[0, 0, 0]}>
          <mesh castShadow><boxGeometry args={[w + 0.12, h + 0.12, 0.06]} /><meshStandardMaterial color="#b8902f" metalness={0.85} roughness={0.35} /></mesh>
          <mesh position={[0, 0, 0.04]}><planeGeometry args={[w, h]} /><meshStandardMaterial color={col} roughness={0.85} /></mesh>
        </group>
      )
      break
    case 'led_panel':
      body = <mesh castShadow><boxGeometry args={[w, h, 0.12]} /><meshStandardMaterial color="#0b1822" emissive={col} emissiveIntensity={1.1} roughness={0.4} /></mesh>
      break
    case 'video_wall':
      body = (
        <group>
          <mesh castShadow><boxGeometry args={[w, h, 0.1]} /><meshStandardMaterial color="#0a0a0a" roughness={0.4} /></mesh>
          {/* warm layered mural colours — orange base, red-brown mid, gold highlight */}
          <mesh position={[0, 0, 0.06]}><planeGeometry args={[w, h]} /><meshStandardMaterial color="#c85a18" emissive="#c85a18" emissiveIntensity={0.7} roughness={0.8} /></mesh>
          <mesh position={[-w * 0.18, h * 0.1, 0.07]}><planeGeometry args={[w * 0.55, h * 0.7]} /><meshStandardMaterial color="#8b2a0a" emissive="#8b2a0a" emissiveIntensity={0.5} roughness={0.9} transparent opacity={0.7} /></mesh>
          <mesh position={[w * 0.1, -h * 0.15, 0.07]}><planeGeometry args={[w * 0.5, h * 0.45]} /><meshStandardMaterial color="#e8c060" emissive="#e8c060" emissiveIntensity={0.6} roughness={0.8} transparent opacity={0.55} /></mesh>
        </group>
      )
      break
    case 'vitrine':
      body = (
        <group>
          <mesh position={[0, 0.15, 0]} castShadow><boxGeometry args={[w, 0.3, d]} /><meshStandardMaterial color="#2b2620" roughness={0.6} /></mesh>
          <mesh position={[0, 0.3 + (h - 0.3) / 2, 0]}><boxGeometry args={[w, h - 0.3, d]} /><meshStandardMaterial color="#bfe6ff" transparent opacity={0.18} roughness={0.05} metalness={0.1} /></mesh>
          <mesh position={[0, 0.55, 0]} castShadow><icosahedronGeometry args={[Math.min(w, d) * 0.28, 0]} /><meshStandardMaterial color={col} metalness={0.5} roughness={0.3} /></mesh>
        </group>
      )
      break
    case 'plinth':
      body = (
        <group>
          <mesh position={[0, h / 2, 0]} castShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial color="#d8d4cc" roughness={0.45} map={marble || null} /></mesh>
          {/* glowing pyramid / triangle on top */}
          <mesh position={[0, h + Math.min(w, d) * 0.38, 0]} castShadow rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[Math.min(w, d) * 0.38, Math.min(w, d) * 0.76, 4, 1]} />
            <meshStandardMaterial color={col} emissive={col} emissiveIntensity={1.6} roughness={0.2} metalness={0.1} />
          </mesh>
        </group>
      )
      break
    case 'hologram':
      body = <mesh position={[0, h / 2, 0]}><cylinderGeometry args={[w * 0.4, w * 0.4, h, 20, 1, true]} /><meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.7} transparent opacity={0.4} side={THREE.DoubleSide} /></mesh>
      break
    case 'mannequin':
      body = (
        <group>
          <mesh position={[0, h * 0.45, 0]} castShadow><capsuleGeometry args={[w * 0.4, h * 0.55, 4, 8]} /><meshStandardMaterial color="#5b4a8a" roughness={0.7} /></mesh>
          <mesh position={[0, h * 0.9, 0]} castShadow><sphereGeometry args={[w * 0.28, 16, 16]} /><meshStandardMaterial color="#d8c9a8" roughness={0.8} /></mesh>
        </group>
      )
      break
    case 'merch_shelf':
      body = <mesh castShadow><boxGeometry args={[w, h, 0.3]} /><meshStandardMaterial color="#3a342e" roughness={0.7} /></mesh>
      break
    case 'desk':
      body = <mesh position={[0, h / 2, 0]} castShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial color="#5a3c24" roughness={0.6} /></mesh>
      break
    case 'vr_station':
      body = (
        <group>
          <mesh position={[0, h / 2, 0]} castShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial color="#26242a" roughness={0.6} /></mesh>
          <mesh position={[0, h + 0.15, 0]} castShadow><boxGeometry args={[0.3, 0.18, 0.22]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.5} /></mesh>
        </group>
      )
      break
    case 'bench':
      body = <mesh position={[0, h / 2, 0]} castShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial color="#4a3826" roughness={0.7} /></mesh>
      break
    case 'platform':
      body = <mesh position={[0, h / 2, 0]} castShadow receiveShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial color="#33302b" roughness={0.7} /></mesh>
      break
    case 'railing':
      body = (
        <group>
          <mesh position={[0, h / 2, 0]}><boxGeometry args={[w, h, 0.04]} /><meshStandardMaterial color="#bfe6ff" transparent opacity={0.2} /></mesh>
          <mesh position={[0, h, 0]}><boxGeometry args={[w, 0.06, 0.08]} /><meshStandardMaterial color="#9aa3ad" metalness={0.6} roughness={0.4} /></mesh>
        </group>
      )
      break
    case 'doorway':
      body = (
        <group>
          <mesh position={[-w / 2, h / 2, 0]}><boxGeometry args={[0.12, h, 0.2]} /><meshStandardMaterial color="#1c1c22" /></mesh>
          <mesh position={[w / 2, h / 2, 0]}><boxGeometry args={[0.12, h, 0.2]} /><meshStandardMaterial color="#1c1c22" /></mesh>
          <mesh position={[0, h, 0]}><boxGeometry args={[w, 0.14, 0.2]} /><meshStandardMaterial color="#1c1c22" /></mesh>
        </group>
      )
      break
    case 'stairs': {
      const steps = 5
      const stepCol = o.color || '#5a5a5a'
      body = (
        <group>
          {Array.from({ length: steps }, (_, i) => (
            <mesh key={i} position={[0, (i + 0.5) * (h / steps), -d / 2 + (i + 0.5) * (d / steps)]} castShadow receiveShadow>
              <boxGeometry args={[w, h / steps * 0.85, d / steps]} />
              <meshStandardMaterial color={stepCol} roughness={0.88} metalness={0.04} />
            </mesh>
          ))}
          {[-1, 1].map((side) => (
            <group key={side}>
              <mesh position={[side * (w / 2 - 0.06), h / 2 + 0.52, 0]} rotation={[Math.atan2(h, d), 0, 0]} castShadow>
                <boxGeometry args={[0.05, 0.05, Math.hypot(h, d) + 0.15]} />
                <meshStandardMaterial color="#8a9aaa" metalness={0.8} roughness={0.2} />
              </mesh>
            </group>
          ))}
        </group>
      )
      break
    }
    default:
      body = <mesh position={[0, h / 2, 0]}><boxGeometry args={[w, h, d]} /><meshStandardMaterial color={col} /></mesh>
  }

  return (
    <group position={[x, baseY, z]} rotation={[0, -r, 0]}>
      {body}
    </group>
  )
}

// ── one full level ──
function Level({ spec, yOffset }) {
  const accent = spec.mood?.accent || '#e7c789'
  const ceilY = yOffset + spec.height * HS
  const tex = useMemo(() => {
    const wood = woodTexture(); wood.repeat.set(0.4, 0.4)
    const rock = rockTexture(); rock.repeat.set(2.5, 1.5)
    const marble = marbleTexture()
    return { wood, rock, marble }
  }, [spec.wallColor])
  return (
    <group>
      <Slab points={spec.footprint} color={spec.floorColor} roughness={spec.floorRoughness ?? 0.60} y={yOffset} map={tex.wood} />
      <Slab points={spec.footprint} color="#1e1a16" roughness={0.98} y={ceilY} map={tex.rock} />
      {spec.wallSegments.map((seg, i) => (
        <WallSeg key={i} a={seg.a} b={seg.b} height={seg.height || spec.height} color="#252018" roughness={spec.wallRoughness ?? 0.97} y={yOffset} map={tex.rock} />
      ))}
      {/* zone "area" pools — subtle tinted floor patches at each labelled zone */}
      {spec.zones.map((z, i) => (
        z.center ? (
          <mesh key={`z${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[z.center.x * S, yOffset + 0.02, z.center.z * S]}>
            <circleGeometry args={[1.9, 40]} />
            <meshStandardMaterial color={z.tint || accent} transparent opacity={0.13} roughness={0.9} />
          </mesh>
        ) : null
      ))}
      {spec.objects.map((o) => (
        <PlacedObject key={o.id} o={o} floorY={yOffset} accent={accent} marble={tex.marble} />
      ))}
      {/* cinematic spotlight fixtures */}
      {spec.lights.map((l, i) => (
        <pointLight key={i} position={[l.x * S, yOffset + (l.y || 2.5) * HS, l.z * S]} intensity={(l.intensity || 4) * 4.5} distance={(l.range || 4) * S * 1.6} decay={1.6} color={l.color || '#ffe1b0'} />
      ))}
      <Text position={[spec.bounds.cx * S, ceilY - 0.4, spec.bounds.minZ * S + 0.6]} fontSize={0.6} color={accent} anchorX="center" anchorY="middle" letterSpacing={0.06}>
        {spec.name}
      </Text>
    </group>
  )
}

export const floorOffset = (l1) => (l1 ? l1.height * HS + FLOOR_GAP : 0)

// Level 01 uses the hand-crafted EntranceChamber instead of the generic Level.
// Level 02 height in world metres — used to offset the second floor.
const L1_HEIGHT_WORLD = 3.2
const L1_GAP = 0.6

export { getEntranceChamberFloorData }

export default function MuseumMap() {
  const l2 = useMemo(() => {
    const map = createAomMuseumMap()
    const lv = (map.levels || []).slice(0, 2)
    return lv[1] ? buildLevelSpec(lv[1]) : null
  }, [])

  const l2Y = L1_HEIGHT_WORLD + L1_GAP

  return (
    <group>
      {/* Level 01 — bespoke entrance chamber */}
      <EntranceChamber yOffset={0} />
      {/* Level 02 — generic renderer */}
      <directionalLight position={[4, 20, 6]} intensity={0.25} castShadow />
      {l2 && <Level spec={l2} yOffset={l2Y} />}
    </group>
  )
}
