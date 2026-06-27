# 息间

息间是一款面向长期用眼人群的轻健康 Web 产品。首个模块「松眸训练」提供左右眼专注引导、每日打卡、记录月历和主动分享的养生社区。

## 已实现

- PC 与移动端响应式首页
- 左眼、换眼、右眼、双眼放松训练流程
- 训练暂停、不适提示和减少动态效果
- 邮箱注册、登录、HttpOnly Session
- D1 训练记录与每日幂等打卡
- 社区动态、公开数据快照和鼓励互动
- R2 图片上传：头像、社区图片、饮食图片
- 近 7 天摘要与月历记录
- 浅色与深色模式
- Cloudflare Workers Static Assets 一体化部署

## 技术栈

- React 19、TypeScript、Vite
- Cloudflare Vite Plugin、Workers、D1
- Phosphor Icons
- 原生 CSS 设计系统

## 本地开发

```bash
npm install
npm run cf:types
npm run db:local
npm run dev
```

访问 `http://127.0.0.1:5173`。

## 验证

```bash
npm run check
npm run build
npm audit --omit=dev
npx wrangler types --check
npx wrangler deploy --dry-run
```

## Cloudflare 正式部署

1. 登录 Cloudflare：`npx wrangler login`
2. 创建 D1：`npx wrangler d1 create xijian-db --location apac`
3. 将返回的 `database_id` 写入 `wrangler.jsonc`
4. 执行迁移：`npm run db:remote`
5. 部署：`npm run deploy`

如需自定义域名，在确认域名后把 Custom Domain 路由加入 `wrangler.jsonc`，再重新部署。

## 讯飞超拟人语音合成

训练页「语音帮助模式」会优先请求 `/api/tts/training` 使用讯飞超拟人语音合成，并把生成的 MP3 缓存在 R2。未配置密钥或合成失败时，前端会自动降级到浏览器自带语音。

推荐使用讯飞控制台的 APIPassword 鉴权：

```bash
npx wrangler secret put XFYUN_TTS_APP_ID
npx wrangler secret put XFYUN_TTS_API_PASSWORD
```

如果控制台只提供三件套，也可以使用：

```bash
npx wrangler secret put XFYUN_TTS_APP_ID
npx wrangler secret put XFYUN_TTS_API_KEY
npx wrangler secret put XFYUN_TTS_API_SECRET
```

非敏感默认配置在 `wrangler.jsonc`：

- `XFYUN_TTS_URL`：超拟人语音合成 WebSocket 地址
- `XFYUN_TTS_VOICE`：默认发音人
- `XFYUN_TTS_ORAL_LEVEL`：口语化等级

## 健康边界

本项目用于一般性的用眼休息与视觉专注练习，不提供医疗诊断、验光、治疗或疗效承诺。如出现眼痛、明显头晕、持续重影或其他不适，应停止训练并寻求专业帮助。
