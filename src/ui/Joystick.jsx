import { useEffect, useRef } from 'react'
import { ctl } from '../controls/firstPerson'

// On-screen joystick (bottom-left) for touch walking. Writes forward/strafe into
// the shared control state. The knob follows your finger within a radius; the
// normalised offset becomes the move vector. Releasing recentres + stops.
const R = 52 // max knob travel (px)

export default function Joystick() {
  const baseRef = useRef(null)
  const knobRef = useRef(null)
  const active = useRef(false)
  const origin = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const base = baseRef.current
    const knob = knobRef.current
    if (!base || !knob) return

    const center = () => {
      const r = base.getBoundingClientRect()
      origin.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    }
    const move = (cx, cy) => {
      let dx = cx - origin.current.x
      let dy = cy - origin.current.y
      const d = Math.hypot(dx, dy)
      if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R }
      knob.style.transform = `translate(${dx}px, ${dy}px)`
      ctl.joyS = dx / R          // right positive
      ctl.joyF = -dy / R         // up = forward
    }
    const start = (e) => { active.current = true; center(); const t = e.touches?.[0] || e; move(t.clientX, t.clientY); e.preventDefault() }
    const drag = (e) => { if (!active.current) return; const t = e.touches?.[0] || e; move(t.clientX, t.clientY); e.preventDefault() }
    const end = () => { active.current = false; knob.style.transform = 'translate(0,0)'; ctl.joyF = 0; ctl.joyS = 0 }

    base.addEventListener('touchstart', start, { passive: false })
    base.addEventListener('mousedown', start)
    window.addEventListener('touchmove', drag, { passive: false })
    window.addEventListener('mousemove', drag)
    window.addEventListener('touchend', end)
    window.addEventListener('mouseup', end)
    return () => {
      base.removeEventListener('touchstart', start)
      base.removeEventListener('mousedown', start)
      window.removeEventListener('touchmove', drag)
      window.removeEventListener('mousemove', drag)
      window.removeEventListener('touchend', end)
      window.removeEventListener('mouseup', end)
      ctl.joyF = 0; ctl.joyS = 0
    }
  }, [])

  return (
    <div ref={baseRef} className="joystick-base" aria-hidden="true">
      <div ref={knobRef} className="joystick-knob" />
    </div>
  )
}
