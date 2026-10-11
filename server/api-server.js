/**
 * API Server - HTTP REST API 实现
 *
 * 提供标准的 RESTful 接口
 */

const url = require('url');

class APIServer {
    constructor(browserServer) {
        this.server = browserServer;
        this.routes = this._initRoutes();
    }

    /**
     * 处理 HTTP 请求
     */
    async handleRequest(req, res) {
        const parsedUrl = url.parse(req.url, true);
        const pathname = parsedUrl.pathname;
        const method = req.method;

        console.log(`[API] ${method} ${pathname}`);

        try {
            // 查找路由
            const route = this.routes.find(r =>
                r.method === method &&
                this._matchPath(r.path, pathname)
            );

            if (!route) {
                return this._sendError(res, 404, 'Not Found');
            }

            // 解析请求体
            let body = null;
            if (['POST', 'PUT'].includes(method)) {
                body = await this._parseBody(req);
            }

            // 调用处理器
            const params = this._extractParams(route.path, pathname);
            const result = await route.handler({
                params,
                query: parsedUrl.query,
                body,
                headers: req.headers
            });

            // 发送响应
            this._sendJSON(res, 200, result);

        } catch (error) {
            console.error('[API] 错误:', error);
            this._sendError(res, error.statusCode || 500, error.message);
        }
    }

    /**
     * 初始化路由
     * @private
     */
    _initRoutes() {
        return [
            // ===== 健康检查 =====
            {
                method: 'GET',
                path: '/health',
                handler: () => ({
                    status: 'ok',
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime()
                })
            },

            // ===== 服务器状态 =====
            {
                method: 'GET',
                path: '/status',
                handler: () => this.server.getStatus()
            },

            // ===== API 文档 =====
            {
                method: 'GET',
                path: '/docs',
                handler: () => this._getDocs()
            },

            // ===== 浏览器控制 =====

            // 导航到 URL
            {
                method: 'POST',
                path: '/navigate',
                handler: async (req) => {
                    const { url } = req.body || {};
                    if (!url) {
                        throw new Error('缺少必要参数：url');
                    }
                    const browser = this.server.getBrowser();
                    await browser.goto(url);
                    return { success: true, url };
                }
            },

            // 获取页面内容
            {
                method: 'GET',
                path: '/content',
                handler: async () => {
                    const browser = this.server.getBrowser();
                    const content = await browser.content();
                    return { content };
                }
            },

            // 截图
            {
                method: 'GET',
                path: '/screenshot',
                handler: async (req) => {
                    const browser = this.server.getBrowser();
                    const screenshot = await browser.screenshot({
                        encoding: req.query.encoding || 'base64'
                    });
                    return { screenshot };
                }
            },

            // 点击元素
            {
                method: 'POST',
                path: '/click',
                handler: async (req) => {
                    const { selector } = req.body || {};
                    if (!selector) {
                        throw new Error('缺少必要参数：selector');
                    }
                    const browser = this.server.getBrowser();
                    await browser.click(selector);
                    return { success: true, selector };
                }
            },

            // 输入文本
            {
                method: 'POST',
                path: '/type',
                handler: async (req) => {
                    const { selector, text } = req.body || {};
                    if (!selector || !text) {
                        throw new Error('缺少必要参数：selector, text');
                    }
                    const browser = this.server.getBrowser();
                    await browser.type(selector, text);
                    return { success: true, selector, text };
                }
            },

            // ===== 网页抓取 =====

            // 抓取 URL
            {
                method: 'POST',
                path: '/fetch',
                handler: async (req) => {
                    const { url, waitFor, screenshot } = req.body || {};
                    if (!url) {
                        throw new Error('缺少必要参数：url');
                    }
                    const result = await this.server.fetch(url, { waitFor, screenshot });
                    return result;
                }
            }
        ];
    }

    /**
     * 路径匹配（支持参数）
     * @private
     */
    _matchPath(pattern, pathname) {
        const patternParts = pattern.split('/');
        const pathnameParts = pathname.split('/');

        if (patternParts.length !== pathnameParts.length) {
            return false;
        }

        for (let i = 0; i < patternParts.length; i++) {
            if (patternParts[i].startsWith(':')) {
                continue; // 动态参数，总是匹配
            }
            if (patternParts[i] !== pathnameParts[i]) {
                return false;
            }
        }

        return true;
    }

    /**
     * 提取路径参数
     * @private
     */
    _extractParams(pattern, pathname) {
        const params = {};
        const patternParts = pattern.split('/');
        const pathnameParts = pathname.split('/');

        for (let i = 0; i < patternParts.length; i++) {
            if (patternParts[i].startsWith(':')) {
                const paramName = patternParts[i].slice(1);
                params[paramName] = pathnameParts[i];
            }
        }

        return params;
    }

    /**
     * 解析请求体
     * @private
     */
    async _parseBody(req) {
        return new Promise((resolve, reject) => {
            let body = '';

            req.on('data', chunk => {
                body += chunk.toString();
                if (body.length > 1e6) { // 限制 1MB
                    reject(new Error('请求体过大'));
                }
            });

            req.on('end', () => {
                try {
                    resolve(body ? JSON.parse(body) : null);
                } catch (error) {
                    reject(new Error('无效的 JSON'));
                }
            });

            req.on('error', reject);
        });
    }

    /**
     * 发送 JSON 响应
     * @private
     */
    _sendJSON(res, statusCode, data) {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    }

    /**
     * 发送错误响应
     * @private
     */
    _sendError(res, statusCode, message) {
        this._sendJSON(res, statusCode, {
            error: true,
            statusCode,
            message
        });
    }

    /**
     * 获取 API 文档
     * @private
     */
    _getDocs() {
        return {
            name: 'Browser Automation API',
            version: '2.0.0',
            endpoints: [
                {
                    method: 'GET',
                    path: '/health',
                    description: '健康检查'
                },
                {
                    method: 'GET',
                    path: '/status',
                    description: '获取服务器状态'
                },
                {
                    method: 'POST',
                    path: '/navigate',
                    description: '导航到指定 URL',
                    body: { url: '目标 URL' }
                },
                {
                    method: 'GET',
                    path: '/content',
                    description: '获取当前页面内容'
                },
                {
                    method: 'GET',
                    path: '/screenshot',
                    description: '截取当前页面截图',
                    query: { encoding: 'base64 或 binary' }
                },
                {
                    method: 'POST',
                    path: '/click',
                    description: '点击页面元素',
                    body: { selector: 'CSS 选择器' }
                },
                {
                    method: 'POST',
                    path: '/type',
                    description: '在输入框输入文本',
                    body: { selector: 'CSS 选择器', text: '要输入的文本' }
                },
                {
                    method: 'POST',
                    path: '/fetch',
                    description: '抓取指定 URL',
                    body: { url: '目标 URL', waitFor: '等待条件', screenshot: '是否截图' }
                }
            ],
            examples: {
                curl: [
                    'curl http://localhost:8080/health',
                    'curl -X POST http://localhost:8080/navigate -H "Content-Type: application/json" -d \'{"url": "https://example.com"}\'',
                    'curl http://localhost:8080/content',
                    'curl -X POST http://localhost:8080/fetch -H "Content-Type: application/json" -d \'{"url": "https://example.com", "screenshot": true}\''
                ]
            }
        };
    }
}

module.exports = APIServer;
