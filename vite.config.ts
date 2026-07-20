import { mkdir, appendFile } from 'node:fs/promises'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, type Plugin } from 'vite'

function createSessionLogPlugin(): Plugin {
  const startedAt = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
  const logsDir = path.resolve(process.cwd(), 'logs')
  const logFile = path.join(logsDir, `session-${startedAt}.jsonl`)

  return {
    name: 'lingualens-session-log',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/__log') {
          next()
          return
        }

        setCorsHeaders(res)

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }

        try {
          const payload = await readJsonBody(req)
          await mkdir(logsDir, { recursive: true })
          await appendFile(logFile, `${JSON.stringify(payload)}\n`, 'utf8')
          res.statusCode = 204
          res.end()
        } catch (error) {
          server.config.logger.error(`[lingualens-session-log] ${error instanceof Error ? error.message : String(error)}`)
          res.statusCode = 400
          res.end('Bad Request')
        }
      })
    },
  }
}

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []

  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim()
  return raw ? JSON.parse(raw) : {}
}

export default defineConfig(({ command }) => ({
  server: { host: true, port: 5173 },
  build: { target: 'esnext' },
  plugins: command === 'serve' ? [createSessionLogPlugin()] : [],
}))
