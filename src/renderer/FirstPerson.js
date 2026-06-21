import * as THREE from 'three'
import { ctl, attachKeyboard } from '../controls/firstPerson.js'
import { pointInFootprint } from '../data/museumMapScene.js'
import { LAYOUT_SCALE } from '../data/museumMapModel.js'

const EYE   = 1.65
const S     = LAYOUT_SCALE
const RAD   = 0.22   // clearance from wall (plan units)
const CLIMB = 1.0    // stair transition seconds
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

function distToSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az
  const l2 = dx * dx + dz * dz
  let t = l2 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0
  t = clamp(t, 0, 1)
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz))
}

export class FirstPerson {
  constructor(camera, canvas, floors = [], triggers = [], speed = 6) {
    this.camera = camera
    this.canvas = canvas
    this.floors   = floors
    this.triggers = triggers
    this.speed    = speed
    this.enabled = false

    this.yaw   = Math.PI
    this.pitch = 0
    this.lookId = null
    this.last   = null
    this.floorIdx = 0
    this.anim     = null
    this.cool     = 0

    this._onDown   = this._onDown.bind(this)
    this._onMove   = this._onMove.bind(this)
    this._onUp     = this._onUp.bind(this)
    this._detachKb = attachKeyboard()

    canvas.addEventListener('pointerdown',   this._onDown)
    canvas.addEventListener('pointermove',   this._onMove)
    canvas.addEventListener('pointerup',     this._onUp)
    canvas.addEventListener('pointercancel', this._onUp)

    // Spawn on floor 0 immediately
    this.jumpToFloor(0)
  }

  jumpToFloor(i) {
    const f = this.floors[i]
    if (!f) return
    this.floorIdx = i
    this.camera.position.set(f.spawn[0], f.floorY + EYE, f.spawn[1])
    this.anim = null
    this.cool = 1
  }

  update(dt) {
    if (!this.enabled || dt <= 0) return

    this.camera.rotation.order = 'YXZ'
    this.camera.rotation.y = this.yaw
    this.camera.rotation.x = this.pitch

    // Stair animation
    if (this.anim) {
      const a = this.anim
      a.t = Math.min(1, a.t + dt / CLIMB)
      const e = a.t * a.t * (3 - 2 * a.t)
      this.camera.position.x = a.fromX + (a.toX - a.fromX) * e
      this.camera.position.z = a.fromZ + (a.toZ - a.fromZ) * e
      this.camera.position.y = a.fromY + (a.toY - a.fromY) * e
      if (a.t >= 1) { this.floorIdx = a.target; this.anim = null; this.cool = 1.3 }
      return
    }

    const fi = this.floorIdx
    const f  = this.floors[fi]
    if (!f) return
    const baseY = f.floorY + EYE

    const fwd = clamp(ctl.keyF + ctl.joyF, -1, 1)
    const str = clamp(ctl.keyS + ctl.joyS, -1, 1)
    if (fwd || str) {
      const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw)
      const dx = fwd * -sin + str * cos
      const dz = fwd * -cos + str * -sin
      const len = Math.hypot(dx, dz) || 1
      const sx = (dx / len) * this.speed * dt
      const sz = (dz / len) * this.speed * dt
      const px = this.camera.position.x, pz = this.camera.position.z
      if (this._free(fi, px + sx, pz + sz)) { this.camera.position.x = px + sx; this.camera.position.z = pz + sz }
      else if (this._free(fi, px + sx, pz)) { this.camera.position.x = px + sx }
      else if (this._free(fi, px, pz + sz)) { this.camera.position.z = pz + sz }
    }
    this.camera.position.y = baseY

    // Trigger zones — walk into the glowing patch to jump floors
    if (this.cool > 0) { this.cool -= dt; return }
    const cx = this.camera.position.x, cz = this.camera.position.z
    for (const t of this.triggers) {
      if (t.onFloor !== fi) continue
      const b = t.box
      if (cx >= b.minX && cx <= b.maxX && cz >= b.minZ && cz <= b.maxZ) {
        this.jumpToFloor(t.toFloor)
        break
      }
    }
  }

  dispose() {
    this.canvas.removeEventListener('pointerdown',   this._onDown)
    this.canvas.removeEventListener('pointermove',   this._onMove)
    this.canvas.removeEventListener('pointerup',     this._onUp)
    this.canvas.removeEventListener('pointercancel', this._onUp)
    this._detachKb()
  }

  // ── private ──

  _free(fi, wx, wz) {
    const f = this.floors[fi]
    if (!f) return true
    const px = wx / S, pz = wz / S
    if (f.footprint?.length >= 3 && !pointInFootprint(f.footprint, px, pz)) return false
    for (const s of (f.walls || [])) {
      if (distToSeg(px, pz, s.a.x, s.a.z, s.b.x, s.b.z) < RAD) return false
    }
    return true
  }

  _onDown(e) {
    if (this.lookId !== null) return
    this.lookId = e.pointerId
    this.last = { x: e.clientX, y: e.clientY }
    try { this.canvas.setPointerCapture(e.pointerId) } catch { /* */ }
  }

  _onMove(e) {
    if (e.pointerId !== this.lookId || !this.last) return
    this.yaw   -= (e.clientX - this.last.x) * 0.0035
    this.pitch  = clamp(this.pitch - (e.clientY - this.last.y) * 0.0035, -1.1, 1.1)
    this.last = { x: e.clientX, y: e.clientY }
  }

  _onUp(e) {
    if (e.pointerId !== this.lookId) return
    this.lookId = null; this.last = null
    try { this.canvas.releasePointerCapture(e.pointerId) } catch { /* */ }
  }
}
