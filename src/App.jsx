import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { createXRStore, XR } from '@react-three/xr'
import Museum from './scene/Museum.jsx'

// One XR store for the app. store.enterVR() is wired to the button below; the
// <XR> provider makes the scene render into an immersive session when entered.
const store = createXRStore()

export default function App() {
  return (
    <>
      <div className="hint">
        <strong>Asian Operatic Museum — VR Gallery</strong>
        <br />
        Phone / desktop: drag to look around, pinch / scroll to move closer.
        <br />
        Headset: tap “Enter VR”.
      </div>

      <Canvas
        shadows
        camera={{ position: [0, 1.7, 7], fov: 62 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#0b0b0f']} />
        <XR store={store}>
          <Museum />
          {/* OrbitControls is desktop/touch only; inert inside an XR session. */}
          <OrbitControls
            target={[0, 1.9, -2]}
            maxPolarAngle={Math.PI / 2.05}
            minDistance={1.5}
            maxDistance={11}
            enablePan={false}
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
