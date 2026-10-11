# Browser Agent 重构项目 - 5 分钟快速开始

## 🎯 架构升级完成！

你的 Browser Agent 项目已经从**嵌入式架构**成功升级为**服务化 + 插件化架构**！

---

## ⚡ 30 秒理解变化

### 之前（嵌入式）❌
```javascript
// 只能这样用
const agent = new AutonomousAgent();
await agent.executeGoal('访问 example.com');
```
- ❌ 只能 Node.js 使用
- ❌ 难以扩展工具
- ❌ 无法被其他语言调用

### 现在（服务化）✅
```bash
# 启动服务
npm run serve

# Python/Node.js/任意语言都能调用
curl -X POST http://localhost:8080/execute \
  -d '{"goal": "访问 example.com"}'
```
- ✅ 所有语言都能用
- ✅ 插件热插拔
- ✅ 可被大模型调用

---

## 🚀 5 分钟上手

### 方式 1: 继续用嵌入式（零改动）

**好消息：你的现有代码完全不需要修改！**

```javascript
const { AutonomousAgent } = require('./src');
// ... 你的代码保持不变
```

### 方式 2: 尝试服务化（推荐）

#### Step 1: 启动服务器 (10 秒)
```bash
cd /home/song/下载/live
npm run serve
```

看到以下输出表示成功：
```
✅ 服务器已启动
HTTP: http://127.0.0.1:8080
WebSocket: ws://127.0.0.1:8080/ws
```

#### Step 2: 用 cURL 测试 (10 秒)
```bash
curl http://localhost:8080/health
# 返回：{"status":"ok","timestamp":"..."}
```

#### Step 3: 查看 API 文档 (10 秒)
浏览器打开：http://localhost:8080/docs

#### Step 4: 用 Node.js SDK (30 秒)
```javascript
const { AgentClient } = require('./sdk/node');
const client = new AgentClient();

// 执行目标
const result = await client.execute('访问 https://example.com');
console.log(result);
```

#### Step 5: 用 Python SDK (30 秒)
```python
from browser_agent import AgentClient

client = AgentClient('http://localhost:8080')
result = client.execute('访问 https://example.com')
print(result)
```

---

## 🔌 开发自定义插件（2 分钟）

### 创建插件文件
在 `plugins/` 目录创建 `my-tools.js`:

```javascript
module.exports = [
    {
        name: 'get_weather',
        description: '获取天气信息',
        schema: {
            city: { type: 'string', required: true, description: '城市名' }
        },
        handler: async (args) => {
            // 调用天气 API
            const weather = '晴朗，25°C';
            return { success: true, data: weather };
        }
    }
];
```

### 立即生效（无需重启）
```bash
curl -X POST http://localhost:8080/plugins/my-tools.js/reload
```

### 使用新工具
```bash
curl -X POST http://localhost:8080/tools \
  -H "Content-Type: application/json" \
  -d '{
    "name": "get_weather",
    "description": "获取天气",
    "handler": "..."
  }'
```

---

## 📊 完整对比

| 功能 | 旧架构 | 新架构 |
|------|--------|--------|
| 部署 | 仅嵌入式 | 嵌入式 + 服务化 |
| 语言 | Node.js | 所有语言 |
| 扩展 | 改源码 | 插件热插拔 |
| 并发 | 单进程 | 多客户端 |
| 实时性 | 轮询 | WebSocket |
| MCP 支持 | ❌ | ✅ |

---

## 📁 新增内容一览

### 核心服务（5 个文件）
```
server/
├── index.js              # Agent Server
├── api-server.js         # HTTP API
├── websocket-server.js   # WebSocket
└── plugin-loader.js      # 插件系统

server.js                 # 启动脚本
```

### SDK（6 个文件）
```
sdk/
├── node/
│   ├── index.js          # Node.js SDK
│   └── README.md
└── python/
    ├── browser_agent.py  # Python SDK
    ├── setup.py
    └── README.md
```

### 插件和示例
```
plugins/
└── example-tools.js      # 示例插件（3 个工具）
```

### 文档（5 个文件）
```
SERVER_GUIDE.md           # 完整指南
ARCHITECTURE_SUMMARY.md   # 架构总结
QUICKSTART.md             # 本文件
sdk/node/README.md        # Node.js SDK 文档
sdk/python/README.md      # Python SDK 文档
```

---

## 🎯 推荐使用场景

### 继续用嵌入式（旧方式）
- ✅ 个人脚本
- ✅ 快速原型
- ✅ 简单自动化

### 尝试服务化（新方式）
- ✅ 生产环境
- ✅ 多团队协作
- ✅ 需要 Python/Go 等其他语言
- ✅ 需要被 AI 助手调用（Cursor/Claude）
- ✅ 需要动态扩展工具

---

## 🔧 常用命令

```bash
# 启动服务器
npm run serve

# 测试服务器功能
npm run test:server

# 查看架构演示
npm run demo

# 查看 API 文档
# 浏览器访问 http://localhost:8080/docs
```

---

## ❓ FAQ

**Q: 我的旧代码还能用吗？**  
A: 完全可以！100% 向后兼容。

**Q: 服务化有什么额外要求？**  
A: 只需安装 `ws` 库（已自动安装）。

**Q: 如何停止服务器？**  
A: Ctrl+C 或发送 SIGTERM 信号。

**Q: 插件安全吗？**  
A: 插件以服务器权限运行，只加载可信插件。

**Q: 能同时运行多个 Agent 吗？**  
A: 可以！服务器支持 Agent 池管理。

---

## 📖 下一步

1. **阅读完整文档**: `SERVER_GUIDE.md`
2. **查看示例代码**: `plugins/example-tools.js`
3. **开发自己的插件**: 复制 `example-tools.js` 修改
4. **分享给团队**: Python/Node.js 开发者都能用了！

---

## 🎉 恭喜！

你已经了解了新架构的核心特性！

**现在开始享受更灵活的 Browser Agent 吧！** 🚀

---

**相关文档:**
- 📘 完整指南：`SERVER_GUIDE.md`
- 📊 架构总结：`ARCHITECTURE_SUMMARY.md`
- 🐍 Python SDK: `sdk/python/README.md`
- 📦 Node.js SDK: `sdk/node/README.md`
