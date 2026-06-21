import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { buildMuseum, getFloors, getTriggers } from './Museum.js'
import { FirstPerson } from './FirstPerson.js'

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas

    // ── Renderer ────────────────────────────────────────────────────────────
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.8
    this.renderer.xr.enabled = true

    // ── Scene ───────────────────────────────────────────────────────────────
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('#2a2520')

    // ── Camera ──────────────────────────────────────────────────────────────
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200)
    this.camera.position.set(2, 8, 10)

    // ── Museum geometry ─────────────────────────────────────────────────────
    this.scene.add(buildMuseum())
    this.floors = getFloors()

    // ── Orbit (overview mode) ────────────────────────────────────────────────
    this.orbit = new OrbitControls(this.camera, canvas)
    this.orbit.target.set(0, 1, 0)
    this.orbit.maxPolarAngle = Math.PI / 2.02
    this.orbit.minDistance = 4
    this.orbit.maxDistance = 70
    this.orbit.enableDamping = true
    this.orbit.dampingFactor = 0.08
    this.orbit.enabled = false

    // ── First-person ────────────────────────────────────────────────────────
    this.fp = new FirstPerson(this.camera, canvas, this.floors, getTriggers())
    this.fp.enabled = true

    // ── VR controllers (simple pointer ray in VR) ────────────────────────────
    this._setupXRControllers()

    // ── Mode state ──────────────────────────────────────────────────────────
    this.mode = 'walk'

    // ── Resize ──────────────────────────────────────────────────────────────
    this._onResize = this._onResize.bind(this)
    window.addEventListener('resize', this._onResize)
    this._onResize()

    // ── Clock + animation loop ───────────────────────────────────────────────
    this.clock = new THREE.Clock()
    this.renderer.setAnimationLoop(this._tick.bind(this))
  }

  // ── Public API (called from React UI) ─────────────────────────────────────

  setMode(mode) {
    this.mode = mode
    const isWalk = mode === 'walk'
    this.orbit.enabled = !isWalk
    this.fp.enabled = isWalk
    if (!isWalk) {
      this.camera.position.set(2, 8, 10)
      this.orbit.target.set(0, 1, 0)
      this.orbit.update()
    }
  }

  jumpToFloor(i) {
    this.fp.jumpToFloor(i)
  }

  getFloors() { return this.floors }

  async enterVR() {
    if (!navigator.xr) {
      alert('WebXR not available in this browser.')
      return
    }
    const supported = await navigator.xr.isSessionSupported('immersive-vr').catch(() => false)
    if (!supported) {
      alert('Immersive VR not supported on this device.')
      return
    }
    try {
      const session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
      })
      await this.renderer.xr.setSession(session)
    } catch (e) {
      console.warn('VR session failed:', e)
    }
  }

  dispose() {
    window.removeEventListener('resize', this._onResize)
    this.renderer.setAnimationLoop(null)
    this.fp.dispose()
    this.orbit.dispose()
    this.renderer.dispose()
  }

  // ── Private ────────────────────────────────────────────────────────────────

  _setupXRControllers() {
    // Simple ray pointer for each VR controller
    const lineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ])
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.5, transparent: true })

    for (let i = 0; i < 2; i++) {
      const ctrl = this.renderer.xr.getController(i)
      const line = new THREE.Line(lineGeom.clone(), lineMat)
      line.scale.z = 2
      ctrl.add(line)
      this.scene.add(ctrl)
    }
  }

  _onResize() {
    const w = window.innerWidth, h = window.innerHeight
    this.renderer.setSize(w, h)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  _tick() {
    const dt = Math.min(this.clock.getDelta(), 0.1)
    if (this.mode === 'overview') {
      this.orbit.update()
    } else {
      this.fp.update(dt)
    }
    this.renderer.render(this.scene, this.camera)
  }
}
