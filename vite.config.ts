import fs from 'node:fs'
import type { ServerResponse } from 'node:http'
import path from 'node:path'
import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import type { Connect, Plugin, ViteDevServer } from 'vite'

function localAssetMiddleware(rootDir: string, mountPath: string, contentType = 'application/octet-stream'): Plugin {
  return {
    name: `gotit-local-${mountPath.replace(/\W+/g, '-')}`,
    apply: 'serve' as const,
    configureServer(server: ViteDevServer) {
      server.middlewares.use(mountPath, (
        request: Connect.IncomingMessage,
        response: ServerResponse,
        next: Connect.NextFunction
      ) => {
        const requestPath = decodeURIComponent(new URL(request.url ?? '/', 'http://local').pathname)
        const assetPath = path.resolve(rootDir, requestPath.replace(/^\/+/, ''))

        if (!assetPath.startsWith(`${rootDir}${path.sep}`)) {
          response.statusCode = 403
          response.end('Forbidden')
          return
        }

        fs.stat(assetPath, (error, stat) => {
          if (error || !stat.isFile()) {
            next()
            return
          }

          response.setHeader('Content-Type', contentType)
          response.setHeader('Content-Length', String(stat.size))
          fs.createReadStream(assetPath).pipe(response)
        })
      })
    }
  }
}

function localAudioMiddleware(): Plugin {
  return localAssetMiddleware(path.resolve(__dirname, 'generated/audio'), '/generated/audio', 'audio/mpeg')
}

function localWordbankMiddleware(): Plugin {
  return localAssetMiddleware(
    path.resolve(__dirname, 'generated/wordbank'),
    '/generated/wordbank',
    'application/json; charset=utf-8'
  )
}

function h5AssetCopyPlugin(sourceRoot: string, targetSuffix: string, name: string): Plugin {
  return {
    name,
    apply: 'build' as const,
    writeBundle(options) {
      const outputDir = path.resolve(__dirname, options.dir ?? '')
      const h5OutputDir = path.resolve(__dirname, 'dist/build/h5')
      if (outputDir !== h5OutputDir || !fs.existsSync(sourceRoot)) return

      const targetDir = path.join(h5OutputDir, targetSuffix)
      fs.rmSync(targetDir, { recursive: true, force: true })
      fs.mkdirSync(path.dirname(targetDir), { recursive: true })
      fs.cpSync(sourceRoot, targetDir, { recursive: true })
    }
  }
}

function h5AudioAssetPlugin(): Plugin {
  return h5AssetCopyPlugin(
    path.resolve(__dirname, 'generated/audio'),
    'generated/audio',
    'gotit-h5-audio-assets'
  )
}

function h5WordbankAssetPlugin(): Plugin {
  return h5AssetCopyPlugin(
    path.resolve(__dirname, 'generated/wordbank'),
    'generated/wordbank',
    'gotit-h5-wordbank-assets'
  )
}

function removeDsStoreFiles(rootDir: string): void {
  if (!fs.existsSync(rootDir)) return

  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const entryPath = path.join(rootDir, entry.name)
    if (entry.isDirectory()) {
      removeDsStoreFiles(entryPath)
    } else if (entry.name === '.DS_Store') {
      fs.rmSync(entryPath, { force: true })
    }
  }
}

function weappPackageCleanupPlugin(coversCdnBaseUrl: string): Plugin {
  return {
    name: 'gotit-weapp-package-cleanup',
    apply: 'build' as const,
    closeBundle() {
      const outputDir = path.resolve(__dirname, 'dist/build/mp-weixin')
      removeDsStoreFiles(outputDir)

      if (!coversCdnBaseUrl) return

      const coversDir = path.join(outputDir, 'static/textbook-covers')
      if (!fs.existsSync(coversDir)) return

      fs.rmSync(coversDir, { recursive: true, force: true })
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const coversCdnBaseUrl = String(env.VITE_COVERS_CDN_BASE_URL || '').replace(/\/+$/, '')

  return {
  plugins: [
    localAudioMiddleware(),
    localWordbankMiddleware(),
    h5AudioAssetPlugin(),
    h5WordbankAssetPlugin(),
    weappPackageCleanupPlugin(coversCdnBaseUrl),
    uni()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
  }
})
