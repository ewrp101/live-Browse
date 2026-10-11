# Autonomous Browser Agent Framework

🤖 **全自动浏览器智能体框架** - 使用自然语言指令驱动浏览器自动化

## 特性

- 🎯 **自然语言驱动** - 用中文或英文描述目标，Agent 自动执行
- 🧠 **AI 智能决策** - 基于 LLM 的规划、决策和反思能力
- 🔧 **自我修复** - 遇到错误时自动诊断并尝试恢复
- 📊 **人类行为模拟** - 模拟真实用户的打字节奏和鼠标轨迹
- 💾 **记忆学习** - 从历史执行中学习优化策略
- 🌐 **双后端支持** - Chromium (完整功能) 或 Lightpanda (轻量快速)

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并填入你的 API Key:

```bash
cp .env.example .env
```

编辑 `.env` 文件:

```bash
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4o
BROWSER_BACKEND=chromium
HEADLESS=false
```

### 3. 运行示例

```bash
# 示例 1: 简单导航和验证
npm run example:1

# 示例 2: 登录流程测试
npm run example:2

# 示例 3: 数据提取
npm run example:3

# 示例 4: 表单自动填写
npm run example:4
```

## 基本用法

### 简单示例

```javascript
const { AutonomousAgent } = require('./src');

async function main() {
    const agent = new AutonomousAgent({
        llm: {
            provider: 'openai',
            apiKey: process.env.OPENAI_API_KEY,
            model: 'gpt-4o'
        },
        browser: {
            backend: 'chromium',
            headless: false,
            humanize: true
        }
    });

    await agent.launch();

    // 用自然语言描述目标
    const result = await agent.executeGoal(`
    访问 https://example.com
    验证页面标题包含 "Example Domain"
    截取屏幕截图
    `);

    console.log('执行结果:', result);

    await agent.close();
}

main();
```

### 复杂任务示例

```javascript
const result = await agent.executeGoal(`
测试电商网站购买流程:
1. 访问 https://demo-store.example.com
2. 搜索 "Playwright T-Shirt"
3. 选择 M 码并加入购物车
4. 进入购物车，修改数量为 2
5. 开始结账，填写测试地址
6. 完成支付流程
7. 验证订单确认页面
`);

console.log('总结:', result.summary);
console.log('建议:', result.recommendations);
```

## 架构设计

```
┌─────────────────────────────────────────┐
│         Natural Language Goal           │
│      "测试这个网站的登录功能"              │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│           Agent Core (LLM)              │
│  ┌──────────┬──────────┬──────────┐    │
│  │ Planner  │ Executor │ Reflector│    │
│  │ 规划器   │ 执行器   │ 反思器   │    │
│  └──────────┴──────────┴──────────┘    │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│         Tool Layer (MCP Tools)          │
│ navigate | click | type | snapshot ...  │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│      Browser (Chromium / Lightpanda)    │
└─────────────────────────────────────────┘
```

## 核心组件

### 1. Planner (规划器)
- 理解用户目标
- 生成执行计划
- 实时决策下一步行动

### 2. Executor (执行器)
- 调用工具执行具体操作
- 记录执行历史和指标
- 支持重试和批量执行

### 3. Reflector (反思器)
- 诊断执行错误
- 提供恢复策略
- 总结执行结果

### 4. Memory (记忆系统)
- 存储完整执行轨迹
- 从历史中学习模式
- 优化未来执行策略

## 可用工具

| 工具名称 | 描述 | 示例参数 |
|---------|------|---------|
| `browser_navigate` | 导航到 URL | `{ url: 'https://...' }` |
| `browser_snapshot` | 捕获页面快照 | `{ full: false }` |
| `browser_screenshot` | 截图 | `{ filename: 'test.png' }` |
| `browser_click` | 点击元素 | `{ selector: '#btn' }` |
| `browser_type` | 输入文本 | `{ selector: '#input', text: 'hello' }` |
| `browser_verify` | 验证断言 | `{ assertionType: 'visible', target: '#elem' }` |
| `browser_wait` | 等待 | `{ duration: 1000 }` |
| `browser_scroll` | 滚动 | `{ direction: 'down', amount: 300 }` |
| `browser_hover` | 悬停 | `{ selector: '.menu' }` |
| `browser_evaluate` | 执行 JS | `{ script: 'return document.title' }` |

