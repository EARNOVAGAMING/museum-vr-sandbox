// A framed placeholder artwork: a coloured canvas inside a thin frame, hung on a
// wall. Replace the flat colour with a texture/map later to show real exhibits.
export default function Artwork({
  position = [0, 1.6, 0],
  rotation = [0, 0, 0],
  size = [1.4, 1.0],
  color = '#c25b4a',
  frameColor = '#2b2118',
}) {
  const [w, h] = size
  const frameDepth = 0.06
  const border = 0.08

  return (
    <group position={position} rotation={rotation}>
      {/* frame */}
      <mesh castShadow position={[0, 0, -frameDepth / 2]}>
        <boxGeometry args={[w + border, h + border, frameDepth]} />
        <meshStandardMaterial color={frameColor} roughness={0.6} metalness={0.2} />
      </mesh>
      {/* canvas */}
      <mesh position={[0, 0, 0.001]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      {/* little picture light */}
      <spotLight
        position={[0, h / 2 + 0.5, 0.6]}
        target-position={[0, 0, 0]}
        angle={0.6}
        penumbra={0.5}
        intensity={6}
        distance={4}
        castShadow
      />
    </group>
  )
}
