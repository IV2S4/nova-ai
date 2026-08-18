import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 800,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor-md',
              test: /node_modules\/(katex|highlight\.js|react-markdown|remark-|rehype-|micromark|mdast|hast-|unified|vfile|bail|trough|ccount|comma-separated-tokens|decode-named-character-reference|character-entities|estree-|devlop|is-plain-obj|longest-streak|markdown-table|property-information|space-separated-tokens|string-width|trim-lines|zwitch|web-namespaces|html-void-elements|parse-entities)/,
              priority: 10
            },
            {
              name: 'vendor-react',
              test: /node_modules\/(react|react-dom|scheduler)/,
              priority: 20
            },
            {
              name: 'vendor-ui',
              test: /node_modules\/(lucide-react)/,
              priority: 5
            }
          ]
        }
      }
    }
  },
  server: { port: 5173, strictPort: true }
})