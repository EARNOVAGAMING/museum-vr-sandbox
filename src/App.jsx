import { useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { createXRStore, XR } from '@react-three/xr'
import MuseumMap from './scene/MuseumMap.jsx'
import FirstPersonRig from './scene/FirstPersonRig.jsx'
import Joystick from './ui/Joystick.jsx'
import { createAomMuseumMap, LAYOUT_SCALE, HEIGHT_SCALE } from './data/museumMapModel'
import { buildLevelSpec } from './data/museumMapScene'

const store = createXRStore()
const S = LAYOUT_SCALE
const HS = HEIGHT_SCALE
const FLOOR_GAP = 0.6

export default function App() {
  const [mode, setMode] = useState('walk')
  const [reqFloor, setReqFloor] = useState(0)
  const [nonce, setNonce] = useState(0)

  const { floors, triggers } = useMemo(() => {
    const map = createAomMuseumMap()
    const specs = (map.levels || []).slice(0, 2).map(buildLevelSpec)
    let y = 0
    const floors = specs.map((spec, i) => {
      const sp = spec.spawn || { x: 0, z: 0 }
      const cx = spec.bounds?.cx || 0
      const cz = spec.bounds?.cz || 0
      const info = {
        floorY: y,
        footprint: spec.footprint,
        walls: spec.wallSegments,
        spawn: [sp.x * S, sp.z * S],
        short: `L${i + 1}`,
        centerW: [cx * S, cz * S],
      }
      y += (spec.height || 3) * HS + FLOOR_GAP
      return info
    })
    // each floor's stair that links to the other floor (for the arrival point)
    const linkPos = specs.map((spec) => {
      const o = (spec.objects || []).find((x) => x.type === 'stairs' && x.linkLevelId)
      return o ? [o.position.x * S, o.position.z * S] : null
    })
    const triggers = []
    specs.forEach((spec, i) => {
      (spec.objects || []).filter((o) => o.type === 'stairs' && o.linkLevelId).forEach((o) => {
        const target = o.linkLevelId === 'level_02' ? 1 : o.linkLevelId === 'level_01' ? 0 : -1
        if (target < 0 || target >= floors.length) return
        const cx = o.position.x * S
        const cz = o.position.z * S
        const sz = o.resolved || { w: 2.4, d: 2.4 }
        const box = {
          minX: cx - (sz.w / 2 + 1.7), maxX: cx + (sz.w / 2 + 1.7),
          minZ: cz - (sz.d / 2 + 1.7), maxZ: cz + (sz.d / 2 + 1.7),
        }
        const tf = floors[target]
        const lp = linkPos[target]
        let arrive = tf.centerW
        if (lp) {
          const dx = tf.centerW[0] - lp[0]
          const dz = tf.centerW[1] - lp[1]
          const dl = Math.hypot(dx, dz) || 1
          arrive = [lp[0] + (dx / dl) * 2.8, lp[1] + (dz / dl) * 2.8]
        }
        triggers.push({ onFloor: i, toFloor: target, box, arrive })
      })
    })
    return { floors, triggers }
  }, [])

  const jump = (i) => { setReqFloor(i); setNonce((n) => n + 1) }

  return (
    <>
      <div className="hint">
        <strong>Asian Operatic Museum — 3D Twin</strong>
        <br />
        {mode === 'walk'
          ? 'Drag to look · joystick / WASD to walk · climb the staircase to Level 02.'
          : 'Drag to orbit · pinch / scroll to zoom.'}
      </div>

      <div className="ui-buttons">
        <div className="ui-row">
          <button className={`ui-btn ${mode === 'walk' ? 'active' : ''}`} onClick={() => setMode('walk')}>Walk</button>
          <button className={`ui-btn ${mode === 'overview' ? 'active' : ''}`} onClick={() => setMode('overview')}>Overview</button>
        </div>
        {mode === 'walk' && (
          <div className="ui-row">
            {floors.map((f, i) => (
              <button key={i} className={`ui-btn ${reqFloor === i ? 'active' : ''}`} onClick={() => jump(i)}>{f.short}</button>
            ))}
          </div>
        )}
      </div>

      <Canvas shadows camera={{ position: [18, 16, 44], fov: 60 }} gl={{ antialias: true, toneMapping: 4, toneMappingExposure: 1.5 }}>
        <color attach="background" args={['#0a0807']} />
        <XR store={store}>
          <MuseumMap />
          {mode === 'walk' ? (
            <FirstPersonRig floors={floors} triggers={triggers} requestFloor={reqFloor} requestNonce={nonce} />
          ) : (
            <OrbitControls target={[0, 5, 0]} maxPolarAngle={Math.PI / 2.02} minDistance={4} maxDistance={70} enablePan enableDamping dampingFactor={0.08} />
          )}
        </XR>
      </Canvas>

      {mode === 'walk' && <Joystick />}

      <button className="vr-button" onClick={() => store.enterVR()}>Enter VR</button>
    </>
  )
}
