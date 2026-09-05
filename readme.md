# 课本单词通（GotIt）

## 小程序发版

推荐一键发版：

```bash
pnpm release:weapp
```

等价步骤：

| 顺序 | 命令 | 做什么 |
|------|------|--------|
| 1 | `pnpm wordbank:build` | 从 Excel 生成词库 + manifest + CDN 文件 |
| 2 | `pnpm unit-eggs:build` | 生成彩蛋清单和按出版社拆分的 CDN 文件 |
| 3 | `pnpm typecheck` | TypeScript 类型检查 |
| 4 | `pnpm test` | 单元测试 |
| 5 | `pnpm audio:verify-cdn` | 校验 CDN 上的 mp3（release 脚本里默认跳过） |
| 6 | `pnpm build:weapp` | 编译微信小程序到 `dist/build/mp-weixin` |

发版前同步教材封面并上传 CDN：

```bash
pnpm covers:sync
# 上传 generated/textbook-covers/*.jpg → https://audio.xuexidazi.site/generated/textbook-covers/
```

打包产物导入微信开发者工具目录：`dist/build/mp-weixin`

### 环境变量

| 文件 | 用途 |
|------|------|
| `.env` | 本地开发（如 `VITE_API_BASE_URL=http://192.168.x.x:4000`） |
| `.env.production` | 小程序生产打包（CDN、生产 API），`pnpm release:weapp` / `pnpm build:weapp` 自动读取 |
| `.env.prod` | **服务器 Docker 专用**，勿与 `.env.production` 混用 |

---

## 服务器常用命令

项目目录假设为 `~/gotit-english`，按实际路径调整。

### 拉代码并重建 API

```bash
cd ~/gotit-english
git pull

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build gotit_api
```

> 必须用 `.env.prod`，不是 `.env.production`。

`.env.prod` 可从 `deploy/env.example` 复制并填写 `JWT_SECRET`、`GOTIT_POSTGRES_PASSWORD`、`WECHAT_MINI_SECRET` 等。

### 数据库 schema 同步

有表结构变更时执行。生产容器不含 drizzle-kit，推荐直接 SQL：

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod exec gotit_postgres \
  psql -U gotit -d gotit -c "
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_ip varchar(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_location varchar(128);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_default_nickname boolean NOT NULL DEFAULT false;
ALTER TABLE users ALTER COLUMN nickname DROP NOT NULL;
UPDATE users
SET is_default_nickname = true
WHERE nickname = '课本单词通'
   OR nickname ~ '^课本单词通_[a-z0-9]{5}$';

INSERT INTO app_config (key, value)
VALUES ('analytics_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id varchar(64) NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_name varchar(64) NOT NULL,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS usage_events_occurred_at_idx
  ON usage_events (occurred_at);
CREATE INDEX IF NOT EXISTS usage_events_user_event_idx
  ON usage_events (user_id, event_name, occurred_at);
"
```

### 导出词表学习力迁移

导出词表每次 +2、每日最多 +20。已有社交表的生产环境须先执行迁移，再重建 API；新环境先执行 `server/drizzle/0000_social_learning_power.sql`，再执行此迁移。SQL 可重复执行，原有记录的导出得分默认为 0。

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T gotit_postgres \
  pg_dump -U gotit -d gotit > "gotit-before-wordlist-export-$(date +%Y%m%d-%H%M%S).sql"

docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T gotit_postgres \
  psql -U gotit -d gotit -v ON_ERROR_STOP=1 < server/drizzle/0001_wordlist_export_learning_power.sql

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build gotit_api
```

### 学习提醒迁移

项目已添加微信模板「学习任务通知」，复制 `deploy/env.example` 中的 template ID 和字段配置到 `.env.prod`。普通一次性模板使用 `WECHAT_STUDY_REMINDER_MODE=one_time`；只有已获长期订阅权限的模板才能改为 `long_term`。

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T gotit_postgres \
  psql -U gotit -d gotit -v ON_ERROR_STOP=1 < server/drizzle/0002_learning_reminders.sql

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build gotit_api
```

### 验证 API

```bash
curl https://api.xuexidazi.site/api/health
# 期望：{"ok":true}
```

### 排查 API 异常

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod logs gotit_api --tail 50
```

常见 502 原因：未用 `--env-file .env.prod` 启动，导致 `JWT_SECRET` 等未传入容器。

### 首次部署（参考）

```bash
cp deploy/env.example .env.prod   # 填写密钥
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
# 再执行上面的数据库 schema 同步
```
