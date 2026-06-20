import { useEffect, useRef } from 'react'
import { ctl } from '../controls/firstPerson'

// On-screen joystick (bottom-left). Pointer-capture based + its own pointerId,
// so it never interferes with the look-drag on the 3D view — you can hold the
// joystick AND drag to look at the same time.
const R = 50 // max knob travel (px)

export default function Joystick() {
  const baseRef = useRef(null)
  const knobRef = useRef(null)
  const pid = useRef(null)
  const origin = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const base = baseRef.current
    const knob = knobRef.current
    if (!base || !knob) return

    const move = (cx, cy) => {
      let dx = cx - origin.current.x
      let dy = cy - origin.current.y
      const d = Math.hypot(dx, dy)
      if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R }
      knob.style.transform = `translate(${dx}px, ${dy}px)`
      ctl.joyS = dx / R       // right positive
      ctl.joyF = -dy / R      // up = forward
    }
    const onDown = (e) => {
      if (pid.current !== null) return
      pid.current = e.pointerId
      const r = base.getBoundingClientRect()
      origin.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
      try { base.setPointerCapture(e.pointerId) } catch { /* ignore */ }
      move(e.clientX, e.clientY)
    }
    const onMove = (e) => { if (e.pointerId === pid.current) move(e.clientX, e.clientY) }
    const onUp = (e) => {
      if (e.pointerId !== pid.current) return
      pid.current = null
      knob.style.transform = 'translate(0,0)'
      ctl.joyF = 0
      ctl.joyS = 0
      try { base.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
    }
    base.addEventListener('pointerdown', onDown)
    base.addEventListener('pointermove', onMove)
    base.addEventListener('pointerup', onUp)
    base.addEventListener('pointercancel', onUp)
    return () => {
      base.removeEventListener('pointerdown', onDown)
      base.removeEventListener('pointermove', onMove)
      base.removeEventListener('pointerup', onUp)
      base.removeEventListener('pointercancel', onUp)
      ctl.joyF = 0
      ctl.joyS = 0
    }
  }, [])

  return (
    <div ref={baseRef} className="joystick-base" aria-hidden="true">
      <div ref={knobRef} className="joystick-knob" />
    </div>
  )
}
