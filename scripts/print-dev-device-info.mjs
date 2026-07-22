#!/usr/bin/env node
/**
 * Print local device testing endpoints and service checklist.
 */
import { execSync } from 'node:child_process'

function lanIp() {
  try {
    const out = execSync('scutil --nwi', { encoding: 'utf8' })
    const match = out.match(/address\s+:\s+(\d+\.\d+\.\d+\.\d+)/)
    return match?.[1] ?? '127.0.0.1'
  } catch {
    return '127.0.0.1'
  }
}

const ip = lanIp()
const api = `http://${ip}:4000`
const weappBuildDir = `${process.cwd()}/dist/build/mp-weixin`
const weappDevDir = `${process.cwd()}/dist/dev/mp-weixin`

console.log('=== 课本单词通 · 真机联调信息 ===')
console.log('')
console.log('局域网 IP :', ip)
console.log('API 地址  :', api)
console.log('推荐导入  :', weappBuildDir, '  ← pnpm build:weapp')
console.log('开发 watch  :', weappDevDir, '  ← pnpm dev:weapp（改代码时用）')
console.log('AppID     : wx703d7f44468c7dbf')
console.log('')
console.log('服务启动命令（如未运行）:')
console.log('  docker compose up -d')
console.log('  pnpm dev:api')
console.log('  pnpm dev:weapp')
console.log('')
console.log('微信开发者工具:')
console.log('  1. 导入目录 dist/build/mp-weixin（与 release 相同，无需换目录）')
console.log('  2. 详情 → 本地设置 → 勾选「不校验合法域名…」')
console.log('  3. 点击「真机调试」，手机扫码（需与 Mac 同一 Wi-Fi）')
console.log('')
console.log('改代码后重新编译: pnpm build:weapp')
console.log('')
console.log('验证 API:')
console.log(`  curl ${api}/api/health`)
console.log(`  pnpm smoke:api ${api}`)
