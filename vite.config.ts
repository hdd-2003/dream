import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: {
    watch: {
      ignored: ['**/.dbg/**'],
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'trae-debug-collector',
      configureServer(server) {
        server.middlewares.use('/__trae_event', (req, res, next) => {
          if (req.method === 'OPTIONS') {
            res.statusCode = 204
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
            res.end()
            return
          }

          if (req.method !== 'POST') {
            next()
            return
          }

          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', () => {
            try {
              const event = JSON.parse(body || '{}')
              const sessionId = typeof event.sessionId === 'string' && event.sessionId ? event.sessionId : 'default'
              if (typeof event.ts !== 'number') event.ts = Date.now()

              const outDir = path.join(process.cwd(), '.dbg')
              fs.mkdirSync(outDir, { recursive: true })
              const outPath = path.join(outDir, `trae-debug-log-${sessionId}.ndjson`)
              fs.appendFileSync(outPath, `${JSON.stringify(event)}\n`, { encoding: 'utf8' })

              res.statusCode = 200
              res.setHeader('Access-Control-Allow-Origin', '*')
              res.setHeader('Content-Type', 'text/plain; charset=utf-8')
              res.end('ok')
            } catch {
              res.statusCode = 400
              res.setHeader('Content-Type', 'text/plain; charset=utf-8')
              res.end('bad_request')
            }
          })
        })
      },
    },
  ],
})
