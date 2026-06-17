import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import viteCompression from 'vite-plugin-compression'
import topLevelAwait from 'vite-plugin-top-level-await'
import copy from 'rollup-plugin-copy'
import monacoEditorPlugin from 'vite-plugin-monaco-editor'
import zipPack from 'vite-plugin-zip-pack'

export default defineConfig({
  plugins: [
    vue(),
    monacoEditorPlugin({}),
    // gzip压缩 生产环境生成 .gz 文件
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240,
      algorithm: 'gzip',
      ext: '.gz'
    }),

    topLevelAwait({
      // The export name of top-level await promise for each chunk module
      promiseExportName: '__tla',
      // The function to generate import names of top-level await promise in each chunk module
      promiseImportName: (i) => `__tla_${i}`
    }),

    copy({
      targets: [{ src: 'src/assets/tree-sitter.wasm', dest: 'dist' }]
    }),

    // build 时把 dist 打包成 dist.zip（dev 不触发）
    zipPack({
      inDir: 'dist',
      outDir: '.',
      outFileName: 'dist.zip'
    })
  ],

  base: './', // 打包路径

  // 配置别名
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },

  server: {
    host: '0.0.0.0',
    port: 8000,
    open: false,
    https: false,
    proxy: {
      '/api': {
        target: 'http://4.200401.xyz:40006', // 目标url
        changeOrigin: true, //支持跨域
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }

  // optimizeDeps: {
  //   include: [
  //     `editorDiff-editor/esm/vs/language/json/json.worker`,
  //     `editorDiff-editor/esm/vs/language/css/css.worker`,
  //     `editorDiff-editor/esm/vs/language/html/html.worker`,
  //     `editorDiff-editor/esm/vs/language/typescript/ts.worker`,
  //     `editorDiff-editor/esm/vs/editor/editor.worker`
  //   ]
  // }
})
