# Browser Agent SDK - Node.js

轻量级 Node.js 客户端，用于连接 Browser Agent Server。

## 安装

```bash
npm install ws
```

或者从本地链接：

```bash
cd sdk/node
npm link
```

然后在你的项目中使用：

```bash
npm link browser-agent-sdk
```

## 快速开始

### 1. 基本使用

```javascript
const { AgentClient } = require('./sdk/node');

// 创建客户端
const client = new AgentClient('http://localhost:8080');

// 等待服务器就绪
await client.waitForServer();

// 执行目标（自动管理 Agent）
const result = await client.execute('访问 https://example.com 并截图');
console.log(result);
```

### 2. 手动管理 Agent

```javascript
// 创建 Agent
const agentId = await client.createAgent({
    llm: { model: 'gpt-4o' },
    browser: { headless: true }
});

// 获取状态
const status = await client.getAgentStatus(agentId);
console.log(status);

// 在指定 Agent 上执行
const result = await client.executeOn('验证页面标题', agentId);
console.log(result);

// 销毁 Agent
await client.destroyAgent(agentId);
```

### 3. WebSocket 实时进度

```javascript
const client = new AgentClient('http://localhost:8080');

// 监听事件
client.on('message', (message) => {
    console.log('收到消息:', message);
});

client.on('execution_progress', (data) => {
    console.log('进度更新:', data);
});

// 执行并监听进度
const ws = await client.connectWebSocket();

ws.send(JSON.stringify({
    type: 'execute_goal',
    goal: '复杂任务...'
}));
```

### 4. 事件驱动方式

```javascript
const client = new AgentClient('http://localhost:8080');

// 注册事件处理器
client.on('execution_started', (msg) => {
    console.log('开始执行:', msg.goal);
});

client.on('execution_completed', (msg) => {
    console.log('执行完成:', msg.result);
});

client.on('execution_failed', (msg) => {
    console.error('执行失败:', msg.error);
});

// 通过 WebSocket 执行
await client.executeWithProgress('访问 example.com 并截图');
```

## API 文档

### AgentClient

#### `constructor(serverUrl, options)`
创建客户端实例

**参数:**
- `serverUrl` (string): 服务器地址，默认 `'http://127.0.0.1:8080'`
- `options` (Object): 配置选项
  - `apiKey` (string): API Key
  - `timeout` (number): 超时时间（毫秒），默认 300000

#### `execute(goal, options)`
执行目标（便捷方法，自动管理 Agent）

**参数:**
- `goal` (string): 自然语言目标
- `options` (Object): 执行选项
  - `config` (Object): Agent 配置

**返回:** Promise<Object> 执行结果

#### `createAgent(config)`
创建新的 Agent 实例

**参数:**
- `config` (Object): Agent 配置

**返回:** Promise<string> Agent ID

#### `getAgentStatus(agentId)`
获取 Agent 状态

**参数:**
- `agentId` (string): Agent ID

**返回:** Promise<Object> Agent 状态

#### `executeOn(goal, agentId)`
在指定 Agent 上执行目标

**参数:**
- `goal` (string): 自然语言目标
- `agentId` (string): Agent ID

**返回:** Promise<Object> 执行结果

#### `destroyAgent(agentId)`
销毁 Agent

**参数:**
- `agentId` (string): Agent ID

#### `getTools()`
获取可用工具列表

**返回:** Promise<Object> 工具列表

#### `registerTool(toolDefinition)`
注册自定义工具

**参数:**
- `toolDefinition` (Object): 工具定义

#### `getStatus()`
获取服务器状态

**返回:** Promise<Object> 服务器状态

#### `healthCheck()`
健康检查

**返回:** Promise<boolean> 是否健康

#### `waitForServer(timeout, interval)`
等待服务器就绪

**参数:**
- `timeout` (number): 超时时间（毫秒），默认 10000
- `interval` (number): 检查间隔（毫秒），默认 500

#### `connectWebSocket()`
连接到 WebSocket

**返回:** Promise<WebSocket> WebSocket 实例

#### `executeWithProgress(goal)`
通过 WebSocket 执行目标（实时进度）

**参数:**
- `goal` (string): 自然语言目标

**返回:** Promise<Object> 执行结果

## 事件

AgentClient 继承自 EventEmitter，可以监听以下事件：

- `connected`: WebSocket 连接成功
- `disconnected`: WebSocket 断开
- `message`: 收到任何 WebSocket 消息
- `execution_started`: 执行开始
- `execution_completed`: 执行完成
- `execution_failed`: 执行失败
- `execution_progress`: 执行进度更新

## 完整示例

```javascript
const { AgentClient } = require('./sdk/node');

async function main() {
    const client = new AgentClient('http://localhost:8080');
    
    try {
        // 等待服务器
        await client.waitForServer();
        
        // 简单执行
        const result1 = await client.execute('访问 https://example.com');
        console.log('结果 1:', result1);
        
        // 手动管理 Agent
        const agentId = await client.createAgent({
            llm: { model: 'gpt-4o' },
            browser: { headless: false }
        });
        
        const result2 = await client.executeOn(
            '验证页面标题包含 "Example Domain"',
            agentId
        );
        console.log('结果 2:', result2);
        
        await client.destroyAgent(agentId);
        
        // 获取工具列表
        const tools = await client.getTools();
        console.log('可用工具:', tools.tools.map(t => t.name));
        
    } catch (error) {
        console.error('错误:', error.message);
    }
}

main();
```

## TypeScript 支持

虽然没有内置类型定义，但你可以轻松添加：

```typescript
// types.d.ts
declare module 'browser-agent-sdk' {
    interface AgentClientOptions {
        apiKey?: string;
        timeout?: number;
    }
    
    class AgentClient {
        constructor(serverUrl: string, options?: AgentClientOptions);
        execute(goal: string, options?: any): Promise<any>;
        createAgent(config?: any): Promise<string>;
        // ... 其他方法
    }
}
```

## License

MIT
