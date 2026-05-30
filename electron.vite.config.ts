import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

const resolvePath = (relativePath: string): string => fileURLToPath(new URL(relativePath, import.meta.url))

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: resolvePath('./electron/main/index.ts'),
        output: {
          format: 'cjs',
          entryFileNames: '[name].cjs'
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: resolvePath('./electron/preload/index.ts'),
        output: {
          format: 'cjs',
          entryFileNames: '[name].cjs'
        }
      }
    }
  },
  renderer: {
    root: '.',
    build: {
      rollupOptions: {
        input: resolvePath('./index.html')
      }
    },
    resolve: {
      alias: {
        '@': resolvePath('./src')
      }
    },
    plugins: [vue()]
  }
})
