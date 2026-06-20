import { Text } from '@react-three/drei'

// A framed exhibit: a coloured canvas in a gilded frame with a small wall
// placard (title + subtitle) beneath it, and a spotlight washing the piece.
// Swap the flat colour for a texture/map to show a real artwork later.
export default function Artwork({
  position = [0, 1.6, 0],
  rotation = [0, 0, 0],
  size = [1.4, 1.0],
  color = '#c25b4a',
  title = 'Untitled',
  subtitle = '',
}) {
  const [w, h] = size
  const depth = 0.07
  const border = 0.1

  return (
    <group position={position} rotation={rotation}>
      {/* gilded frame */}
      <mesh castShadow position={[0, 0, -depth / 2]}>
        <boxGeometry args={[w + border, h + border, depth]} />
        <meshStandardMaterial color="#b8902f" roughness={0.35} metalness={0.85} />
      </mesh>
      {/* inner mat */}
      <mesh position={[0, 0, 0.001]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color="#efe9dc" roughness={0.95} />
      </mesh>
      {/* canvas */}
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[w - 0.12, h - 0.12]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>

      {/* picture light */}
      <spotLight
        position={[0, h / 2 + 0.45, 0.7]}
        target-position={[0, 0, 0]}
        angle={0.6}
        penumbra={0.6}
        intensity={9}
        distance={5}
        color="#fff4e0"
        castShadow
      />

      {/* wall placard */}
      <group position={[0, -h / 2 - 0.28, 0.03]}>
        <mesh>
          <planeGeometry args={[Math.min(w, 1.0), 0.22]} />
          <meshStandardMaterial color="#1c1c22" roughness={0.6} />
        </mesh>
        <Text position={[0, 0.03, 0.01]} fontSize={0.06} color="#f5d77a" anchorX="center" anchorY="middle" maxWidth={0.9}>
          {title}
        </Text>
        {subtitle ? (
          <Text position={[0, -0.05, 0.01]} fontSize={0.038} color="#cfc8b8" anchorX="center" anchorY="middle" maxWidth={0.9}>
            {subtitle}
          </Text>
        ) : null}
      </group>
    </group>
  )
}
