# museum-vr-sandbox

Independent **WebXR museum VR** sandbox for testing — not wired to the main
SCAVerse/AOM app. A clean place to prototype VR galleries.

## Stack
- Vite + React
- [`@react-three/fiber`](https://github.com/pmndrs/react-three-fiber) (three.js)
- [`@react-three/xr`](https://github.com/pmndrs/xr) (WebXR / Quest)
- [`@react-three/drei`](https://github.com/pmndrs/drei) (helpers)

## Run it
```bash
npm install
npm run dev
```
Open the printed `localhost` URL.
- **Desktop:** drag to look, scroll to zoom (orbit preview).
- **Headset:** click **Enter VR**.

## Entering VR from a real headset
WebXR needs a **secure context**. `localhost` is secure, so desktop preview
just works. A Quest/standalone headset on your LAN needs **HTTPS**:

```bash
npm run dev -- --host          # serve on your LAN IP
```
then expose it over HTTPS (e.g. `cloudflared tunnel`, `ngrok http`, or a local
cert) and open that HTTPS URL in the headset browser.

## Layout
```
src/
  main.jsx          React entry
  App.jsx           Canvas + XR store + Enter VR button
  scene/
    Museum.jsx      enclosed gallery room (walls/floor/ceiling, lights, pedestals)
    Artwork.jsx     framed placeholder exhibit (swap colour for a texture later)
  styles.css
```

## Next ideas
- VR locomotion (teleport / smooth move) via `@react-three/xr` controllers.
- Real exhibit textures/models on the `Artwork` frames and pedestals.
- Multiple rooms + doorways.
