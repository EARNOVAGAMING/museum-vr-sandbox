import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { createXRStore, XR } from '@react-three/xr'
import Museum from './scene/Museum.jsx'

// One XR store for the app. store.enterVR() is wired to the button below; the
// <XR> provider makes the scene render into an immersive session when entered.
const store = createXRStore()

export default function App() {
  return (
    <>
      <div className="hint">
        <strong>Museum VR Sandbox</strong>
        <br />
        Desktop: drag to look, scroll to zoom.
        <br />
        Headset: tap “Enter VR”.
      </div>

      <Canvas
        shadows
        camera={{ position: [0, 1.6, 6], fov: 60 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#0b0b0f']} />
        <XR store={store}>
          <Museum />
          {/* OrbitControls is desktop-only; it is inert inside an XR session. */}
          <OrbitControls
            target={[0, 1.4, 0]}
            maxPolarAngle={Math.PI / 2}
            enablePan={false}
          />
          <Environment preset="apartment" />
        </XR>
      </Canvas>

      <button className="vr-button" onClick={() => store.enterVR()}>
        Enter VR
      </button>
    </>
  )
}
