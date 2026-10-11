# Browser Agent Server - 服务化架构指南

## 📦 新增功能

### ✨ 核心特性

1. **独立服务模式** - 作为 HTTP/WebSocket 服务运行
2. **插件化系统** - 动态加载自定义工具，无需重启
3. **SDK 客户端** - Node.js 和 Python 客户端
4. **向后兼容** - 保持原有嵌入式 API 不变
5. **实时通信** - WebSocket 支持执行进度推送

---

## 🚀 快速开始

### 方式 1: 作为独立服务运行（推荐）

```bash
cd /home/song/下载/live

# 安装新依赖
npm install ws

# 启动服务器（默认端口 8080）
npm run serve

# 或者使用命令行
node server.js --port 8080
```

**服务器启动后会显示：**
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

### 方式 2: 嵌入式使用（向后兼容）

```javascript
// 原有的使用方式完全保持不变
const { AutonomousAgent } = require('./src');

async function main() {
    const agent = new AutonomousAgent({
        llm: {
            provider: 'openai',
            apiKey: process.env.OPENAI_API_KEY,
            model: 'gpt-4o'
        }
    });

    await agent.launch();
    
    const result = await agent.executeGoal('访问 https://example.com 并截图');
    console.log(result);

    await agent.close();
}

main();
```

---

## 📡 HTTP API 使用

### 1. 执行目标（一次性）

```bash
curl -X POST http://localhost:8080/execute \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "访问 https://example.com 并截取屏幕截图"
  }'
```

### 2. 创建 Agent 实例

```bash
# 创建 Agent
curl -X POST http://localhost:8080/agents \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "llm": { "model": "gpt-4o" },
      "browser": { "headless": true }
    }
  }'

# 返回：{"agentId": "agent-1"}
```

### 3. 在指定 Agent 上执行

```bash
curl -X POST http://localhost:8080/agents/agent-1/execute \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "验证页面标题包含 Example Domain"
  }'
```

### 4. 获取可用工具

```bash
curl http://localhost:8080/tools
```

### 5. 注册自定义工具

```bash
curl -X POST http://localhost:8080/tools \
  -H "Content-Type: application/json" \
  -d '{
    "name": "send_notification",
    "description": "发送通知",
    "handler": "async (args) => { /* 你的代码 */ }"
  }'
```

---

## 🔌 Node.js SDK 使用

```javascript
const { AgentClient } = require('./sdk/node');

// 创建客户端
const client = new AgentClient('http://localhost:8080');

// 等待服务器就绪
await client.waitForServer();

// 方式 1: 直接执行（自动管理 Agent）
const result = await client.execute('访问 https://example.com 并截图');
console.log(result);

// 方式 2: 手动管理 Agent
const agentId = await client.createAgent({
    llm: { model: 'gpt-4o' }
});

const status = await client.getAgentStatus(agentId);
console.log(status);

const result2 = await client.executeOn('验证页面内容', agentId);
console.log(result2);

await client.destroyAgent(agentId);

// 方式 3: WebSocket 实时进度
client.on('execution_progress', (message) => {
    console.log('进度:', message);
});

const result3 = await client.executeWithProgress('复杂任务...');
```

---

## 🐍 Python SDK 使用

```python
from browser_agent import AgentClient, create_client

# 创建客户端
client = AgentClient('http://localhost:8080')

# 等待服务器就绪
client.wait_for_server()

# 方式 1: 直接执行
result = client.execute('访问 https://example.com 并截图')
print(result)

# 方式 2: 手动管理 Agent
agent_id = client.create_agent({
    'llm': {'model': 'gpt-4o'}
})

status = client.get_agent_status(agent_id)
print(status)

result2 = client.execute_on('验证页面内容', agent_id)
print(result2)

client.destroy_agent(agent_id)

# 方式 3: WebSocket 实时进度（需要安装 websocket-client）
# pip install websocket-client
from browser_agent import WebSocketAgentClient

ws_client = WebSocketAgentClient('http://localhost:8080')

def on_progress(message):
    print(f'进度：{message}')

result3 = ws_client.execute_with_progress(
    '复杂任务...',
    progress_callback=on_progress
)
print(result3)
```

---

## 🔧 插件开发指南

### 创建自定义工具

在 `plugins/` 目录下创建 `.js` 文件：

```javascript
// plugins/my-tools.js

module.exports = [
    {
        name: 'my_custom_tool',
        description: '我的自定义工具',
        schema: {
            param1: { 
                type: 'string', 
                required: true, 
                description: '参数 1' 
            }
        },
        handler: async (args, context) => {
            // 你的逻辑
            return {
                success: true,
                data: '结果数据'
            };
        }
    }
];
```

### 热插拔插件

```bash
# 重新加载插件（无需重启服务器）
curl -X POST http://localhost:8080/plugins/my-tools.js/reload

# 或者在运行时注册
const server = require('./server');
server.registerTool({
    name: 'dynamic_tool',
    description: '动态注册的工具',
    handler: async (args) => { ... }
});
```

### 示例插件

已创建的示例插件位于 `plugins/example-tools.js`，包含：
- `http_request` - 发送 HTTP 请求
- `exec_command` - 执行系统命令（带安全检查）
- `read_file` - 读取本地文件

---

## 🏗️ 架构对比

### 旧架构（嵌入式）❌

```javascript
// 紧耦合，难以扩展
const agent = new AutonomousAgent(config);
await agent.launch();
await agent.executeGoal(goal);
```

**问题：**
- 每次使用都要初始化整个框架
- 无法被其他语言调用
- 工具系统固化，难以添加自定义工具
- 无法共享 Agent 实例

### 新架构（服务化）✅

