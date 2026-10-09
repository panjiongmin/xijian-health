# 息间 · 每日打卡

面向一个团队的每日任务打卡平台，使用 React、Vite、Cloudflare Workers、D1 和 R2。

## 功能

- 管理员创建、编辑、启用和停用任务，按星期重复。
- 成员每日打卡、当天撤销、月历及历史图片记录。
- 图片要求：不需要、选填、必填；每次最多 3 张，每张不超过 4MB，支持 JPG、PNG、WebP。
- 管理员按日期查看成员任务进度和图片。
- pushplus 微信扫码绑定、提醒开关及异步投递结果。
- 手机与桌面布局、深浅色模式。

所有打卡日期按北京时间计算。新任务当天生效；已有任务的编辑与启停从次日生效，保证历史记录不随任务调整变化。原健康记录保留在数据库中，不转换成任务打卡。

## 本地运行

```bash
npm ci
npm run cf:types
npm run db:local
npm run admin:local
npm run dev
```

管理员邮箱在 `wrangler.jsonc` 的 `ADMIN_EMAIL` 中配置。初始化命令只创建本地管理员账号，不覆盖已有账号；普通成员在网页注册。访问 http://127.0.0.1:5173/。

## 微信提醒配置

复制 `.dev.vars.example` 为 `.dev.vars`，配置：

| 字段 | 用途 |
|---|---|
| PUSHPLUS_TOKEN | pushplus 用户 Token，开放接口要求用户 Token |
| PUSHPLUS_SECRET_KEY | 在 pushplus 配置的 SecretKey，用于获取与刷新 AccessKey |
| PUSHPLUS_CALLBACK_SECRET | 64 位十六进制随机字符串，用于回调验证 |

已有本地凭据不要覆盖。密钥文件已被 Git 忽略。生产密钥通过 Wrangler Secret 配置，不能提交到版本库。

管理员在“管理后台 → 提醒设置”填写公开 HTTPS 根地址、时间并保存，把页面提供的回调地址填入 pushplus“功能设置 → 回调地址”。成员在“个人设置”扫码绑定。二维码 10 分钟有效，绑定后开启提醒，成员可关闭或解除绑定。

扫码绑定需要公开可访问的回调服务，本地 localhost 无法接收 pushplus 回调。正式接入时需确认 pushplus 账号的安全 IP 设置允许服务调用。

定时任务每分钟扫描，达到管理员设置的时间后分批提醒：每次最多 10 人、每分钟最多一次发送请求、每人每天最多一次。已完成或关闭提醒的成员跳过。接口受理后显示“等待投递”，收到回调后才更新为“已发送”或“发送失败”；网络结果不确定时不自动重发。

Cron 在 Cloudflare 部署后运行，本地 Vite 不自动模拟定时触发。

## 生产部署

```bash
npm run db:remote
npm run deploy
```

部署使用 `wrangler.jsonc` 配置的 Workers、D1 和 R2。数据库迁移保留已有用户和历史数据，本地任务与打卡记录不会自动复制到线上。生产管理员需要单独初始化。

正式界面采用“每日手帐”风格，原有方案预览仍保留在 `/ui-options.html` 和 `/ui-directions.html`。

官方接口：
- [好友与扫码绑定](https://www.pushplus.plus/doc/function/friend.html)
- [发送及回调接口](https://www.pushplus.plus/doc/guide/api.html)
- [SecretKey、AccessKey 和二维码接口](https://www.pushplus.plus/doc/guide/openApi.html)

## 验证

```bash
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.worker.json --noEmit
npm test
```

测试使用独立的 Miniflare D1/R2，通知请求为模拟接口，不发送真实消息，不修改本地或线上业务数据。
