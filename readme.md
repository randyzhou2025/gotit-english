顺序	命令	做什么	会拉 CDN 吗
1
pnpm wordbank:build
从 Excel 生成词库 + manifest + CDN 文件

2
pnpm typecheck
TypeScript 类型检查

3
pnpm test
33 个单元测试

4
pnpm audio:verify-cdn
批量 HEAD/GET 校验 CDN 上的 mp3

5
pnpm build:weapp
编译微信小程序到 dist/build/mp-weixin

环境变量：本地开发用 `.env`（如 `VITE_API_BASE_URL=http://192.168.x.x:4000`）；发布构建用已提交的 `.env.production`（`pnpm release:weapp` 自动读取，无需手动切换）。
