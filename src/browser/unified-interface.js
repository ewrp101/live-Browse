/**
 * 统一浏览器接口层
 * 
 * 封装 HumanBrowser，提供标准化的 API
 * 支持 Lightpanda 和 Chromium 两种后端
 */

const HumanBrowser = require('../../human-browser');

class UnifiedBrowserInterface {
    /**
     * @param {Object} options - 配置选项
     * @param {'lightpanda'|'chromium'} options.backend - 浏览器后端
     * @param {boolean} options.headless - 是否无头模式
     * @param {boolean} options.humanize - 是否模拟人类行为
     * @param {string} options.lightpandaEndpoint - Lightpanda CDP 端点
     */
    constructor(options = {}) {
        this.options = {
            backend: options.backend || 'chromium',
            headless: options.headless ?? false,
            humanize: options.humanize ?? true,
            lightpandaEndpoint: options.lightpandaEndpoint || 'http://127.0.0.1:9222',
            viewport: options.viewport || { width: 1920, height: 1080 }
        };

        this.humanBrowser = null;
        this.cdpSession = null;
        this.networkRequests = [];
        this.consoleLogs = [];
    }

    /**
     * 启动浏览器
     */
    async launch() {
        console.log(`[Browser] 启动 ${this.options.backend} 后端...`);
        
        this.humanBrowser = new HumanBrowser({
            backend: this.options.backend,
            headless: this.options.headless,
            humanize: this.options.humanize,
            lightpandaEndpoint: this.options.lightpandaEndpoint,
            viewport: this.options.viewport
        });

        await this.humanBrowser.launch();
        
        // 如果使用 Lightpanda，设置额外的 CDP 会话
        if (this.options.backend === 'lightpanda') {
            await this._setupCDPSession();
        }

        // 设置事件监听
        this._setupEventListeners();

        console.log('[Browser] 启动成功');
        return this;
    }

    /**
     * 设置 CDP 会话（仅 Lightpanda）
     * @private
     */
    async _setupCDPSession() {
        try {
            const page = this.humanBrowser.rawPage;
            this.cdpSession = await page.context().newCDPSession(page);
            
            // 启用网络监控
            await this.cdpSession.send('Network.enable');
            
            // 监听网络请求
            this.cdpSession.on('Network.requestWillBeSent', (params) => {
                this.networkRequests.push({
                    timestamp: Date.now(),
                    type: 'request',
                    url: params.request.url,
                    method: params.request.method,
                    requestId: params.requestId
                });
            });

            this.cdpSession.on('Network.responseReceived', (params) => {
                this.networkRequests.push({
                    timestamp: Date.now(),
                    type: 'response',
                    url: params.response.url,
                    status: params.response.status,
                    requestId: params.requestId
                });
            });

            // 启用控制台日志
            await this.cdpSession.send('Runtime.enable');
            
            this.cdpSession.on('Runtime.consoleAPICalled', (params) => {
                const args = params.args.map(a => a.value || a.description).join(' ');
                this.consoleLogs.push({
                    timestamp: Date.now(),
                    type: params.type,
                    message: args
                });
            });

            console.log('[CDP] 会话已建立，监控已启用');
        } catch (error) {
            console.warn('[CDP] 设置失败:', error.message);
        }
    }

    /**
     * 设置事件监听
     * @private
     */
    _setupEventListeners() {
        const page = this.humanBrowser.rawPage;

        // 页面导航事件
        page.on('framenavigated', (frame) => {
            if (frame === page.mainFrame()) {
                console.log(`[Browser] 导航到：${frame.url()}`);
            }
        });

        // 对话框事件
        page.on('dialog', async (dialog) => {
            console.log(`[Dialog] ${dialog.type()}: ${dialog.message()}`);
            // 默认接受所有对话框
            await dialog.accept();
        });

        // 页面错误事件
        page.on('pageerror', (error) => {
            console.error(`[PageError] ${error.message}`);
            this.consoleLogs.push({
                timestamp: Date.now(),
                type: 'error',
                message: error.message
            });
        });
    }

