import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The root index.html is the public landing page served by GitHub Pages, so the
// app has its own entry, app.html. The build emits it as dist/index.html,
// because that is the page Capacitor loads from webDir.
const APP_ENTRY = 'app.html'

const emitAppAsIndex = {
  name: 'emit-app-as-index',
  enforce: 'post',
  generateBundle(_, bundle) {
    const page = bundle[APP_ENTRY]
    if (page) page.fileName = 'index.html'
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), emitAppAsIndex],
  server: { open: `/${APP_ENTRY}` },
  build: {
    rollupOptions: { input: APP_ENTRY },
  },
})
