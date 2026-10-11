"""
Browser Agent SDK - Python 客户端

轻量级客户端，用于连接 Browser Agent Server
"""

import requests
import json
import time
from typing import Optional, Dict, Any, List
from urllib.parse import urljoin


class AgentClient:
    """Browser Agent Python 客户端"""
    
    def __init__(self, server_url: str = 'http://127.0.0.1:8080', api_key: Optional[str] = None):
        """
        初始化客户端
        
        Args:
            server_url: 服务器地址
            api_key: API Key（可选）
        """
        self.server_url = server_url.rstrip('/')
        self.api_key = api_key
        self.current_agent_id: Optional[str] = None
        self.session = requests.Session()
        
        if api_key:
            self.session.headers['Authorization'] = f'Bearer {api_key}'
        
        self.session.headers['Content-Type'] = 'application/json'
    
    def execute(self, goal: str, config: Optional[Dict] = None) -> Dict[str, Any]:
        """
        执行目标（便捷方法，自动管理 Agent）
        
        Args:
            goal: 自然语言描述的目标
            config: Agent 配置（可选）
            
        Returns:
            执行结果字典
        """
        print(f'[SDK] 执行目标：{goal}')
        
        payload = {'goal': goal}
        if config:
            payload['config'] = config
        
        response = self._request('POST', '/execute', json=payload)
        return response
    
    def create_agent(self, config: Optional[Dict] = None) -> str:
        """
        创建新的 Agent 实例
        
        Args:
            config: Agent 配置（可选）
            
        Returns:
            Agent ID
        """
        response = self._request('POST', '/agents', json={'config': config or {}})
        self.current_agent_id = response['agentId']
        print(f'[SDK] 创建 Agent: {self.current_agent_id}')
        return self.current_agent_id
    
    def get_agent_status(self, agent_id: Optional[str] = None) -> Dict[str, Any]:
        """
        获取 Agent 状态
        
        Args:
            agent_id: Agent ID（可选，默认使用当前 Agent）
            
        Returns:
            Agent 状态字典
        """
        agent_id = agent_id or self.current_agent_id
        if not agent_id:
            raise ValueError('未指定 Agent ID')
        
        return self._request('GET', f'/agents/{agent_id}')
    
    def execute_on(self, goal: str, agent_id: Optional[str] = None) -> Dict[str, Any]:
        """
        在指定 Agent 上执行目标
        
        Args:
            goal: 自然语言描述的目标
            agent_id: Agent ID（可选）
            
        Returns:
            执行结果字典
        """
        agent_id = agent_id or self.current_agent_id
        if not agent_id:
            raise ValueError('未指定 Agent ID')
        
        return self._request('POST', f'/agents/{agent_id}/execute', json={'goal': goal})
    
    def destroy_agent(self, agent_id: Optional[str] = None) -> None:
        """
        销毁 Agent
        
        Args:
            agent_id: Agent ID（可选）
        """
        agent_id = agent_id or self.current_agent_id
        if not agent_id:
            raise ValueError('未指定 Agent ID')
        
        self._request('DELETE', f'/agents/{agent_id}')
        print(f'[SDK] 销毁 Agent: {agent_id}')
        
        if self.current_agent_id == agent_id:
            self.current_agent_id = None
    
    def get_tools(self) -> Dict[str, Any]:
        """
        获取可用工具列表
        
        Returns:
            工具列表字典
        """
        return self._request('GET', '/tools')
    
    def register_tool(self, tool_definition: Dict) -> Dict[str, Any]:
        """
        注册自定义工具
        
        Args:
            tool_definition: 工具定义字典
            
        Returns:
            注册结果
        """
        return self._request('POST', '/tools', json=tool_definition)
    
    def get_status(self) -> Dict[str, Any]:
        """
        获取服务器状态
        
        Returns:
            服务器状态字典
        """
        return self._request('GET', '/status')
    
    def health_check(self) -> bool:
        """
        健康检查
        
        Returns:
            是否健康
        """
        try:
            result = self._request('GET', '/health')
            return result.get('status') == 'ok'
        except:
            return False
    
    def wait_for_server(self, timeout: int = 10000, interval: int = 500) -> bool:
        """
        等待服务器就绪
        
        Args:
            timeout: 超时时间（毫秒）
            interval: 检查间隔（毫秒）
            
        Returns:
            是否成功等待到服务器就绪
        """
        start_time = time.time()
        
        while (time.time() - start_time) * 1000 < timeout:
            if self.health_check():
                print('[SDK] ✅ 服务器已就绪')
                return True
            time.sleep(interval / 1000)
        
        raise TimeoutError('等待服务器就绪超时')
    
    def _request(self, method: str, path: str, **kwargs) -> Any:
        """
        发送 HTTP 请求
        
        Args:
            method: HTTP 方法
            path: 请求路径
            **kwargs: 传递给 requests 的其他参数
            
        Returns:
            响应 JSON
            
        Raises:
            requests.exceptions.RequestException: 请求失败
        """
        url = urljoin(self.server_url + '/', path.lstrip('/'))
        
        try:
            response = self.session.request(method, url, **kwargs)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            if response.content:
                error_data = response.json()
                raise Exception(error_data.get('message', str(e)))
            raise
        except requests.exceptions.RequestException as e:
            raise Exception(f'请求失败：{str(e)}')


