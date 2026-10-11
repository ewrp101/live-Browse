# 🚀 快速启动指南 - 配置 API Key

## 📋 第一步：准备 API Key

### 兼容 OpenAI 格式的 API 提供商

你可以使用以下任一服务（都兼容 OpenAI API 格式）：

| 服务商 | 地址 | 价格 | 推荐度 |
|--------|------|------|--------|
| **OpenAI 官方** | https://platform.openai.com | $0.03/1K tokens | ⭐⭐⭐⭐⭐ |
| **DeepSeek** | https://platform.deepseek.com | ¥0.01/1K tokens | ⭐⭐⭐⭐⭐ (便宜) |
| **智谱 AI** | https://open.bigmodel.cn | ¥0.008/1K tokens | ⭐⭐⭐⭐ |
| **Moonshot (Kimi)** | https://platform.moonshot.cn | ¥0.012/1K tokens | ⭐⭐⭐⭐ |
| **通义千问** | https://dashscope.aliyun.com | ¥0.02/1K tokens | ⭐⭐⭐⭐ |

---

## 🔧 第二步：配置环境变量

### 方式 1: 使用 `.env` 文件（推荐）

```bash
# 复制示例文件
cd /home/song/下载/live
cp .env.example .env

# 编辑 .env 文件
nano .env
```

填入以下内容：

```bash
# OpenAI API 配置
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_BASE_URL=https://api.openai.com/v1  # 或其他兼容地址
OPENAI_MODEL=gpt-4o  # 或 deepseek-chat, glm-4 等

# 浏览器配置
BROWSER_BACKEND=chromium
HEADLESS=false  # true=无头模式，false=显示浏览器窗口
HUMANIZE=true   # 模拟人类行为

# 服务器配置
PORT=8080
HOST=127.0.0.1
```

### 方式 2: 直接设置环境变量

```bash
# Bash/Zsh
export OPENAI_API_KEY="sk-your-api-key-here"
export OPENAI_BASE_URL="https://api.openai.com/v1"
export OPENAI_MODEL="gpt-4o"

# 永久生效（添加到 ~/.bashrc 或 ~/.zshrc）
echo 'export OPENAI_API_KEY="sk-your-api-key-here"' >> ~/.bashrc
source ~/.bashrc
```

---

## ▶️ 第三步：启动服务

### 方式 1: 启动 HTTP 服务器（推荐）

```bash
cd /home/song/下载/live
npm run serve
```

看到以下输出表示成功：

```
╔══════════════════════════════════════════════════╗
║       Browser Agent Server v1.0.0               ║
╚══════════════════════════════════════════════════╝

[Server] 配置：端口=8080, WebSocket=true, MCP=false
[Server] 加载插件...
[Server] ✅ 已加载 3 个工具
[Server] ✅ 服务器已启动
[Server] HTTP: http://127.0.0.1:8080
[Server] WebSocket: ws://127.0.0.1:8080/ws
[Server] API Docs: http://127.0.0.1:8080/docs
```

### 方式 2: 直接用嵌入式模式测试

```bash
node -e "
const { AutonomousAgent } = require('./src');

async function test() {
    const agent = new AutonomousAgent({
        llm: {
            provider: 'openai',
            apiKey: process.env.OPENAI_API_KEY,
            model: process.env.OPENAI_MODEL || 'gpt-4o'
        },
        browser: {
            backend: 'chromium',
            headless: false,
            humanize: true
        }
    });

    await agent.launch();
    
    const result = await agent.executeGoal('访问 https://www.baidu.com 并截图');
    console.log('执行结果:', result);
    
    await agent.close();
}

test().catch(console.error);
"
```

---

## 🧪 第四步：测试功能

### 测试 1: 健康检查

```bash
curl http://localhost:8080/health
```

预期返回：
```json
{
  "status": "ok",
  "timestamp": "2026-03-24T13:30:00.000Z",
  "uptime": 120.5
}
```

### 测试 2: 简单任务

```bash
curl -X POST http://localhost:8080/execute \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "访问 https://example.com，截取屏幕截图，然后告诉我页面标题是什么"
  }'
```

