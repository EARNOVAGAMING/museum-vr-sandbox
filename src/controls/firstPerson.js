// Shared first-person input state, written by the keyboard + on-screen joystick
// and read by the in-canvas rig each frame. forward/strafe are each in [-1, 1].
export const ctl = {
  keyF: 0, keyS: 0, // keyboard (WASD / arrows)
  joyF: 0, joyS: 0, // on-screen joystick
}

export function attachKeyboard() {
  const set = (code, v) => {
    if (code === 'KeyW' || code === 'ArrowUp') ctl.keyF = v
    else if (code === 'KeyS' || code === 'ArrowDown') ctl.keyF = -v
    else if (code === 'KeyD' || code === 'ArrowRight') ctl.keyS = v
    else if (code === 'KeyA' || code === 'ArrowLeft') ctl.keyS = -v
  }
  const down = (e) => set(e.code, 1)
  const up = (e) => {
    // releasing a key zeroes only its axis if no opposite is held
    if (['KeyW', 'ArrowUp', 'KeyS', 'ArrowDown'].includes(e.code)) ctl.keyF = 0
    if (['KeyA', 'ArrowLeft', 'KeyD', 'ArrowRight'].includes(e.code)) ctl.keyS = 0
  }
  window.addEventListener('keydown', down)
  window.addEventListener('keyup', up)
  return () => {
    window.removeEventListener('keydown', down)
    window.removeEventListener('keyup', up)
    ctl.keyF = ctl.keyS = 0
  }
}
