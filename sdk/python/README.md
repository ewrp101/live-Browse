# Browser Agent SDK - Python

Python 客户端库，用于连接 Browser Agent Server。

## 安装

```bash
pip install requests

# 如果需要 WebSocket 支持
pip install websocket-client
```

或者从本地安装：

```bash
cd sdk/python
pip install -e .
```

## 快速开始

### 1. 基本使用

```python
from browser_agent import AgentClient

# 创建客户端
client = AgentClient('http://localhost:8080')

# 等待服务器就绪
client.wait_for_server()

# 执行目标
result = client.execute('访问 https://example.com 并截图')
print(result)
```

### 2. 手动管理 Agent

```python
# 创建 Agent
agent_id = client.create_agent({
    'llm': {'model': 'gpt-4o'},
    'browser': {'headless': True}
})

# 在指定 Agent 上执行
result = client.execute_on('验证页面标题', agent_id)
print(result)

# 获取状态
status = client.get_agent_status(agent_id)
print(status)

# 销毁 Agent
client.destroy_agent(agent_id)
```

### 3. WebSocket 实时进度

```python
from browser_agent import WebSocketAgentClient

ws_client = WebSocketAgentClient('http://localhost:8080')

def on_progress(message):
    print(f'进度：{message}')

result = ws_client.execute_with_progress(
    '复杂任务...',
    progress_callback=on_progress
)
```

## API 文档

### AgentClient

#### `__init__(server_url, api_key)`
初始化客户端

#### `execute(goal, config)`
执行目标（自动管理 Agent）

#### `create_agent(config)`
创建新的 Agent 实例

#### `get_agent_status(agent_id)`
获取 Agent 状态

#### `execute_on(goal, agent_id)`
在指定 Agent 上执行目标

#### `destroy_agent(agent_id)`
销毁 Agent

#### `get_tools()`
获取可用工具列表

#### `register_tool(tool_definition)`
注册自定义工具

#### `get_status()`
获取服务器状态

#### `health_check()`
健康检查

#### `wait_for_server(timeout, interval)`
等待服务器就绪

## 错误处理

```python
try:
    result = client.execute('目标...')
except Exception as e:
    print(f'执行失败：{e}')
```

## 完整示例

```python
from browser_agent import AgentClient
import json

def main():
    # 创建客户端
    client = AgentClient('http://localhost:8080')
    
    # 等待服务器
    if not client.wait_for_server(timeout=5000):
        print('服务器未响应')
        return
    
    try:
        # 执行简单任务
        result = client.execute('访问 https://example.com')
        print(json.dumps(result, indent=2))
        
        # 获取工具列表
        tools = client.get_tools()
        print(f'可用工具：{len(tools["tools"])} 个')
        
    except Exception as e:
        print(f'错误：{e}')
    finally:
        # 清理资源
        if client.current_agent_id:
            client.destroy_agent(client.current_agent_id)

if __name__ == '__main__':
    main()
```

## License

MIT
