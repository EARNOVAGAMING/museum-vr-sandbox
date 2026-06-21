import * as THREE from 'three'

// Procedural textures drawn on an offscreen canvas — no image files to ship, so
// they load instantly on GitHub Pages. Each returns a repeating CanvasTexture.
function make(w, h, draw) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 4
  return t
}

const rnd = (a, b) => a + Math.random() * (b - a)

// Warm wood planks with grain.
export function woodTexture() {
  return make(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#6a4326'
    ctx.fillRect(0, 0, w, h)
    const planks = 6
    const pw = w / planks
    for (let i = 0; i < planks; i++) {
      const shade = rnd(-18, 18)
      ctx.fillStyle = `rgb(${106 + shade}, ${67 + shade * 0.7}, ${38 + shade * 0.5})`
      ctx.fillRect(i * pw, 0, pw - 2, h)
      // grain lines
      ctx.strokeStyle = 'rgba(40,24,12,0.25)'
      ctx.lineWidth = 1
      for (let g = 0; g < 10; g++) {
        ctx.beginPath()
        const x = i * pw + rnd(2, pw - 2)
        ctx.moveTo(x, 0)
        ctx.bezierCurveTo(x + rnd(-6, 6), h * 0.33, x + rnd(-6, 6), h * 0.66, x + rnd(-4, 4), h)
        ctx.stroke()
      }
    }
    // plank gaps
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    for (let i = 0; i <= planks; i++) ctx.fillRect(i * pw - 1, 0, 2, h)
  })
}

// Subtle plaster wall noise.
export function plasterTexture(base = '#262229') {
  return make(256, 256, (ctx, w, h) => {
    ctx.fillStyle = base
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 2600; i++) {
      const a = rnd(0, 0.06)
      ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`
      ctx.fillRect(rnd(0, w), rnd(0, h), 2, 2)
    }
  })
}

// Dark rough rock/cave stone — grey-brown with cracks and variation.
export function rockTexture() {
  return make(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#2a2520'
    ctx.fillRect(0, 0, w, h)
    // large stone blocks
    for (let bx = 0; bx < 4; bx++) {
      for (let by = 0; by < 4; by++) {
        const bw = w / 4, bh = h / 4
        const shade = rnd(-14, 14)
        ctx.fillStyle = `rgb(${42 + shade},${37 + shade * 0.8},${32 + shade * 0.6})`
        ctx.fillRect(bx * bw + 1, by * bh + 1, bw - 2, bh - 2)
      }
    }
    // crack / grain noise
    for (let i = 0; i < 1800; i++) {
      const a = rnd(0, 0.12)
      ctx.fillStyle = `rgba(0,0,0,${a})`
      ctx.fillRect(rnd(0, w), rnd(0, h), rnd(1, 3), rnd(1, 3))
    }
    // light speckles (mineral glint)
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = `rgba(200,190,170,${rnd(0.04, 0.12)})`
      ctx.fillRect(rnd(0, w), rnd(0, h), 1, 1)
    }
    // mortar lines
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'
    ctx.lineWidth = 2
    for (let i = 1; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(i * w / 4, 0); ctx.lineTo(i * w / 4, h); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, i * h / 4); ctx.lineTo(w, i * h / 4); ctx.stroke()
    }
  })
}

// Light marble with grey veins.
export function marbleTexture() {
  return make(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#ece7db'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = 'rgba(120,116,108,0.5)'
    for (let v = 0; v < 7; v++) {
      ctx.lineWidth = rnd(0.5, 2)
      ctx.beginPath()
      let x = rnd(0, w), y = 0
      ctx.moveTo(x, y)
      while (y < h) { x += rnd(-22, 22); y += rnd(14, 30); ctx.lineTo(x, y) }
      ctx.stroke()
    }
  })
}
