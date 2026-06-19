import Artwork from './Artwork.jsx'

// A single enclosed gallery room (10m x 10m, 4m tall) with framed artworks on
// the walls and a couple of pedestals in the middle. Deliberately minimal —
// this is the testing sandbox shell; swap in real geometry/assets over time.
const ROOM = 10 // floor is ROOM x ROOM
const HEIGHT = 4
const HALF = ROOM / 2

function Walls() {
  const wallMat = { color: '#e9e6df', roughness: 0.95, metalness: 0 }
  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM, ROOM]} />
        <meshStandardMaterial color="#6b6258" roughness={0.8} />
      </mesh>
      {/* ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, HEIGHT, 0]}>
        <planeGeometry args={[ROOM, ROOM]} />
        <meshStandardMaterial color="#cfcabf" roughness={1} />
      </mesh>
      {/* back wall */}
      <mesh position={[0, HEIGHT / 2, -HALF]} receiveShadow>
        <planeGeometry args={[ROOM, HEIGHT]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>
      {/* front wall */}
      <mesh position={[0, HEIGHT / 2, HALF]} rotation={[0, Math.PI, 0]} receiveShadow>
        <planeGeometry args={[ROOM, HEIGHT]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>
      {/* left wall */}
      <mesh position={[-HALF, HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM, HEIGHT]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>
      {/* right wall */}
      <mesh position={[HALF, HEIGHT / 2, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM, HEIGHT]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>
    </group>
  )
}

function Pedestal({ position, color }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[0.6, 1, 0.6]} />
        <meshStandardMaterial color="#d8d2c4" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 1.25, 0]}>
        <icosahedronGeometry args={[0.28, 0]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.4} />
      </mesh>
    </group>
  )
}

export default function Museum() {
  const eye = 1.6 // hang artworks near standing eye level
  return (
    <group>
      {/* ambient + key fill so the room reads even before picture lights */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 6, 4]} intensity={0.7} castShadow />

      <Walls />

      {/* back wall */}
      <Artwork position={[-2.6, eye, -HALF + 0.06]} color="#c25b4a" />
      <Artwork position={[0, eye, -HALF + 0.06]} color="#4a7ec2" size={[1.6, 1.1]} />
      <Artwork position={[2.6, eye, -HALF + 0.06]} color="#6aa84f" />

      {/* left wall (rotated to face into the room) */}
      <Artwork position={[-HALF + 0.06, eye, -1.8]} rotation={[0, Math.PI / 2, 0]} color="#caa64a" />
      <Artwork position={[-HALF + 0.06, eye, 1.8]} rotation={[0, Math.PI / 2, 0]} color="#8a4ac2" />

      {/* right wall */}
      <Artwork position={[HALF - 0.06, eye, -1.8]} rotation={[0, -Math.PI / 2, 0]} color="#4ac2b1" />
      <Artwork position={[HALF - 0.06, eye, 1.8]} rotation={[0, -Math.PI / 2, 0]} color="#c24a93" />

      {/* centre pieces */}
      <Pedestal position={[-1.4, 0, 0]} color="#f5d77a" />
      <Pedestal position={[1.4, 0, 0]} color="#7ad7f5" />
    </group>
  )
}
