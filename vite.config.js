import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// WebXR requires a secure context. localhost counts as secure, so `npm run dev`
// works for desktop preview. To enter VR from a real headset you need HTTPS on
// your LAN — run `npm run dev -- --host` and put it behind an HTTPS tunnel
// (e.g. cloudflared / ngrok), or add a local cert. See README.
export default defineConfig({
  plugins: [react()],
  // Served from a GitHub Pages project site at /museum-vr-sandbox/, so assets
  // must resolve under that base. (Harmless for local dev.)
  base: '/museum-vr-sandbox/',
  server: {
    host: true,
  },
})
