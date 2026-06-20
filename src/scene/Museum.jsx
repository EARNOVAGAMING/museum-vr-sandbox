import { Text } from '@react-three/drei'
import Artwork from './Artwork.jsx'

// A single enclosed gallery — 16m x 12m, 5m tall — styled like a real museum
// hall: stone floor, off-white walls, recessed ceiling lights, gilded exhibits
// with placards, and marble pedestals with sculptures. Still minimal/additive,
// but reads as a gallery rather than coloured boxes.
const W = 16          // x extent
const D = 12          // z extent (depth)
const H = 5           // height
const HX = W / 2
const HZ = D / 2

function Shell() {
  const wall = { color: '#ece8e0', roughness: 0.96, metalness: 0 }
  return (
    <group>
      {/* floor — polished stone */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#4a4750" roughness={0.25} metalness={0.15} />
      </mesh>
      {/* a runner of lighter inlay down the centre */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <planeGeometry args={[2.2, D - 1]} />
        <meshStandardMaterial color="#6d6a73" roughness={0.3} metalness={0.1} />
      </mesh>
      {/* ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#d7d2c8" roughness={1} />
      </mesh>
      {/* walls */}
      <mesh position={[0, H / 2, -HZ]} receiveShadow>
        <planeGeometry args={[W, H]} /><meshStandardMaterial {...wall} />
      </mesh>
      <mesh position={[0, H / 2, HZ]} rotation={[0, Math.PI, 0]} receiveShadow>
        <planeGeometry args={[W, H]} /><meshStandardMaterial {...wall} />
      </mesh>
      <mesh position={[-HX, H / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[D, H]} /><meshStandardMaterial {...wall} />
      </mesh>
      <mesh position={[HX, H / 2, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[D, H]} /><meshStandardMaterial {...wall} />
      </mesh>
      {/* skirting + crown lines for a built interior feel */}
      {[-HZ + 0.01, HZ - 0.01].map((z, i) => (
        <mesh key={`sk${i}`} position={[0, 0.08, z]}>
          <boxGeometry args={[W, 0.16, 0.04]} />
          <meshStandardMaterial color="#cfc9bd" />
        </mesh>
      ))}
    </group>
  )
}

function CeilingLights() {
  // Recessed downlights in a grid — both visible fixtures and point lights.
  const xs = [-5, 0, 5]
  const zs = [-3.5, 0, 3.5]
  return (
    <group>
      {xs.map((x) =>
        zs.map((z) => (
          <group key={`${x}_${z}`} position={[x, H - 0.02, z]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.22, 24]} />
              <meshStandardMaterial color="#fff6e2" emissive="#fff1cf" emissiveIntensity={1.4} />
            </mesh>
            <pointLight position={[0, -0.3, 0]} intensity={3.5} distance={9} decay={2} color="#fff3da" />
          </group>
        )),
      )}
    </group>
  )
}

function Pedestal({ position, color, title }) {
  return (
    <group position={position}>
      {/* marble plinth */}
      <mesh castShadow receiveShadow position={[0, 0.55, 0]}>
        <boxGeometry args={[0.7, 1.1, 0.7]} />
        <meshStandardMaterial color="#e8e3d6" roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh position={[0, 1.12, 0]}>
        <boxGeometry args={[0.82, 0.06, 0.82]} />
        <meshStandardMaterial color="#d8d2c2" roughness={0.5} />
      </mesh>
      {/* sculpture */}
      <mesh castShadow position={[0, 1.42, 0]}>
        <torusKnotGeometry args={[0.18, 0.06, 120, 16]} />
        <meshStandardMaterial color={color} roughness={0.2} metalness={0.6} />
      </mesh>
      <spotLight position={[0, 3, 0]} angle={0.5} penumbra={0.6} intensity={6} distance={4} castShadow />
      <Text position={[0, 1.18, 0.42]} rotation={[-Math.PI / 6, 0, 0]} fontSize={0.05} color="#3a3630" anchorX="center" anchorY="middle">
        {title}
      </Text>
    </group>
  )
}

export default function Museum() {
  const eye = 1.65
  return (
    <group>
      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#fff4e0', '#3a3640', 0.5]} />
      <directionalLight position={[4, 8, 4]} intensity={0.5} castShadow />
      <Shell />
      <CeilingLights />

      {/* Hall title on the back wall */}
      <Text position={[0, 3.6, -HZ + 0.05]} fontSize={0.5} color="#b8902f" anchorX="center" anchorY="middle" letterSpacing={0.08}>
        ASIAN OPERATIC MUSEUM
      </Text>
      <Text position={[0, 3.1, -HZ + 0.05]} fontSize={0.16} color="#8a857b" anchorX="center" anchorY="middle" letterSpacing={0.3}>
        VR GALLERY · PREVIEW
      </Text>

      {/* Back wall exhibits */}
      <Artwork position={[-4.6, eye, -HZ + 0.07]} color="#b23a48" title="Crimson Aria" subtitle="Silk & pigment" />
      <Artwork position={[-1.6, eye, -HZ + 0.07]} size={[1.7, 1.15]} color="#2f6f8f" title="Night Procession" subtitle="Lacquer panel" />
      <Artwork position={[1.6, eye, -HZ + 0.07]} size={[1.7, 1.15]} color="#3f7d4a" title="Jade Ensemble" subtitle="Mixed media" />
      <Artwork position={[4.6, eye, -HZ + 0.07]} color="#caa64a" title="Golden Mask" subtitle="Gilt relief" />

      {/* Left wall */}
      <Artwork position={[-HX + 0.07, eye, -2.6]} rotation={[0, Math.PI / 2, 0]} color="#8a4ac2" title="Phoenix Robe" subtitle="Embroidery" />
      <Artwork position={[-HX + 0.07, eye, 2.6]} rotation={[0, Math.PI / 2, 0]} color="#c24a93" title="Lotus Stage" subtitle="Woodcut" />

      {/* Right wall */}
      <Artwork position={[HX - 0.07, eye, -2.6]} rotation={[0, -Math.PI / 2, 0]} color="#4ac2b1" title="Bamboo Score" subtitle="Ink on paper" />
      <Artwork position={[HX - 0.07, eye, 2.6]} rotation={[0, -Math.PI / 2, 0]} color="#d2792f" title="Dawn Overture" subtitle="Oil study" />

      {/* Centre pedestals */}
      <Pedestal position={[-2.6, 0, 0]} color="#f5d77a" title="Mask of Sang Nila" />
      <Pedestal position={[0, 0, 1.5]} color="#7ad7f5" title="Resonance I" />
      <Pedestal position={[2.6, 0, 0]} color="#f59ec0" title="Resonance II" />
    </group>
  )
}
