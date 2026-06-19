import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// WebXR requires a secure context. localhost counts as secure, so `npm run dev`
// works for desktop preview. To enter VR from a real headset you need HTTPS on
// your LAN — run `npm run dev -- --host` and put it behind an HTTPS tunnel
// (e.g. cloudflared / ngrok), or add a local cert. See README.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
  },
})
