import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      constant: path.resolve(__dirname, 'constant'),
      engine: path.resolve(__dirname, 'engine'),
      store: path.resolve(__dirname, 'store'),
      components: path.resolve(__dirname, 'components'),
      styles: path.resolve(__dirname, 'styles'),
      types: path.resolve(__dirname, 'types')
    }
  },
  server: {
    port: 3000
  }
})
