import { useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { createXRStore, XR } from '@react-three/xr'
import MuseumMap from './scene/MuseumMap.jsx'
import FirstPersonRig from './scene/FirstPersonRig.jsx'
import Joystick from './ui/Joystick.jsx'
import { getEntranceChamberFloorData } from './scene/EntranceChamber.jsx'
import { createAomMuseumMap, LAYOUT_SCALE, HEIGHT_SCALE } from './data/museumMapModel'
import { buildLevelSpec } from './data/museumMapScene'

const store = createXRStore()
const S = LAYOUT_SCALE
const HS = HEIGHT_SCALE

// Level 01 world height (matches EntranceChamber RH constant)
const L1_HEIGHT_WORLD = 4.5
const L1_GAP = 0.6

export default function App() {
  const [mode, setMode] = useState('walk')
  const [reqFloor, setReqFloor] = useState(0)
  const [nonce, setNonce] = useState(0)

  const { floors, triggers } = useMemo(() => {
    // Floor 0 — hand-crafted entrance chamber
    const f0 = getEntranceChamberFloorData(0)

    // Floor 1 — Level 02 from data model
    const map = createAomMuseumMap()
    const lv2raw = (map.levels || [])[1]
    const l2Y = L1_HEIGHT_WORLD + L1_GAP
    let f1 = null
    if (lv2raw) {
      const spec = buildLevelSpec(lv2raw)
      const sp = spec.spawn || { x: 0, z: 0 }
      const cx = spec.bounds?.cx || 0
      const cz = spec.bounds?.cz || 0
      f1 = {
        floorY: l2Y,
        footprint: spec.footprint,
        walls: spec.wallSegments,
        spawn: [sp.x * S, sp.z * S],
        short: 'L2',
        centerW: [cx * S, cz * S],
      }
    }

    const floors = f1 ? [f0, f1] : [f0]
    // No stair triggers needed yet (manual L1/L2 buttons handle jumping)
    return { floors, triggers: [] }
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

      <Canvas shadows camera={{ position: [18, 16, 44], fov: 60 }} gl={{ antialias: true, toneMapping: 4, toneMappingExposure: 2.8 }}>
        <color attach="background" args={['#2a2520']} />
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
