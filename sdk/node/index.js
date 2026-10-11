/**
 * Browser Agent SDK - Node.js 客户端
 * 
 * 轻量级客户端，用于连接 Browser Agent Server
 */

const http = require('http');
const https = require('https');
const EventEmitter = require('events');
const WebSocket = require('ws');

class AgentClient extends EventEmitter {
    /**
     * @param {string} serverUrl - 服务器地址 (默认 http://127.0.0.1:8080)
     * @param {Object} options - 配置选项
     */
    constructor(serverUrl = 'http://127.0.0.1:8080', options = {}) {
        super();
        
        this.serverUrl = new URL(serverUrl);
        this.apiKey = options.apiKey || process.env.AGENT_API_KEY;
        this.defaultTimeout = options.timeout || 300000; // 5 分钟
        this.currentAgentId = null;
    }

    /**
     * 执行目标（便捷方法，自动管理 Agent）
     * @param {string} goal - 自然语言目标
     * @param {Object} options - 执行选项
     * @returns {Promise<Object>} 执行结果
     */
    async execute(goal, options = {}) {
        console.log(`[SDK] 执行目标：${goal}`);
        
        const result = await this._request('POST', '/execute', {
            goal,
            config: options.config
        });

        return result;
    }

    /**
     * 创建新的 Agent 实例
     * @param {Object} config - Agent 配置
     * @returns {Promise<string>} Agent ID
     */
    async createAgent(config = {}) {
        const response = await this._request('POST', '/agents', { config });
        this.currentAgentId = response.agentId;
        console.log(`[SDK] 创建 Agent: ${this.currentAgentId}`);
        return this.currentAgentId;
    }

    /**
     * 获取 Agent 状态
     * @param {string} agentId - Agent ID（可选，默认使用当前 Agent）
     * @returns {Promise<Object>} Agent 状态
     */
    async getAgentStatus(agentId = this.currentAgentId) {
        if (!agentId) {
            throw new Error('未指定 Agent ID');
        }
        return await this._request('GET', `/agents/${agentId}`);
    }

    /**
     * 在指定 Agent 上执行目标
     * @param {string} goal - 自然语言目标
     * @param {string} agentId - Agent ID（可选）
     * @returns {Promise<Object>} 执行结果
     */
    async executeOn(goal, agentId = this.currentAgentId) {
        if (!agentId) {
            throw new Error('未指定 Agent ID');
        }
        return await this._request('POST', `/agents/${agentId}/execute`, { goal });
    }

    /**
     * 销毁 Agent
     * @param {string} agentId - Agent ID（可选）
     */
    async destroyAgent(agentId = this.currentAgentId) {
        if (!agentId) {
            throw new Error('未指定 Agent ID');
        }
        await this._request('DELETE', `/agents/${agentId}`);
        console.log(`[SDK] 销毁 Agent: ${agentId}`);
        if (this.currentAgentId === agentId) {
            this.currentAgentId = null;
        }
    }

    /**
     * 获取可用工具列表
     * @returns {Promise<Array>} 工具列表
     */
    async getTools() {
        return await this._request('GET', '/tools');
    }

    /**
     * 注册自定义工具
     * @param {Object} toolDefinition - 工具定义
     */
    async registerTool(toolDefinition) {
        return await this._request('POST', '/tools', toolDefinition);
    }

    /**
     * 获取服务器状态
     * @returns {Promise<Object>} 服务器状态
     */
    async getStatus() {
        return await this._request('GET', '/status');
    }

    /**
     * 健康检查
     * @returns {Promise<boolean>} 是否健康
     */
    async healthCheck() {
        try {
            const result = await this._request('GET', '/health');
            return result.status === 'ok';
        } catch {
            return false;
        }
    }

    /**
     * 等待服务器就绪
     * @param {number} timeout - 超时时间（毫秒）
     * @param {number} interval - 检查间隔（毫秒）
     */
    async waitForServer(timeout = 10000, interval = 500) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            if (await this.healthCheck()) {
                console.log('[SDK] ✅ 服务器已就绪');
                return true;
            }
            await this._sleep(interval);
        }
        
        throw new Error('等待服务器就绪超时');
    }

    // ==================== WebSocket 支持 ====================

    /**
     * 连接到 WebSocket
     * @returns {Promise<WebSocket>} WebSocket 实例
     */
    async connectWebSocket() {
        const wsUrl = this.serverUrl.toString().replace('http', 'ws') + '/ws';
        console.log(`[SDK] 连接 WebSocket: ${wsUrl}`);

        return new Promise((resolve, reject) => {
            const ws = new WebSocket(wsUrl);

            ws.on('open', () => {
                console.log('[SDK] ✅ WebSocket 已连接');
                resolve(ws);
            });

            ws.on('error', reject);

            ws.on('message', (data) => {
                const message = JSON.parse(data.toString());
                this.emit('message', message);
                
                // 自动转发特定事件
                if (message.type) {
                    this.emit(message.type, message);
                }
            });
        });
    }

    /**
     * 通过 WebSocket 执行目标（实时进度）
     * @param {string} goal - 自然语言目标
     * @returns {Promise<Object>} 执行结果
     */
    async executeWithProgress(goal) {
        return new Promise(async (resolve, reject) => {
            const ws = await this.connectWebSocket();

            const cleanup = () => {
                ws.removeAllListeners();
                ws.close();
            };

            // 设置一次性监听器
            ws.once('execution_completed', (message) => {
                cleanup();
                resolve(message.result);
            });

            ws.once('execution_failed', (message) => {
                cleanup();
                reject(new Error(message.error));
            });

            ws.once('error', (error) => {
                cleanup();
                reject(error);
            });

            // 发送执行请求
            ws.send(JSON.stringify({
                type: 'execute_goal',
                goal: goal,
                timestamp: Date.now()
            }));
        });
    }

    // ==================== 私有方法 ====================

    /**
     * 发送 HTTP 请求
     * @private
     */
    async _request(method, path, body = null) {
        const url = new URL(path, this.serverUrl);
        const isHttps = url.protocol === 'https:';
        const lib = isHttps ? https : http;

        return new Promise((resolve, reject) => {
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            if (this.apiKey) {
                options.headers['Authorization'] = `Bearer ${this.apiKey}`;
            }

            const req = lib.request(url, options, (res) => {
                let data = '';
                
                res.on('data', chunk => data += chunk);
                
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        
                        if (res.statusCode >= 400) {
                            reject(new Error(parsed.message || `HTTP ${res.statusCode}`));
                        } else {
                            resolve(parsed);
                        }
                    } catch (error) {
                        reject(new Error('响应解析失败'));
                    }
                });
            });

            req.on('error', reject);

            if (body && method !== 'GET') {
                req.write(JSON.stringify(body));
            }

            req.end();
        });
    }

    /**
     * 休眠
     * @private
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 便捷工厂函数
function createClient(serverUrl, options = {}) {
    return new AgentClient(serverUrl, options);
}

module.exports = {
    AgentClient,
    createClient
};

// 默认导出
module.exports.default = AgentClient;
