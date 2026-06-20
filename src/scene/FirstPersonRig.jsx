import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { ctl, attachKeyboard } from '../controls/firstPerson'
import { pointInFootprint } from '../data/museumMapScene'
import { LAYOUT_SCALE } from '../data/museumMapModel'

const EYE = 1.65
const S = LAYOUT_SCALE
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// First-person walk. LOOK = drag a finger on the 3D view (tracked by its own
// pointerId + pointer capture, so it never fights the joystick — you can look
// and walk at the same time). MOVE = the joystick / WASD. Collision keeps you
// inside the level footprint (you can't leave the building).
export default function FirstPersonRig({ floorY = 0, spawn = [0, 0], footprint = [], speed = 6 }) {
  const { camera, gl } = useThree()
  const yaw = useRef(Math.PI)
  const pitch = useRef(0)
  const lookId = useRef(null)
  const last = useRef(null)

  useEffect(() => {
    camera.position.set(spawn[0], floorY + EYE, spawn[1])
  }, [camera, floorY, spawn])

  useEffect(() => {
    const el = gl.domElement
    const onDown = (e) => {
      if (lookId.current !== null) return
      lookId.current = e.pointerId
      last.current = { x: e.clientX, y: e.clientY }
      try { el.setPointerCapture(e.pointerId) } catch { /* ignore */ }
    }
    const onMove = (e) => {
      if (e.pointerId !== lookId.current || !last.current) return
      yaw.current -= (e.clientX - last.current.x) * 0.0035
      pitch.current = clamp(pitch.current - (e.clientY - last.current.y) * 0.0035, -1.1, 1.1)
      last.current = { x: e.clientX, y: e.clientY }
    }
    const onUp = (e) => {
      if (e.pointerId !== lookId.current) return
      lookId.current = null
      last.current = null
      try { el.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
    }
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    const detachK = attachKeyboard()
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      detachK()
    }
  }, [gl])

  const inside = (wx, wz) => {
    if (!footprint || footprint.length < 3) return true
    return pointInFootprint(footprint, wx / S, wz / S)
  }

  useFrame((_, dt) => {
    camera.rotation.order = 'YXZ'
    camera.rotation.y = yaw.current
    camera.rotation.x = pitch.current

    const f = clamp(ctl.keyF + ctl.joyF, -1, 1)
    const s = clamp(ctl.keyS + ctl.joyS, -1, 1)
    if (f || s) {
      const sin = Math.sin(yaw.current)
      const cos = Math.cos(yaw.current)
      let dx = f * -sin + s * cos
      let dz = f * -cos + s * -sin
      const len = Math.hypot(dx, dz) || 1
      const stepX = (dx / len) * speed * dt
      const stepZ = (dz / len) * speed * dt
      const px = camera.position.x
      const pz = camera.position.z
      // wall-slide against the footprint outline
      if (inside(px + stepX, pz + stepZ)) {
        camera.position.x = px + stepX
        camera.position.z = pz + stepZ
      } else if (inside(px + stepX, pz)) {
        camera.position.x = px + stepX
      } else if (inside(px, pz + stepZ)) {
        camera.position.z = pz + stepZ
      }
    }
    camera.position.y = floorY + EYE
  })

  return null
}