    // ==================== 基本导航 ====================

    /**
     * 导航到 URL
     */
    async goto(url, options = {}) {
        return this.humanBrowser.goto(url, options);
    }

    /**
     * 获取当前 URL
     */
    url() {
        return this.humanBrowser.rawPage.url();
    }

    /**
     * 获取页面标题
     */
    async title() {
        return this.humanBrowser.rawPage.title();
    }

    /**
     * 刷新页面
     */
    async reload() {
        return this.humanBrowser.rawPage.reload();
    }

    /**
     * 返回上一页
     */
    async goBack() {
        return this.humanBrowser.rawPage.goBack();
    }

    /**
     * 前进一页
     */
    async goForward() {
        return this.humanBrowser.rawPage.goForward();
    }

    // ==================== 元素交互 ====================

    /**
     * 点击元素
     */
    async click(selector, options = {}) {
        const { strategy = 'css', clickCount = 1 } = options;
        
        const locator = this._getLocator(selector, strategy);
        
        if (clickCount === 2) {
            await locator.dblclick();
        } else {
            await locator.click({ clickCount });
        }
        
        return this;
    }

    /**
     * 输入文本
     */
    async type(selector, text, options = {}) {
        const { humanize = true, clear = true } = options;
        
        if (humanize) {
            await this.humanBrowser.humanType(selector, text, { clear });
        } else {
            const locator = this._getLocator(selector, 'css');
            if (clear) {
                await locator.fill('');
            }
            await locator.type(text);
        }
        
        return this;
    }

    /**
     * 按下按键
     */
    async pressKey(key, options = {}) {
        const { delay = 50 } = options;
        await this.humanBrowser.rawPage.keyboard.press(key, { delay });
        return this;
    }

    /**
     * 悬停
     */
    async hover(selector, options = {}) {
        const { humanize = true } = options;
        
        if (humanize) {
            await this.humanBrowser.humanHover(selector);
        } else {
            const locator = this._getLocator(selector, 'css');
            await locator.hover();
        }
        
        return this;
    }

    /**
     * 滚动
     */
    async scroll(direction = 'down', amount = 300, options = {}) {
        const { humanize = true } = options;
        
        if (humanize && direction === 'down') {
            await this.humanBrowser.humanScroll(direction, amount);
        } else {
            const page = this.humanBrowser.rawPage;
            const delta = direction === 'up' || direction === 'left' ? -amount : amount;
            const x = direction === 'left' || direction === 'right' ? delta : 0;
            const y = direction === 'up' || direction === 'down' ? delta : 0;
            
            await page.mouse.wheel(x, y);
        }
        
        return this;
    }

    /**
     * 选择下拉选项
     */
    async selectOption(selector, value) {
        await this.humanBrowser.select(selector, value);
        return this;
    }

    /**
     * 勾选复选框
     */
    async check(selector) {
        await this.humanBrowser.check(selector);
        return this;
    }

    /**
     * 取消勾选
     */
    async uncheck(selector) {
        const isChecked = await this.humanBrowser.rawPage.isChecked(selector);
        if (isChecked) {
            await this.humanBrowser.check(selector);
        }
        return this;
    }

    /**
     * 上传文件
     */
    async uploadFile(selector, filePath) {
        const input = await this.humanBrowser.rawPage.$(selector);
        await input.setInputFiles(filePath);
        return this;
    }

    // ==================== 验证 ====================

