import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { resolveVersionHash } from '../../build/resolveVersionHash'

export default defineConfig({
  define: {
    __APP_VERSION_HASH__: JSON.stringify(resolveVersionHash())
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
})