## 配置选项

### LLM 配置

```javascript
{
    llm: {
        provider: 'openai',      // 或 'anthropic'
        apiKey: '...',
        model: 'gpt-4o',         // 或 'claude-sonnet-4-5-20250929'
        maxTokens: 4000,
        temperature: 0.1
    }
}
```

### 浏览器配置

```javascript
{
    browser: {
        backend: 'chromium',     // 或 'lightpanda'
        headless: false,         // 是否无头模式
        humanize: true,          // 模拟人类行为
        viewport: { width: 1920, height: 1080 }
    }
}
```

### Agent 配置

```javascript
{
    agent: {
        maxSteps: 50,            // 最大执行步数
        timeout: 300000,         // 超时时间 (ms)
        enableReflection: true,  // 启用自我修复
        retryAttempts: 3         // 重试次数
    }
}
```

## 高级功能

### 1. 自定义工具

```javascript
const { ToolRegistry } = require('./src');

const registry = new ToolRegistry();

registry.registerTool({
    name: 'custom_action',
    description: '自定义操作',
    schema: {
        param1: { type: 'string', required: true }
    },
    handler: async (args, context) => {
        // 自定义逻辑
        return { success: true };
    }
});
```

### 2. 记忆系统查询

```javascript
const agent = new AutonomousAgent({ memory: { enabled: true } });

// 获取成功策略
const strategies = agent.memory.getSuccessfulStrategies();

// 获取常见错误
const errors = agent.memory.getCommonErrors();

// 导出报告
const report = agent.memory.exportReport();
```

### 3. 执行状态监控

```javascript
const state = agent.getState();
console.log('当前进度:', state.plannerStatus.percentComplete + '%');
console.log('执行指标:', state.executorMetrics);
```

## 项目结构

```
.
├── src/
│   ├── agent/
│   │   ├── core.js           # Agent 主类
│   │   ├── planner.js        # 规划器
│   │   ├── executor.js       # 执行器
│   │   ├── reflector.js      # 反思器
│   │   └── llm-adapter.js    # LLM 适配器
│   ├── tools/
│   │   ├── registry.js       # 工具注册表
│   │   └── default-tools.js  # 默认工具集
│   ├── browser/
│   │   └── unified-interface.js  # 统一浏览器接口
│   ├── memory/
│   │   └── episode-memory.js # 情景记忆
│   └── index.js              # 主入口
├── examples/
│   └── basic-examples.js     # 使用示例
├── agent.config.js           # 配置文件
├── .env.example              # 环境变量示例
└── package.json
```

## 最佳实践

### 1. 选择合适的后端

- **Chromium**: 功能完整，稳定可靠，适合生产环境
- **Lightpanda**: 轻量快速，资源占用少，适合简单任务

### 2. 优化执行效率

```javascript
// 数据提取不需要模拟人类行为
const agent = new AutonomousAgent({
    browser: { humanize: false }
});

// 设置合理的最大步数
const agent = new AutonomousAgent({
    agent: { maxSteps: 30 }  // 避免无限循环
});
```

### 3. 错误处理

```javascript
try {
    const result = await agent.executeGoal(goal);
    if (!result.success) {
        console.log('失败原因:', result.errorsEncountered);
    }
} catch (error) {
    console.error('执行异常:', error.message);
    await agent.stop();
}
```

## 限制与注意事项

1. **API 成本**: 每次执行会消耗 LLM tokens，复杂任务可能消耗较多
2. **执行时间**: 比预定义脚本慢，因为需要实时决策
3. **网络依赖**: 需要稳定的网络连接访问 LLM API
4. **安全性**: 不要在代码中硬编码敏感凭证

## 未来规划

- [ ] 支持多 Agent 协作
- [ ] 增强视觉理解 (OCR、图像识别)
- [ ] 零样本任务泛化
- [ ] 插件生态系统
- [ ] 可视化调试界面

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request!

---

**享受智能浏览器自动化！** 🚀