    /**
     * 验证断言
     */
    async verify(assertionType, options = {}) {
        const { target, expected } = options;
        const page = this.humanBrowser.rawPage;

        switch (assertionType) {
            case 'visible':
                const visible = await page.isVisible(target);
                return { passed: visible, actual: visible ? 'visible' : 'hidden' };
            
            case 'hidden':
                const hidden = await page.isHidden(target);
                return { passed: hidden, actual: hidden ? 'hidden' : 'visible' };
            
            case 'text':
                const locator = this._getLocator(target, 'css');
                const actualText = await locator.textContent();
                const passed = actualText?.includes(expected);
                return { 
                    passed, 
                    actual: actualText?.trim(),
                    expected 
                };
            
            case 'url':
                const currentUrl = this.url();
                const urlPassed = expected ? currentUrl.includes(expected) : true;
                return { 
                    passed: urlPassed, 
                    actual: currentUrl,
                    expected 
                };
            
            case 'title':
                const currentTitle = await this.title();
                const titlePassed = expected ? currentTitle.includes(expected) : true;
                return { 
                    passed: titlePassed, 
                    actual: currentTitle,
                    expected 
                };
            
            case 'count':
                const count = await page.count(target);
                const expectedCount = parseInt(expected);
                return { 
                    passed: count === expectedCount, 
                    actual: count,
                    expected: expectedCount 
                };
            
            default:
                throw new Error(`Unknown assertion type: ${assertionType}`);
        }
    }

    // ==================== 等待 ====================

    /**
     * 等待时间
     */
    async wait(ms) {
        await this.humanBrowser.wait(ms);
        return this;
    }

    /**
     * 等待条件
     */
    async waitFor(condition, options = {}) {
        const { timeout = 30000 } = options;
        const page = this.humanBrowser.rawPage;

        switch (condition) {
            case 'navigation':
                await page.waitForNavigation({ timeout });
                break;
            
            case 'load':
                await page.waitForLoadState('domcontentloaded', { timeout });
                break;
            
            case 'networkidle':
                await page.waitForLoadState('networkidle', { timeout });
                break;
            
            default:
                // 假设是 selector
                if (condition.startsWith('/')) {
                    // XPath
                    await page.waitForSelector(condition, { state: 'visible', timeout });
                } else {
                    // CSS
                    await page.waitForSelector(condition, { state: 'visible', timeout });
                }
        }
        
        return this;
    }

    // ==================== 截图和快照 ====================

    /**
     * 截图
     */
    async screenshot(options = {}) {
        const { path, fullPage = false, encoding = 'base64' } = options;
        
        const screenshot = await this.humanBrowser.rawPage.screenshot({
            path,
            fullPage,
            type: 'png'
        });

        if (encoding === 'base64') {
            return screenshot.toString('base64');
        }
        
        return screenshot;
    }

    /**
     * 生成 Aria 快照
     */
    async snapshot(options = {}) {
        const { full = false, includeText = true, format = 'yaml' } = options;
        
        const ariaSnapshot = await this._generateAriaSnapshot(full, includeText);
        
        let yaml = '';
        if (format === 'yaml') {
            yaml = this._toYamlFormat(ariaSnapshot);
        }

        return {
            aria: ariaSnapshot,
            yaml,
            elementCount: this._countElements(ariaSnapshot),
            summary: this._summarizeSnapshot(ariaSnapshot)
        };
    }

