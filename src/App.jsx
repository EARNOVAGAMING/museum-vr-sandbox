import { useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { createXRStore, XR } from '@react-three/xr'
import MuseumMap from './scene/MuseumMap.jsx'
import FirstPersonRig from './scene/FirstPersonRig.jsx'
import Joystick from './ui/Joystick.jsx'
import { createAomMuseumMap, LAYOUT_SCALE, HEIGHT_SCALE } from './data/museumMapModel'

const store = createXRStore()
const FLOOR_GAP = 0.6

export default function App() {
  const [mode, setMode] = useState('walk') // 'walk' | 'overview'
  const [floor, setFloor] = useState(0)

  // Floor spawn points + heights, derived from the real floorplan data.
  const floors = useMemo(() => {
    const map = createAomMuseumMap()
    const lv = (map.levels || []).slice(0, 1)
    let y = 0
    return lv.map((l, i) => {
      const sp = l.spawn || { x: 0, z: 0 }
      const info = {
        name: l.name || `Level 0${i + 1}`,
        short: `L${i + 1}`,
        floorY: y,
        spawn: [sp.x * LAYOUT_SCALE, sp.z * LAYOUT_SCALE],
        footprint: l.footprint || [],
      }
      y += (l.height || 3) * HEIGHT_SCALE + FLOOR_GAP
      return info
    })
  }, [])

  const cur = floors[floor] || floors[0]

  return (
    <>
      <div className="hint">
        <strong>Asian Operatic Museum — 3D Twin</strong>
        <br />
        {mode === 'walk'
          ? 'Drag to look · joystick (or WASD) to walk.'
          : 'Drag to orbit · pinch / scroll to zoom.'}
      </div>

      <div className="ui-buttons">
        <div className="ui-row">
          <button className={`ui-btn ${mode === 'walk' ? 'active' : ''}`} onClick={() => setMode('walk')}>Walk</button>
          <button className={`ui-btn ${mode === 'overview' ? 'active' : ''}`} onClick={() => setMode('overview')}>Overview</button>
        </div>
        {mode === 'walk' && floors.length > 1 && (
          <div className="ui-row">
            {floors.map((f, i) => (
              <button key={i} className={`ui-btn ${floor === i ? 'active' : ''}`} onClick={() => setFloor(i)}>{f.short}</button>
            ))}
          </div>
        )}
      </div>

      <Canvas
        shadows
        camera={{ position: [18, 16, 44], fov: 60 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#1a1620']} />
        <XR store={store}>
          <MuseumMap />
          {mode === 'walk' ? (
            <FirstPersonRig floorY={cur.floorY} spawn={cur.spawn} footprint={cur.footprint} />
          ) : (
            <OrbitControls
              target={[0, 5, 0]}
              maxPolarAngle={Math.PI / 2.02}
              minDistance={4}
              maxDistance={70}
              enablePan
              enableDamping
              dampingFactor={0.08}
            />
          )}
        </XR>
      </Canvas>

      {mode === 'walk' && <Joystick />}

      <button className="vr-button" onClick={() => store.enterVR()}>
        Enter VR
      </button>
    </>
  )
}
