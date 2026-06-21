import { useEffect, useRef, useState } from 'react'
import { SceneManager } from './renderer/SceneManager.js'
import Joystick from './ui/Joystick.jsx'

export default function App() {
  const canvasRef = useRef(null)
  const smRef     = useRef(null)
  const [mode, setMode]         = useState('walk')
  const [reqFloor, setReqFloor] = useState(0)
  const [floors, setFloors]     = useState([])

  // Boot Three.js scene once the canvas element is in the DOM
  useEffect(() => {
    const sm = new SceneManager(canvasRef.current)
    smRef.current = sm
    setFloors(sm.getFloors())
    return () => sm.dispose()
  }, [])

  const switchMode = (m) => {
    setMode(m)
    smRef.current?.setMode(m)
  }

  const jump = (i) => {
    setReqFloor(i)
    smRef.current?.jumpToFloor(i)
  }

  return (
    <>
      {/* Full-screen Three.js canvas */}
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', display: 'block' }}
      />

      {/* HUD hint */}
      <div className="hint">
        <strong>Asian Operatic Museum — 3D Twin</strong>
        <br />
        {mode === 'walk'
          ? 'Drag to look · joystick / WASD to walk'
          : 'Drag to orbit · scroll to zoom'}
      </div>

      {/* Mode + floor buttons */}
      <div className="ui-buttons">
        <div className="ui-row">
          <button className={`ui-btn ${mode === 'walk'     ? 'active' : ''}`} onClick={() => switchMode('walk')}>Walk</button>
          <button className={`ui-btn ${mode === 'overview' ? 'active' : ''}`} onClick={() => switchMode('overview')}>Overview</button>
        </div>
        {mode === 'walk' && (
          <div className="ui-row">
            {floors.map((f, i) => (
              <button key={i} className={`ui-btn ${reqFloor === i ? 'active' : ''}`} onClick={() => jump(i)}>
                {f.short}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* On-screen joystick (walk mode only) */}
      {mode === 'walk' && <Joystick />}

      {/* Enter VR */}
      <button className="vr-button" onClick={() => smRef.current?.enterVR()}>
        Enter VR
      </button>
    </>
  )
}
