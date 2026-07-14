import fs from 'node:fs'
import type { ServerResponse } from 'node:http'
import path from 'node:path'
import { defineConfig } from 'vitest/config'
import uni from '@dcloudio/vite-plugin-uni'
import type { Connect, Plugin, ViteDevServer } from 'vite'

function localAudioMiddleware(): Plugin {
  const audioRoot = path.resolve(__dirname, 'generated/audio')

  return {
    name: 'gotit-local-audio',
    apply: 'serve' as const,
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/generated/audio', (
        request: Connect.IncomingMessage,
        response: ServerResponse,
        next: Connect.NextFunction
      ) => {
        const requestPath = decodeURIComponent(new URL(request.url ?? '/', 'http://local').pathname)
        const audioPath = path.resolve(audioRoot, requestPath.replace(/^\/+/, ''))

        if (!audioPath.startsWith(`${audioRoot}${path.sep}`)) {
          response.statusCode = 403
          response.end('Forbidden')
          return
        }

        fs.stat(audioPath, (error, stat) => {
          if (error || !stat.isFile()) {
            next()
            return
          }

          response.setHeader('Content-Type', 'audio/mpeg')
          response.setHeader('Content-Length', String(stat.size))
          fs.createReadStream(audioPath).pipe(response)
        })
      })
    }
  }
}

export default defineConfig({
  plugins: [localAudioMiddleware(), uni()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
})
