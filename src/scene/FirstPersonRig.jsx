import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { ctl, attachKeyboard } from '../controls/firstPerson'
import { pointInFootprint } from '../data/museumMapScene'
import { LAYOUT_SCALE } from '../data/museumMapModel'

const EYE = 1.65
const S = LAYOUT_SCALE
const RAD = 0.2 // player clearance from walls (plan units)
const CLIMB = 1.0 // seconds for a stair transition
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

function distToSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az
  const l2 = dx * dx + dz * dz
  let t = l2 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz))
}

// Multi-floor first-person walk. Walk into a staircase trigger and you ride up
// (or down) to the linked floor; collision uses the current floor's walls.
// `requestFloor` + `requestNonce` let the L1/L2 buttons jump you directly.
export default function FirstPersonRig({ floors = [], triggers = [], requestFloor = 0, requestNonce = 0, speed = 6 }) {
  const { camera, gl } = useThree()
  const yaw = useRef(Math.PI)
  const pitch = useRef(0)
  const lookId = useRef(null)
  const last = useRef(null)
  const floorIdx = useRef(0)
  const anim = useRef(null)
  const cool = useRef(0)

  // direct jump (buttons) — also the initial spawn (nonce starts at 0)
  useEffect(() => {
    const f = floors[requestFloor]
    if (!f) return
    floorIdx.current = requestFloor
    camera.position.set(f.spawn[0], f.floorY + EYE, f.spawn[1])
    anim.current = null
    cool.current = 1
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestNonce])

  // look (own pointerId + capture so it never fights the joystick)
  useEffect(() => {
    const el = gl.domElement
    const onDown = (e) => { if (lookId.current !== null) return; lookId.current = e.pointerId; last.current = { x: e.clientX, y: e.clientY }; try { el.setPointerCapture(e.pointerId) } catch { /* */ } }
    const onMove = (e) => {
      if (e.pointerId !== lookId.current || !last.current) return
      yaw.current -= (e.clientX - last.current.x) * 0.0035
      pitch.current = clamp(pitch.current - (e.clientY - last.current.y) * 0.0035, -1.1, 1.1)
      last.current = { x: e.clientX, y: e.clientY }
    }
    const onUp = (e) => { if (e.pointerId !== lookId.current) return; lookId.current = null; last.current = null; try { el.releasePointerCapture(e.pointerId) } catch { /* */ } }
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

  const free = (fi, wx, wz) => {
    const f = floors[fi]
    if (!f) return true
    const px = wx / S, pz = wz / S
    if (f.footprint && f.footprint.length >= 3 && !pointInFootprint(f.footprint, px, pz)) return false
    const ws = f.walls || []
    for (let i = 0; i < ws.length; i++) {
      const s = ws[i]
      if (distToSeg(px, pz, s.a.x, s.a.z, s.b.x, s.b.z) < RAD) return false
    }
    return true
  }

  useFrame((_, dt) => {
    camera.rotation.order = 'YXZ'
    camera.rotation.y = yaw.current
    camera.rotation.x = pitch.current

    // stair transition in progress — ride the lift, ignore input
    if (anim.current) {
      const a = anim.current
      a.t = Math.min(1, a.t + dt / CLIMB)
      const e = a.t * a.t * (3 - 2 * a.t)
      camera.position.x = a.fromX + (a.toX - a.fromX) * e
      camera.position.z = a.fromZ + (a.toZ - a.fromZ) * e
      camera.position.y = a.fromY + (a.toY - a.fromY) * e
      if (a.t >= 1) { floorIdx.current = a.target; anim.current = null; cool.current = 1.3 }
      return
    }

    const fi = floorIdx.current
    const f = floors[fi]
    if (!f) return
    const baseY = f.floorY + EYE

    const fwd = clamp(ctl.keyF + ctl.joyF, -1, 1)
    const str = clamp(ctl.keyS + ctl.joyS, -1, 1)
    if (fwd || str) {
      const sin = Math.sin(yaw.current), cos = Math.cos(yaw.current)
      const dx = fwd * -sin + str * cos
      const dz = fwd * -cos + str * -sin
      const len = Math.hypot(dx, dz) || 1
      const sx = (dx / len) * speed * dt
      const sz = (dz / len) * speed * dt
      const px = camera.position.x, pz = camera.position.z
      if (free(fi, px + sx, pz + sz)) { camera.position.x = px + sx; camera.position.z = pz + sz }
      else if (free(fi, px + sx, pz)) { camera.position.x = px + sx }
      else if (free(fi, px, pz + sz)) { camera.position.z = pz + sz }
    }
    camera.position.y = baseY

    // stair triggers
    if (cool.current > 0) { cool.current -= dt; return }
    const x = camera.position.x, z = camera.position.z
    for (const t of triggers) {
      if (t.onFloor !== fi) continue
      if (x >= t.box.minX && x <= t.box.maxX && z >= t.box.minZ && z <= t.box.maxZ) {
        const tf = floors[t.toFloor]
        if (!tf) continue
        anim.current = { fromX: x, fromZ: z, fromY: baseY, toX: t.arrive[0], toZ: t.arrive[1], toY: tf.floorY + EYE, t: 0, target: t.toFloor }
        break
      }
    }
  })

  return null
}
