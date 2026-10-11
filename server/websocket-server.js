/**
 * WebSocket Server - 实时双向通信
 *
 * 支持：
 * - 实时执行进度推送
 * - 交互式控制
 */

const EventEmitter = require('events');

class WebSocketServer extends EventEmitter {
    constructor(browserServer, httpServer) {
        super();

        this.server = browserServer;
        this.httpServer = httpServer;
        this.wsServer = null;
        this.clients = new Map();

        console.log('[WebSocket] 初始化...');
    }

    /**
     * 启动 WebSocket 服务器
     */
    async start() {
        const WebSocket = require('ws');

        this.wsServer = new WebSocket.Server({
            server: this.httpServer,
            path: '/ws'
        });

        this.wsServer.on('connection', (ws, req) => {
            this._handleConnection(ws, req);
        });

        console.log('[WebSocket] ✅ 已启动');
    }

    /**
     * 关闭服务器
     */
    async close() {
        if (this.wsServer) {
            for (const [id, client] of this.clients.entries()) {
                try {
                    client.ws.close();
                } catch (error) {
                    console.error(`[WebSocket] 关闭连接 ${id} 失败:`, error.message);
                }
            }
            this.clients.clear();

            await new Promise((resolve) => {
                this.wsServer.close(resolve);
            });

            console.log('[WebSocket] ✅ 已关闭');
        }
    }

    /**
     * 广播消息给所有客户端
     */
    broadcast(message) {
        const data = JSON.stringify(message);

        for (const [id, client] of this.clients.entries()) {
            if (client.ws.readyState === 1) {
                client.ws.send(data);
            }
        }
    }

    /**
     * 发送消息给指定客户端
     */
    sendTo(clientId, message) {
        const client = this.clients.get(clientId);
        if (client && client.ws.readyState === 1) {
            client.ws.send(JSON.stringify(message));
        }
    }

    /**
     * 处理新连接
     * @private
     */
    _handleConnection(ws, req) {
        const clientId = this._generateClientId();

        console.log(`[WebSocket] 新连接：${clientId}`);

        const client = {
            id: clientId,
            ws: ws,
            connectedAt: Date.now()
        };

        this.clients.set(clientId, client);

        this._send(ws, {
            type: 'connected',
            clientId: clientId,
            timestamp: Date.now(),
            message: '欢迎连接到 Browser Automation WebSocket 服务'
        });

        ws.on('message', async (data) => {
            await this._handleMessage(client, data);
        });

        ws.on('close', () => {
            console.log(`[WebSocket] 断开连接：${clientId}`);
            this.clients.delete(clientId);
            this.emit('disconnected', clientId);
        });

        ws.on('error', (error) => {
            console.error(`[WebSocket] 错误 (${clientId}):`, error.message);
        });

        this.emit('connected', client);
    }

    /**
     * 处理客户端消息
     * @private
     */
    async _handleMessage(client, data) {
        let message;

        try {
            message = JSON.parse(data.toString());
        } catch (error) {
            return this._send(client.ws, {
                type: 'error',
                error: '无效的 JSON 格式'
            });
        }

        console.log(`[WebSocket] 收到消息 (${client.id}):`, message.type);

        try {
            switch (message.type) {
                case 'navigate':
                    await this._handleNavigate(client, message);
                    break;

                case 'fetch':
                    await this._handleFetch(client, message);
                    break;

                case 'screenshot':
                    await this._handleScreenshot(client, message);
                    break;

                case 'ping':
                    this._send(client.ws, { type: 'pong', timestamp: Date.now() });
                    break;

                default:
                    this._send(client.ws, {
                        type: 'error',
                        error: `未知的消息类型：${message.type}`
                    });
            }
        } catch (error) {
            this._send(client.ws, {
                type: 'error',
                error: error.message,
                originalType: message.type
            });
        }
    }

    /**
     * 导航到 URL
     * @private
     */
    async _handleNavigate(client, message) {
        const { url } = message;

        if (!url) {
            return this._send(client.ws, {
                type: 'error',
                error: '缺少必要参数：url'
            });
        }

        this._send(client.ws, {
            type: 'navigating',
            url: url,
            timestamp: Date.now()
        });

        const browser = this.server.getBrowser();
        await browser.goto(url);

        this._send(client.ws, {
            type: 'navigated',
            url: url,
            timestamp: Date.now()
        });
    }

    /**
     * 抓取 URL
     * @private
     */
    async _handleFetch(client, message) {
        const { url, waitFor, screenshot } = message;

        if (!url) {
            return this._send(client.ws, {
                type: 'error',
                error: '缺少必要参数：url'
            });
        }

        this._send(client.ws, {
            type: 'fetching',
            url: url,
            timestamp: Date.now()
        });

        try {
            const result = await this.server.fetch(url, { waitFor, screenshot });

            this._send(client.ws, {
                type: 'fetched',
                result: result,
                timestamp: Date.now()
            });
        } catch (error) {
            this._send(client.ws, {
                type: 'fetch_error',
                error: error.message,
                timestamp: Date.now()
            });
        }
    }

    /**
     * 截图
     * @private
     */
    async _handleScreenshot(client, message) {
        const browser = this.server.getBrowser();
        const screenshot = await browser.screenshot({
            encoding: message.encoding || 'base64'
        });

        this._send(client.ws, {
            type: 'screenshot',
            screenshot: screenshot,
            timestamp: Date.now()
        });
    }

    /**
     * 发送 WebSocket 消息
     * @private
     */
    _send(ws, message) {
        if (ws.readyState === 1) {
            ws.send(JSON.stringify(message));
        }
    }

    /**
     * 生成客户端 ID
     * @private
     */
    _generateClientId() {
        return `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 获取连接的客户端列表
     */
    getClients() {
        return Array.from(this.clients.values()).map(client => ({
            id: client.id,
            connectedAt: client.connectedAt
        }));
    }
}

module.exports = WebSocketServer;
