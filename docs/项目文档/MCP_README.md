# MCP Browser Agent Server

## 快速开始

### 1. 配置环境变量

```bash
cp .env.mcp .env
# 编辑 .env 填入你的 API Key
```

### 2. 启动 MCP 服务器

```bash
# 方式1: 直接运行
node mcp-server.js --port=3000

# 方式2: 使用 npm
npm run mcp
```

### 3. 使用方式

#### HTTP API

```bash
# 执行任务
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{"goal": "访问 https://example.com 并截图"}'

# 获取工具列表
curl http://localhost:3000/tools

# 健康检查
curl http://localhost:3000/health
```

#### MCP 协议 (JSON-RPC 2.0)

```bash
# 初始化
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize"
  }'

# 获取工具列表
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'

# 执行工具
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "execute_browser_task",
      "arguments": {
        "goal": "访问百度并搜索 hello"
      }
    }
  }'
```

## MCP 客户端配置

### Claude Desktop

创建 `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "browser-agent": {
      "command": "node",
      "args": ["/path/to/live/mcp-server.js"],
      "env": {
        "OPENAI_API_KEY": "sk-xxx",
        "OPENAI_MODEL": "gpt-4o"
      }
    }
  }
}
```

### Cursor

在 Cursor 设置中添加 MCP 服务器:

```json
{
  "mcpServers": {
    "browser-agent": {
      "command": "node",
      "args": ["/path/to/live/mcp-server.js"]
    }
  }
}
```

## 可用工具

| 工具名称 | 描述 | 参数 |
|---------|------|------|
| `browser_navigate` | 导航到URL | `url` |
| `browser_snapshot` | 获取页面结构快照 | - |
| `browser_screenshot` | 截图 | `filename` (可选) |
| `browser_click` | 点击元素 | `selector` |
| `browser_type` | 输入文本 | `selector`, `text` |
| `browser_verify` | 验证内容 | `type`, `target`, `expected` |
| `execute_browser_task` | 执行自然语言任务 | `goal` |

## 示例

### 使用自然语言执行复杂任务

```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "1. 访问 https://www.baidu.com\n2. 在搜索框输入 hello\n3. 点击搜索按钮\n4. 等待结果并截图"
  }'
```

### 单独执行浏览器操作

```bash
# 导航
curl -X POST http://localhost:3000/mcp \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"browser_navigate","arguments":{"url":"https://example.com"}}}'

# 截图
curl -X POST http://localhost:3000/mcp \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"browser_screenshot","arguments":{"filename":"screen.png"}}}'
```

## 白名单安全配置

### 配置说明

在 `.env` 文件中配置:

```bash
# 启用白名单
MCP_WHITELIST_ENABLED=true

# IP 白名单 (逗号分隔，支持通配符)
MCP_WHITELIST_IPS=127.0.0.1,192.168.1.100,10.0.*

# API Key 白名单 (逗号分隔)
MCP_WHITELIST_API_KEYS=key1,key2,my-secret-key
```

### 使用 API Key 调用

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer my-secret-key" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### 白名单功能

| 配置项 | 说明 |
|--------|------|
| `MCP_WHITELIST_ENABLED` | 启用/禁用白名单 (true/false) |
| `MCP_WHITELIST_IPS` | IP 白名单，支持通配符如 `192.168.*` |
| `MCP_WHITELIST_API_KEYS` | API Key 白名单 |

## 架构

```
┌─────────────────┐
│  MCP Client     │ (Claude Desktop, Cursor, etc)
│  (JSON-RPC 2.0) │
└────────┬────────┘
         │
    HTTP POST /mcp
         │
┌────────▼────────┐
│  MCP Server    │  (mcp-server.js)
│  - 工具注册    │
│  - 请求路由    │
│  - IP/Key 白名单│
└────────┬────────┘
         |
┌────────▼────────┐
│  Agent Server  │  (server/index.js)
│  - Agent 管理  │
│  - 插件加载    │
└────────┬────────┘
         |
┌────────▼────────┐
│  Browser       │  (Chromium/Lightpanda)
└─────────────────┘
```
┌─────────────────┐
│  MCP Client     │ (Claude Desktop, Cursor, etc)
│  (JSON-RPC 2.0) │
└────────┬────────┘
         │
    HTTP POST /mcp
         │
┌────────▼────────┐
│  MCP Server    │  (mcp-server.js)
│  - 工具注册    │
│  - 请求路由    │
└────────┬────────┘
         │
┌────────▼────────┐
│  Agent Server  │  (server/index.js)
│  - Agent 管理  │
│  - 插件加载    │
└────────┬────────┘
         │
┌────────▼────────┐
│  Browser       │  (Chromium/Lightpanda)
└─────────────────┘
```