# WebSocket 客户端（需要 websocket-client 库）
try:
    from websocket import create_connection as ws_create
    import threading
    
    class WebSocketAgentClient(AgentClient):
        """支持 WebSocket 的客户端"""
        
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self.ws = None
            self._ws_thread = None
            self._ws_callbacks = {}
        
        def connect_websocket(self) -> None:
            """连接到 WebSocket 服务器"""
            ws_url = self.server_url.replace('http', 'ws').replace('https', 'wss') + '/ws'
            print(f'[SDK] 连接 WebSocket: {ws_url}')
            
            self.ws = ws_create(ws_url)
            
            # 启动接收线程
            self._ws_thread = threading.Thread(target=self._ws_receive_loop, daemon=True)
            self._ws_thread.start()
        
        def disconnect_websocket(self) -> None:
            """断开 WebSocket 连接"""
            if self.ws:
                self.ws.close()
                self.ws = None
        
        def on(self, event_type: str, callback):
            """
            注册事件回调
            
            Args:
                event_type: 事件类型
                callback: 回调函数
            """
            if event_type not in self._ws_callbacks:
                self._ws_callbacks[event_type] = []
            self._ws_callbacks[event_type].append(callback)
        
        def execute_with_progress(self, goal: str, progress_callback=None) -> Dict[str, Any]:
            """
            通过 WebSocket 执行目标（实时进度）
            
            Args:
                goal: 自然语言目标
                progress_callback: 进度回调函数
                
            Returns:
                执行结果
            """
            if not self.ws:
                self.connect_websocket()
            
            result = None
            error = None
            
            def on_completed(message):
                nonlocal result
                result = message.get('result')
            
            def on_failed(message):
                nonlocal error
                error = Exception(message.get('error'))
            
            # 注册一次性回调
            self.on('execution_completed', lambda m: (on_completed(m), self._clear_callbacks()))
            self.on('execution_failed', lambda m: (on_failed(m), self._clear_callbacks()))
            
            if progress_callback:
                self.on('execution_progress', progress_callback)
            
            # 发送执行请求
            message = {
                'type': 'execute_goal',
                'goal': goal,
                'timestamp': int(time.time() * 1000)
            }
            self.ws.send(json.dumps(message))
            
            # 等待完成（轮询检查）
            while result is None and error is None:
                time.sleep(0.1)
            
            if error:
                raise error
            
            return result
        
        def _ws_receive_loop(self):
            """WebSocket 接收循环"""
            while self.ws:
                try:
                    message_data = self.ws.recv()
                    message = json.loads(message_data)
                    
                    # 触发回调
                    event_type = message.get('type')
                    if event_type in self._ws_callbacks:
                        for callback in self._ws_callbacks[event_type]:
                            try:
                                callback(message)
                            except Exception as e:
                                print(f'[SDK] 回调错误：{e}')
                
                except Exception as e:
                    if self.ws:
                        print(f'[SDK] WebSocket 错误：{e}')
                    break
        
        def _clear_callbacks(self):
            """清除所有回调"""
            self._ws_callbacks.clear()
    
except ImportError:
    # websocket-client 未安装
    class WebSocketAgentClient(AgentClient):
        """WebSocket 客户端不可用"""
        
        def connect_websocket(self):
            raise ImportError('需要安装 websocket-client: pip install websocket-client')


# 工厂函数
def create_client(server_url: str = 'http://127.0.0.1:8080', 
                  api_key: Optional[str] = None,
                  use_websocket: bool = False) -> AgentClient:
    """
    创建客户端实例
    
    Args:
        server_url: 服务器地址
        api_key: API Key（可选）
        use_websocket: 是否使用 WebSocket 客户端
        
    Returns:
        客户端实例
    """
    if use_websocket:
        return WebSocketAgentClient(server_url, api_key)
    else:
        return AgentClient(server_url, api_key)


__all__ = ['AgentClient', 'WebSocketAgentClient', 'create_client']
