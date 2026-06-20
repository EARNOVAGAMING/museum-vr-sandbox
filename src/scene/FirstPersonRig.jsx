import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ctl, attachKeyboard } from '../controls/firstPerson'

const EYE = 1.65
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// First-person walk: drag anywhere to look (mouse + touch), WASD / on-screen
// joystick to move at eye height on the current floor. No collision yet — free
// XZ movement, fixed height — so you can preview the space as a visitor.
export default function FirstPersonRig({ floorY = 0, spawn = [0, 0], speed = 7 }) {
  const { camera, gl } = useThree()
  const yaw = useRef(Math.PI)
  const pitch = useRef(0)

  // Reposition on floor change.
  useEffect(() => {
    camera.position.set(spawn[0], floorY + EYE, spawn[1])
  }, [camera, floorY, spawn])

  useEffect(() => {
    const detachK = attachKeyboard()
    const el = gl.domElement
    let last = null
    const pt = (e) => ({ x: e.clientX ?? e.touches?.[0]?.clientX ?? 0, y: e.clientY ?? e.touches?.[0]?.clientY ?? 0 })
    const onDown = (e) => { last = pt(e) }
    const onMove = (e) => {
      if (!last) return
      const p = pt(e)
      yaw.current -= (p.x - last.x) * 0.004
      pitch.current = clamp(pitch.current - (p.y - last.y) * 0.004, -1.2, 1.2)
      last = p
    }
    const onUp = () => { last = null }
    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      detachK()
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [gl])

  useFrame((_, dt) => {
    camera.rotation.order = 'YXZ'
    camera.rotation.y = yaw.current
    camera.rotation.x = pitch.current

    const f = clamp(ctl.keyF + ctl.joyF, -1, 1)
    const s = clamp(ctl.keyS + ctl.joyS, -1, 1)
    if (f || s) {
      const sin = Math.sin(yaw.current)
      const cos = Math.cos(yaw.current)
      // forward = (-sin, 0, -cos), right = (cos, 0, -sin)
      const dx = f * -sin + s * cos
      const dz = f * -cos + s * -sin
      const len = Math.hypot(dx, dz) || 1
      camera.position.x += (dx / len) * speed * dt
      camera.position.z += (dz / len) * speed * dt
    }
    camera.position.y = floorY + EYE
  })

  return null
}
