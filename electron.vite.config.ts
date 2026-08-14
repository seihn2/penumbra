import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin(),
      viteStaticCopy({
        targets: [
          {
            src: 'src/main/prompts.md',
            dest: '.'
          },
          {
            src: 'node_modules/web-tree-sitter/web-tree-sitter.wasm',
            dest: 'grammars'
          },
          {
            src: 'node_modules/tree-sitter-typescript/tree-sitter-typescript.wasm',
            dest: 'grammars'
          },
          {
            src: 'node_modules/tree-sitter-typescript/tree-sitter-tsx.wasm',
            dest: 'grammars'
          },
          {
            src: 'node_modules/tree-sitter-javascript/tree-sitter-javascript.wasm',
            dest: 'grammars'
          },
          {
            src: 'node_modules/tree-sitter-python/tree-sitter-python.wasm',
            dest: 'grammars'
          },
          {
            src: 'node_modules/tree-sitter-go/tree-sitter-go.wasm',
            dest: 'grammars'
          },
          {
            src: 'node_modules/tree-sitter-java/tree-sitter-java.wasm',
            dest: 'grammars'
          },
          {
            src: 'node_modules/tree-sitter-rust/tree-sitter-rust.wasm',
            dest: 'grammars'
          }
        ]
      })
    ]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@': resolve('src/renderer/src')
      }
    },
    plugins: [react(), tailwindcss()]
  }
})