```
┌─────────────┐     HTTP/WS     ┌──────────────────┐
│  客户端      │ ◄─────────────► │  Agent Server    │
│  (Node.js)  │                 │  - Agent Pool    │
├─────────────┤                 │  - Plugin System │
│  客户端      │                 │  - Tool Registry │
│  (Python)   │                 └──────────────────┘
├─────────────┤                            │
│  MCP Client │                           ▼
│  (Cursor)   │                 ┌──────────────────┐
└─────────────┘                 │ Browser Backend  │
                                │ (Chromium/Remote)│
                                └──────────────────┘
```

**优势：**
- ✅ 语言和框架无关
- ✅ 多客户端并发使用
- ✅ 动态插件系统
- ✅ Agent 实例池化和复用
- ✅ 更好的扩展性和维护性

---

## 📖 API 完整文档

启动服务器后访问 `http://localhost:8080/docs` 查看完整 API 文档。

### 主要端点

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/health` | 健康检查 |
| GET | `/status` | 服务器状态 |
| POST | `/execute` | 执行目标（一次性） |
| POST | `/agents` | 创建 Agent |
| GET | `/agents` | Agent 列表 |
| GET | `/agents/:id` | Agent 状态 |
| DELETE | `/agents/:id` | 销毁 Agent |
| POST | `/agents/:id/execute` | 执行目标 |
| GET | `/tools` | 工具列表 |
| POST | `/tools` | 注册工具 |
| POST | `/plugins/:file/reload` | 重载插件 |

---

## ⚙️ 配置选项

### 服务器配置

```javascript
const server = new AgentServer({
    port: 8080,              // HTTP 端口
    host: '127.0.0.1',       // 监听地址
    enableWebSocket: true,   // 启用 WebSocket
    enableMCP: false,        // 启用 MCP 协议（开发中）
    agentConfig: {           // 默认 Agent 配置
        llm: { model: 'gpt-4o' },
        browser: { headless: false }
    },
    pluginsDir: './plugins'  // 插件目录
});
```

### 命令行选项

```bash
node server.js [选项]

-p, --port <port>       端口号 (默认：8080)
-H, --host <host>       监听地址 (默认：127.0.0.1)
--no-ws                 禁用 WebSocket
--mcp                   启用 MCP 协议
--plugins <dir>         插件目录 (默认：./plugins)
-h, --help              显示帮助
-v, --version           显示版本号
```

---

## 🎯 使用场景

### 场景 1: 本地开发测试

```bash
# 终端 1: 启动服务器
npm run serve

# 终端 2: 使用 Node.js SDK
node -e "
const {AgentClient} = require('./sdk/node');
const client = new AgentClient();
client.execute('访问 https://example.com').then(console.log);
"
```

### 场景 2: Python 项目集成

```bash
# 终端 1: 启动服务器
npm run serve

# 终端 2: Python 脚本
python3 my_script.py
```

### 场景 3: 多用户并发

```javascript
// 服务器端配置高并发
const server = new AgentServer({
    port: 8080,
    agentConfig: {
        maxConcurrentAgents: 10
    }
});

// 多个客户端可以同时创建和执行 Agent
const client1 = new AgentClient();
const client2 = new AgentClient();
// ... 各自独立执行任务
```

### 场景 4: 自定义工具扩展

```javascript
// 创建业务特定工具
// plugins/business-tools.js
module.exports = [
    {
        name: 'check_inventory',
        description: '检查库存',
        handler: async (args) => {
            // 连接数据库查询库存
            return db.query('SELECT * FROM inventory...');
        }
    },
    {
        name: 'send_email',
        description: '发送邮件',
        handler: async (args) => {
            // 调用邮件服务
            return nodemailer.sendMail({...});
        }
    }
];
```

---

## 🔮 未来规划

- [ ] MCP 协议完整实现（可被 Cursor/Claude 调用）
- [ ] Agent 实例持久化
- [ ] 分布式部署支持
- [ ] 可视化管理界面
- [ ] 更多内置工具
- [ ] Python 包发布 (`pip install browser-agent-sdk`)

---

## 📝 迁移指南

### 从旧版本迁移

**好消息：不需要任何改动！**

所有现有代码完全向后兼容。你可以：

1. **继续使用嵌入式方式** - 零改动
2. **逐步迁移到服务化** - 按需迁移

建议迁移步骤：

```javascript
// 第 1 步：保持现有代码不变
const { AutonomousAgent } = require('./src');
// ... 你的代码

// 第 2 步：尝试服务化（可选）
const { AgentClient } = require('./sdk/node');
const client = new AgentClient();
await client.execute('你的目标');

// 第 3 步：根据需求选择合适的方式
// - 简单脚本：继续用嵌入式
// - 生产环境/多语言：使用服务化
```

---

## ❓ 常见问题

**Q: 服务化和嵌入式有什么区别？**  
A: 服务化是独立进程，通过 HTTP/WebSocket 通信；嵌入式是直接 require 库。前者更灵活，后者更简单。

**Q: 性能有损失吗？**  
A: 服务化有少量网络开销（通常 <10ms），但支持并发和复用，总体效率更高。

**Q: 可以同时在多个项目中使用吗？**  
A: 可以！这正是服务化的优势。一个 Server 可以被无数客户端调用。

**Q: 如何保证安全性？**  
A: 可以通过 API Key、IP 白名单、权限控制等方式保护服务。

**Q: 插件有安全风险吗？**  
A: 插件以服务器权限运行，请确保只加载可信插件。我们提供了基础的安全检查。

---

## 📞 技术支持

- API 文档：`http://localhost:8080/docs`
- 示例代码：`sdk/node/`, `sdk/python/`
- 插件模板：`plugins/example-tools.js`

---

**🎉 享受更灵活的 Browser Agent！**
