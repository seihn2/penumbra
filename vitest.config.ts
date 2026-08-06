import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer/src'),
      '@': resolve('src/renderer/src')
    }
  },
  test: {
    environment: 'node',
    setupFiles: ['test/setup-navigator.ts'],
    include: ['test/**/*.{test,spec}.ts', 'src/**/*.{test,spec}.ts'],
    globals: false
  }
})