### 测试 3: 新闻抓取（真实版）

```bash
curl -X POST http://localhost:8080/execute \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "打开百度新闻，搜索\"人工智能\"，抓取前 5 条新闻的标题和链接，保存为 markdown 文件"
  }'
```

---

## 🐛 常见问题排查

### 问题 1: API Key 无效

**错误信息**:
```
Error: 401 Unauthorized - Invalid API key
```

**解决方法**:
```bash
# 检查 API Key 是否正确
echo $OPENAI_API_KEY

# 确认 Base URL 是否正确
# OpenAI 官方：https://api.openai.com/v1
# DeepSeek: https://api.deepseek.com/v1
# 智谱：https://open.bigmodel.cn/api/paas/v4
```

### 问题 2: 模型不存在

**错误信息**:
```
Error: 404 - Model not found
```

**解决方法**:
```bash
# 检查模型名称
echo $OPENAI_MODEL

# 常用模型名称:
# - OpenAI: gpt-4o, gpt-4-turbo, gpt-3.5-turbo
# - DeepSeek: deepseek-chat, deepseek-coder
# - 智谱：glm-4, glm-3-turbo
# - Moonshot: moonshot-v1-8k, moonshot-v1-32k
```

### 问题 3: 浏览器启动失败

**错误信息**:
```
Error: Browser closed unexpectedly
```

**解决方法**:
```bash
# 安装 Playwright 浏览器依赖
npx playwright install chromium

# 如果是 Linux，安装系统依赖
sudo apt-get update
sudo apt-get install -y libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 libpango-1.0-0 libcairo2
```

### 问题 4: 余额不足

**错误信息**:
```
Error: 429 - Insufficient quota
```

**解决方法**:
- 充值 API 账户
- 或使用更便宜的模型（如 DeepSeek、智谱）

---

## 💡 使用技巧

### 技巧 1: 使用便宜的国产模型

```bash
# DeepSeek (性价比最高)
export OPENAI_API_KEY="sk-deepseek-key"
export OPENAI_BASE_URL="https://api.deepseek.com/v1"
export OPENAI_MODEL="deepseek-chat"

# 智谱 AI
export OPENAI_API_KEY="your-zhipu-key"
export OPENAI_BASE_URL="https://open.bigmodel.cn/api/paas/v4"
export OPENAI_MODEL="glm-4"
```

### 技巧 2: 调试模式

```bash
# 显示详细日志
export DEBUG=*
npm run serve

# 或显示浏览器窗口（方便调试）
# 编辑 .env
HEADLESS=false
```

### 技巧 3: 性能优化

```bash
# 预创建 Agent 池（减少启动延迟）
# 编辑 server/index.js
const server = new AgentServer({
    agentPoolSize: 3  // 预创建 3 个 Agent
});
```

---

## 📞 获取帮助

如果遇到问题：

1. **查看详细日志**
   ```bash
   npm run serve 2>&1 | tee server.log
   ```

2. **检查配置文件**
   ```bash
   cat .env
   ```

3. **测试 API 连接**
   ```bash
   curl -X POST https://api.openai.com/v1/chat/completions \
     -H "Authorization: Bearer $OPENAI_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"gpt-4o","messages":[{"role":"user","content":"hello"}]}'
   ```

---

## ✅ 成功标志

当你看到以下输出时，说明一切正常：

```
[Agent] ═══════════════════════════════════════
[Agent] 开始执行目标：访问 https://example.com
[Agent] ═══════════════════════════════════════

[Agent] 计划已创建：3 个步骤
[Agent] ───── 步骤 1/50 ─────
[Agent] 决定执行：browser_navigate
[Agent] ✅ 成功 (1234ms)

[Agent] ═══════════════════════════════════════
[Agent] ✅ 执行完成
[Agent] 总耗时：5678ms
[Agent] 执行步数：3
[Agent] ═══════════════════════════════════════
```

🎉 **恭喜！你已经成功启动了 AI Agent！**

---

*最后更新：2026-03-24*