    /**
     * 生成 Aria 快照（内部方法）
     * @private
     */
    async _generateAriaSnapshot(full = false, includeText = true) {
        const page = this.humanBrowser.rawPage;
        
        const snapshot = await page.evaluate((fullMode, includeTextMode) => {
            function inferImplicitRole(tagName) {
                const roleMap = {
                    'A': 'link',
                    'BUTTON': 'button',
                    'INPUT': 'textbox',
                    'SELECT': 'combobox',
                    'TEXTAREA': 'textbox',
                    'H1': 'heading',
                    'H2': 'heading',
                    'H3': 'heading',
                    'H4': 'heading',
                    'H5': 'heading',
                    'H6': 'heading',
                    'IMG': 'img',
                    'NAV': 'navigation',
                    'MAIN': 'main',
                    'FOOTER': 'contentinfo',
                    'HEADER': 'banner',
                    'ARTICLE': 'article',
                    'SECTION': 'region',
                    'ASIDE': 'complementary',
                    'FORM': 'form',
                    'TABLE': 'table',
                    'LI': 'listitem',
                    'UL': 'list',
                    'OL': 'list'
                };
                return roleMap[tagName] || null;
            }

            function getAccessibleName(element) {
                // 尝试多种方法获取可访问名称
                const ariaLabel = element.getAttribute('aria-label');
                if (ariaLabel) return ariaLabel.trim();

                const ariaLabelledBy = element.getAttribute('aria-labelledby');
                if (ariaLabelledBy) {
                    const labelElement = document.getElementById(ariaLabelledBy);
                    if (labelElement) return labelElement.textContent.trim();
                }

                // 对于表单元素，查找关联的 label
                const id = element.id;
                if (id) {
                    const label = document.querySelector(`label[for="${id}"]`);
                    if (label) return label.textContent.trim();
                }

                // 使用 placeholder 或 title
                const placeholder = element.getAttribute('placeholder');
                if (placeholder) return placeholder.trim();

                const title = element.getAttribute('title');
                if (title) return title.trim();

                // 对于按钮和链接，使用文本内容
                if (['A', 'BUTTON'].includes(element.tagName)) {
                    return element.textContent.trim().substring(0, 50);
                }

                // 对于图片，使用 alt
                if (element.tagName === 'IMG') {
                    const alt = element.getAttribute('alt');
                    if (alt) return alt.trim();
                }

                return '';
            }

            function isInteractive(element) {
                const interactiveTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
                if (interactiveTags.includes(element.tagName)) return true;
                
                const role = element.getAttribute('role');
                const interactiveRoles = ['button', 'link', 'checkbox', 'radio', 'textbox', 'combobox', 'menuitem'];
                return role && interactiveRoles.includes(role);
            }

            function isContent(element) {
                const contentTags = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'SPAN', 'DIV', 'LI', 'TD', 'TH'];
                return contentTags.includes(element.tagName);
            }

            function extractAttributes(element) {
                const attrs = {};
                
                // 提取重要属性
                const importantAttrs = ['disabled', 'required', 'checked', 'selected', 'readonly', 'expanded', 'pressed'];
                importantAttrs.forEach(attr => {
                    if (element.hasAttribute(attr)) {
                        attrs[attr] = element.getAttribute(attr);
                    }
                });

                // 提取值
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    const value = element.value;
                    if (value) attrs.value = value.substring(0, 100);
                }

                return attrs;
            }

            function buildAriaNode(element, depth = 0) {
                const explicitRole = element.getAttribute('role');
                const implicitRole = inferImplicitRole(element.tagName);
                const role = explicitRole || implicitRole || element.tagName.toLowerCase();
                
                const name = getAccessibleName(element);
                const attributes = extractAttributes(element);
                
                const node = {
                    role,
                    name: name || null,
                    tagName: element.tagName.toLowerCase(),
                    attributes,
                    children: [],
                    ref: `${role}-${depth}-${element.tagName.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    interactive: isInteractive(element)
                };

                // 递归处理子元素
                if (fullMode || isInteractive(element) || isContent(element)) {
                    for (const child of element.children) {
                        // 跳过隐藏元素
                        const style = window.getComputedStyle(child);
                        if (style.display === 'none' || style.visibility === 'hidden') continue;

                        node.children.push(buildAriaNode(child, depth + 1));
                    }
                }

                return node;
            }

            return buildAriaNode(document.body);
        }, full, includeText);

        return snapshot;
    }

    /**
     * 转换为 YAML 格式
     * @private
     */
    _toYamlFormat(node, indent = 0) {
        let yaml = '';
        const prefix = '  '.repeat(indent);
        const interactiveMarker = node.interactive ? ' [interactive]' : '';
        const nameStr = node.name ? ` "${node.name}"` : '';
        
        yaml += `${prefix}- ${node.role}${nameStr}${interactiveMarker}\n`;
        
        if (node.attributes && Object.keys(node.attributes).length > 0) {
            yaml += `${prefix}  attributes:\n`;
            for (const [key, value] of Object.entries(node.attributes)) {
                yaml += `${prefix}    ${key}: ${value}\n`;
            }
        }

        if (node.children && node.children.length > 0) {
            node.children.forEach(child => {
                yaml += this._toYamlFormat(child, indent + 1);
            });
        }

        return yaml;
    }

    /**
     * 计算元素数量
     * @private
     */
    _countElements(node) {
        let count = 1;
        if (node.children) {
            count += node.children.reduce((sum, child) => sum + this._countElements(child), 0);
        }
        return count;
    }

    /**
     * 生成快照摘要
     * @private
     */
    _summarizeSnapshot(node) {
        const summary = {
            interactiveElements: 0,
            headings: 0,
            links: 0,
            buttons: 0,
            inputs: 0
        };

        const traverse = (n) => {
            if (n.interactive) summary.interactiveElements++;
            if (n.role === 'heading') summary.headings++;
            if (n.role === 'link') summary.links++;
            if (n.role === 'button') summary.buttons++;
            if (['textbox', 'combobox'].includes(n.role)) summary.inputs++;
            
            n.children?.forEach(traverse);
        };

        traverse(node);
        return summary;
    }

    // ==================== JavaScript 执行 ====================

    /**
     * 执行 JavaScript
     */
    async evaluate(script, ...args) {
        if (typeof script === 'string') {
            return await this.humanBrowser.rawPage.evaluate(script, ...args);
        } else {
            return await this.humanBrowser.rawPage.evaluate(script, ...args);
        }
    }

    // ==================== 页面内容 ====================

    /**
     * 获取页面 HTML 内容
     */
    async content() {
        return await this.humanBrowser.rawPage.content();
    }

    // ==================== 标签页管理 ====================

    /**
     * 打开新标签页
     */
    async newTab(url) {
        const newPage = await this.humanBrowser.newTab(url);
        return newPage;
    }

    /**
     * 关闭当前标签页
     */
    async closeTab() {
        await this.humanBrowser.rawPage.close();
    }

    /**
     * 切换到指定标签页
     */
    async switchToTab(index) {
        const pages = this.humanBrowser.rawPage.context().pages();
        if (index >= 0 && index < pages.length) {
            await pages[index].bringToFront();
        }
    }

    // ==================== 辅助方法 ====================

    /**
     * 获取 Locator
     * @private
     */
    _getLocator(selector, strategy) {
        const page = this.humanBrowser.rawPage;
        
        switch (strategy) {
            case 'css':
                return page.locator(selector);
            
            case 'xpath':
                return page.locator(`xpath=${selector}`);
            
            case 'aria':
                return page.locator(`aria=${selector}`);
            
            case 'text':
                return page.getByText(selector);
            
            case 'role':
                const match = selector.match(/(\w+)\s*(?:\((.*)\))?/);
                if (match) {
                    const role = match[1].toLowerCase();
                    const options = match[2] ? JSON.parse(`{${match[2]}}`) : {};
                    return page.getByRole(role, options);
                }
                return page.locator(selector);
            
            default:
                return page.locator(selector);
        }
    }

    /**
     * 获取网络请求历史
     */
    getNetworkHistory() {
        return this.networkRequests;
    }

    /**
     * 获取控制台日志
     */
    getConsoleLogs() {
        return this.consoleLogs;
    }

    /**
     * 清除历史记录
     */
    clearHistory() {
        this.networkRequests = [];
        this.consoleLogs = [];
    }

    /**
     * 关闭浏览器
     */
    async close() {
        console.log('[Browser] 关闭浏览器...');
        await this.humanBrowser.close();
    }

    /**
     * 获取原始页面对象
     */
    get rawPage() {
        return this.humanBrowser.rawPage;
    }
}

module.exports = UnifiedBrowserInterface;
