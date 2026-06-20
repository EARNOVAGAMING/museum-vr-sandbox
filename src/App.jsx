import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { createXRStore, XR } from '@react-three/xr'
import MuseumMap from './scene/MuseumMap.jsx'

// One XR store for the app. store.enterVR() is wired to the button below; the
// <XR> provider makes the scene render into an immersive session when entered.
const store = createXRStore()

export default function App() {
  return (
    <>
      <div className="hint">
        <strong>Asian Operatic Museum — 3D Twin</strong>
        <br />
        2 floors (Aidil&apos;s real floorplan). Drag to orbit, pinch / scroll to zoom.
        <br />
        Headset: tap “Enter VR”.
      </div>

      <Canvas
        shadows
        camera={{ position: [18, 16, 44], fov: 55 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#0a0807']} />
        <XR store={store}>
          <MuseumMap />
          {/* OrbitControls is desktop/touch only; inert inside an XR session. */}
          <OrbitControls
            target={[0, 5, 0]}
            maxPolarAngle={Math.PI / 2.02}
            minDistance={4}
            maxDistance={70}
            enablePan
            enableDamping
            dampingFactor={0.08}
          />
        </XR>
      </Canvas>

      <button className="vr-button" onClick={() => store.enterVR()}>
        Enter VR
      </button>
    </>
  )
}
