import { useMemo } from 'react'
import * as THREE from 'three'
import { Text } from '@react-three/drei'
import { createAomMuseumMap, LAYOUT_SCALE, HEIGHT_SCALE } from '../data/museumMapModel'
import { buildLevelSpec } from '../data/museumMapScene'
import { woodTexture, plasterTexture, marbleTexture } from '../textures/procedural'

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
  const baseY = wallMount ? floorY + (o.position.y || 1.5) * HS : floorY
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
    case 'video_wall':
      body = <mesh castShadow><boxGeometry args={[w, h, 0.12]} /><meshStandardMaterial color="#0b1822" emissive={col} emissiveIntensity={0.9} roughness={0.4} /></mesh>
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
          <mesh position={[0, h / 2, 0]} castShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial color="#e8e3d6" roughness={0.5} map={marble || null} /></mesh>
          <mesh position={[0, h + 0.18, 0]} castShadow><torusKnotGeometry args={[0.14, 0.05, 90, 12]} /><meshStandardMaterial color={col} metalness={0.6} roughness={0.25} /></mesh>
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
      const steps = 8
      body = (
        <group>
          {Array.from({ length: steps }, (_, i) => (
            <mesh key={i} position={[0, (i + 0.5) * (h / steps), -d / 2 + (i + 0.5) * (d / steps)]} castShadow receiveShadow>
              <boxGeometry args={[w, h / steps, d / steps]} />
              <meshStandardMaterial color="#6a5238" roughness={0.7} />
            </mesh>
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
    const wood = woodTexture(); wood.repeat.set(0.5, 0.5)
    const plaster = plasterTexture(spec.wallColor); plaster.repeat.set(3, 1.5)
    const marble = marbleTexture()
    return { wood, plaster, marble }
  }, [spec.wallColor])
  return (
    <group>
      <Slab points={spec.footprint} color={spec.floorColor} roughness={spec.floorRoughness ?? 0.55} y={yOffset} map={tex.wood} />
      <Slab points={spec.footprint} color={spec.wallColor} roughness={1} y={ceilY} map={tex.plaster} />
      {spec.wallSegments.map((seg, i) => (
        <WallSeg key={i} a={seg.a} b={seg.b} height={seg.height || spec.height} color={spec.wallColor} roughness={spec.wallRoughness ?? 0.75} y={yOffset} map={tex.plaster} />
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
      {/* a bright fill over the centre of each floor so the dark walls read */}
      <pointLight position={[spec.bounds.cx * S, yOffset + spec.height * HS * 0.85, spec.bounds.cz * S]} intensity={6} distance={spec.bounds.halfMax * S * 2.6} decay={1.4} color="#fff3e0" />
      {/* the level's own cinematic fixtures */}
      {spec.lights.map((l, i) => (
        <pointLight key={i} position={[l.x * S, yOffset + (l.y || 2.5) * HS, l.z * S]} intensity={(l.intensity || 4) * 1.1} distance={(l.range || 4) * S} decay={2} color={l.color || '#ffe1b0'} />
      ))}
      <Text position={[spec.bounds.cx * S, ceilY - 0.4, spec.bounds.minZ * S + 0.6]} fontSize={0.6} color={accent} anchorX="center" anchorY="middle" letterSpacing={0.06}>
        {spec.name}
      </Text>
    </group>
  )
}

export const floorOffset = (l1) => (l1 ? l1.height * HS + FLOOR_GAP : 0)

export default function MuseumMap() {
  // Levels 1 + 2 — stacked vertically; you climb the staircase to reach L2.
  const [l1, l2] = useMemo(() => {
    const map = createAomMuseumMap()
    const lv = (map.levels || []).slice(0, 2)
    return lv.map((lvl) => buildLevelSpec(lvl))
  }, [])

  return (
    <group>
      <ambientLight intensity={1.15} />
      <hemisphereLight args={['#fff6e6', '#4a4550', 1.0]} />
      <directionalLight position={[6, 18, 8]} intensity={0.9} castShadow />
      <directionalLight position={[-8, 16, -6]} intensity={0.5} />
      {l1 && <Level spec={l1} yOffset={0} />}
      {l2 && <Level spec={l2} yOffset={floorOffset(l1)} />}
    </group>
  )
}
