/**
 * Browser Automation Server - 独立服务模式
 *
 * 提供 HTTP/WebSocket API，用于浏览器自动化
 */

const http = require('http');
const EventEmitter = require('events');
const UnifiedBrowserInterface = require('../src/browser/unified-interface');
const APIClient = require('./api-server');
const WebSocketServer = require('./websocket-server');

class BrowserServer extends EventEmitter {
    /**
     * @param {Object} options - 服务器配置
     * @param {number} options.port - HTTP 端口 (默认 8080)
     * @param {string} options.host - 监听地址 (默认 '127.0.0.1')
     * @param {boolean} options.enableWebSocket - 启用 WebSocket (默认 true)
     * @param {Object} options.browserConfig - 默认浏览器配置
     */
    constructor(options = {}) {
        super();

        this.config = {
            port: options.port || process.env.PORT || 8080,
            host: options.host || process.env.HOST || '127.0.0.1',
            enableWebSocket: options.enableWebSocket ?? true,
            browserConfig: options.browserConfig || {}
        };

        this.state = {
            running: false,
            browser: null
        };

        // 组件
        this.httpServer = null;
        this.wsServer = null;
        this.apiServer = null;

        console.log('[Server] 初始化 BrowserServer...');
        console.log(`[Server] 配置：端口=${this.config.port}, WebSocket=${this.config.enableWebSocket}`);
    }

    /**
     * 启动服务器
     */
    async start() {
        if (this.state.running) {
            throw new Error('服务器已在运行中');
        }

        console.log('\n[Server] ═══════════════════════════════════════');
        console.log('[Server] 启动 Browser Server');
        console.log('[Server] ═══════════════════════════════════════\n');

        // 1. 启动浏览器
        console.log('[Server] 启动浏览器...');
        await this._launchBrowser();

        // 2. 创建 HTTP 服务器
        console.log('[Server] 启动 HTTP 服务器...');
        await this._startHTTPServer();

        // 3. 创建 WebSocket 服务器（可选）
        if (this.config.enableWebSocket) {
            console.log('[Server] 启动 WebSocket 服务器...');
            await this._startWebSocketServer();
        }

        this.state.running = true;

        console.log('\n[Server] ═══════════════════════════════════════');
        console.log(`[Server] ✅ 服务器已启动`);
        console.log(`[Server] HTTP: http://${this.config.host}:${this.config.port}`);
        console.log(`[Server] WebSocket: ws://${this.config.host}:${this.config.port}/ws`);
        console.log(`[Server] API Docs: http://${this.config.host}:${this.config.port}/docs`);
        console.log('[Server] ═══════════════════════════════════════\n');

        this.emit('started');
        return this;
    }

    /**
     * 停止服务器
     */
    async stop() {
        console.log('[Server] 停止服务器...');

        // 关闭浏览器
        if (this.state.browser) {
            try {
                await this.state.browser.close();
            } catch (error) {
                console.error(`[Server] 关闭浏览器失败:`, error.message);
            }
            this.state.browser = null;
        }

        // 关闭 WebSocket 服务器
        if (this.wsServer) {
            await this.wsServer.close();
        }

        // 关闭 HTTP 服务器
        if (this.httpServer) {
            await new Promise((resolve) => {
                this.httpServer.close(resolve);
            });
        }

        this.state.running = false;
        console.log('[Server] ✅ 服务器已停止\n');

        this.emit('stopped');
    }

    /**
     * 获取浏览器实例
     * @returns {UnifiedBrowserInterface} 浏览器实例
     */
    getBrowser() {
        if (!this.state.browser) {
            throw new Error('浏览器未启动');
        }
        return this.state.browser;
    }

    /**
     * 执行网页抓取
     * @param {string} url - 目标 URL
     * @param {Object} options - 抓取选项
     * @returns {Promise<Object>} 抓取结果
     */
    async fetch(url, options = {}) {
        const browser = this.getBrowser();
        
        await browser.goto(url);
        
        if (options.waitFor) {
            await browser.waitFor(options.waitFor);
        }
        
        const content = await browser.content();
        const screenshot = options.screenshot ? await browser.screenshot() : null;
        
        return {
            url,
            content,
            screenshot,
            timestamp: Date.now()
        };
    }

    // ==================== 私有方法 ====================

    /**
     * 启动浏览器
     * @private
     */
    async _launchBrowser() {
        this.state.browser = new UnifiedBrowserInterface({
            backend: this.config.browserConfig.backend || 'chromium',
            headless: this.config.browserConfig.headless ?? false,
            humanize: this.config.browserConfig.humanize ?? true
        });
        
        await this.state.browser.launch();
        console.log('[Server] ✅ 浏览器已启动');
    }

    /**
     * 启动 HTTP 服务器
     * @private
     */
    async _startHTTPServer() {
        this.apiServer = new APIClient(this);

        this.httpServer = http.createServer(async (req, res) => {
            // CORS 头
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

            if (req.method === 'OPTIONS') {
                res.writeHead(204);
                res.end();
                return;
            }

            // API 路由
            await this.apiServer.handleRequest(req, res);
        });

        return new Promise((resolve, reject) => {
            this.httpServer.on('error', reject);
            this.httpServer.listen(this.config.port, this.config.host, resolve);
        });
    }

    /**
     * 启动 WebSocket 服务器
     * @private
     */
    async _startWebSocketServer() {
        this.wsServer = new WebSocketServer(this, this.httpServer);
        await this.wsServer.start();
    }

    /**
     * 获取服务器状态
     * @returns {Object} 状态信息
     */
    getStatus() {
        return {
            running: this.state.running,
            port: this.config.port,
            browserActive: !!this.state.browser,
            uptime: this.state.running ? Date.now() - this.startTime : 0
        };
    }
}

module.exports = BrowserServer;

// 便捷启动函数
async function startServer(options = {}) {
    const server = new BrowserServer(options);
    await server.start();
    return server;
}

module.exports.startServer = startServer;
