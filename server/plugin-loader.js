/**
 * Plugin Loader - 插件加载器
 * 
 * 动态加载 plugins/ 目录下的自定义工具
 * 支持热插拔，无需重启服务
 */

const fs = require('fs');
const path = require('path');

class PluginLoader {
    /**
     * @param {string} pluginsDir - 插件目录路径
     */
    constructor(pluginsDir = './plugins') {
        this.pluginsDir = path.resolve(pluginsDir);
        this.tools = [];
        this.loadedPlugins = new Map();
        
        console.log('[PluginLoader] 初始化...');
        console.log(`[PluginLoader] 插件目录：${this.pluginsDir}`);
    }

    /**
     * 加载所有插件
     */
    async load() {
        // 确保插件目录存在
        if (!fs.existsSync(this.pluginsDir)) {
            console.log('[PluginLoader] 插件目录不存在，创建目录...');
            fs.mkdirSync(this.pluginsDir, { recursive: true });
            
            // 创建示例插件
            await this._createExamplePlugin();
            return;
        }

        // 读取插件目录
        const files = fs.readdirSync(this.pluginsDir);
        
        console.log(`[PluginLoader] 扫描到 ${files.length} 个文件`);

        for (const file of files) {
            // 跳过非 JS 文件和目录
            if (!file.endsWith('.js') || file.startsWith('.')) {
                continue;
            }

            try {
                const pluginPath = path.join(this.pluginsDir, file);
                await this._loadPlugin(pluginPath, file);
            } catch (error) {
                console.error(`[PluginLoader] ❌ 加载插件 ${file} 失败:`, error.message);
            }
        }

        console.log(`[PluginLoader] ✅ 已加载 ${this.tools.length} 个工具`);
    }

    /**
     * 从指定目录加载插件
     * @param {string} dirPath - 目录路径
     */
    async loadFrom(dirPath) {
        const absolutePath = path.resolve(dirPath);
        
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`目录不存在：${absolutePath}`);
        }

        const oldDir = this.pluginsDir;
        this.pluginsDir = absolutePath;
        
        try {
            await this.load();
        } finally {
            this.pluginsDir = oldDir;
        }
    }

    /**
     * 注册单个工具（编程方式）
     * @param {Object} toolDefinition - 工具定义
     */
    registerTool(toolDefinition) {
        if (!toolDefinition.name || !toolDefinition.handler) {
            throw new Error('工具定义必须包含 name 和 handler');
        }

        console.log(`[PluginLoader] 注册工具：${toolDefinition.name}`);
        
        // 移除同名的旧工具
        this.tools = this.tools.filter(t => t.name !== toolDefinition.name);
        
        this.tools.push({
            ...toolDefinition,
            source: 'runtime',
            loadedAt: Date.now()
        });

        console.log(`[PluginLoader] ✅ 工具 ${toolDefinition.name} 已注册`);
    }

    /**
     * 卸载工具
     * @param {string} toolName - 工具名称
     */
    unregisterTool(toolName) {
        const index = this.tools.findIndex(t => t.name === toolName);
        
        if (index !== -1) {
            this.tools.splice(index, 1);
            console.log(`[PluginLoader] ✅ 工具 ${toolName} 已卸载`);
            return true;
        }
        
        return false;
    }

    /**
     * 重新加载插件（热插拔）
     * @param {string} pluginFile - 插件文件名
     */
    async reloadPlugin(pluginFile) {
        const pluginPath = path.join(this.pluginsDir, pluginFile);
        
        console.log(`[PluginLoader] 重新加载插件：${pluginFile}`);

        // 清除缓存
        delete require.cache[require.resolve(pluginPath)];
        
        // 移除旧工具
        const oldPlugin = this.loadedPlugins.get(pluginFile);
        if (oldPlugin && oldPlugin.tools) {
            for (const tool of oldPlugin.tools) {
                this.unregisterTool(tool.name);
            }
        }

        // 重新加载
        await this._loadPlugin(pluginPath, pluginFile);
    }

    /**
     * 获取所有工具定义
     * @returns {Array<Object>} 工具定义数组
     */
    getToolDefinitions() {
        return this.tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            schema: tool.schema || {}
        }));
    }

    /**
     * 获取工具处理器
     * @param {string} toolName - 工具名称
     * @returns {Function} 工具处理器函数
     */
    getToolHandler(toolName) {
        const tool = this.tools.find(t => t.name === toolName);
        
        if (!tool) {
            throw new Error(`工具不存在：${toolName}`);
        }

        return tool.handler;
    }

    // ==================== 私有方法 ====================

    /**
     * 加载单个插件文件
     * @private
     */
    async _loadPlugin(pluginPath, filename) {
        console.log(`[PluginLoader] 加载插件：${filename}`);

        const pluginModule = require(pluginPath);
        
        // 支持的插件格式
        let tools = [];
        
        if (typeof pluginModule === 'function') {
            // 格式 1: 导出工厂函数
            const tool = pluginModule();
            if (tool) tools.push(tool);
        } else if (Array.isArray(pluginModule)) {
            // 格式 2: 导出工具数组
            tools = pluginModule;
        } else if (pluginModule.tools && Array.isArray(pluginModule.tools)) {
            // 格式 3: 导出 { tools: [...] }
            tools = pluginModule.tools;
        } else if (pluginModule.default) {
            // 格式 4: 导出 { default: ... }
            const exported = pluginModule.default;
            if (typeof exported === 'function') {
                tools.push(exported());
            } else if (Array.isArray(exported)) {
                tools = exported;
            }
        }

        // 验证并注册工具
        for (const tool of tools) {
            if (!this._validateTool(tool)) {
                console.warn(`[PluginLoader] ⚠️  工具 ${tool.name} 验证失败，跳过`);
                continue;
            }

            tool.source = filename;
            tool.loadedAt = Date.now();
            this.tools.push(tool);
            
            console.log(`[PluginLoader] ✅ 已注册工具：${tool.name} (来自 ${filename})`);
        }

        // 记录已加载的插件
        this.loadedPlugins.set(filename, {
            path: pluginPath,
            tools,
            loadedAt: Date.now()
        });
    }

    /**
     * 验证工具定义
     * @private
     */
    _validateTool(tool) {
        if (!tool || typeof tool !== 'object') {
            console.error('[PluginLoader] 工具必须是对象');
            return false;
        }

        if (!tool.name || typeof tool.name !== 'string') {
            console.error('[PluginLoader] 工具必须包含 name 字符串');
            return false;
        }

        if (!tool.description || typeof tool.description !== 'string') {
            console.error('[PluginLoader] 工具必须包含 description 字符串');
            return false;
        }

        if (!tool.handler || typeof tool.handler !== 'function') {
            console.error('[PluginLoader] 工具必须包含 handler 函数');
            return false;
        }

        // 名称验证（只能是字母、数字、下划线）
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tool.name)) {
            console.error('[PluginLoader] 工具名称只能包含字母、数字和下划线');
            return false;
        }

        return true;
    }

    /**
     * 创建示例插件
     * @private
     */
    async _createExamplePlugin() {
        const examplePath = path.join(this.pluginsDir, 'example-tools.js');
        
        const exampleCode = `/**
 * 示例插件 - 自定义工具集合
 * 
 * 复制此文件作为模板，创建你自己的工具
 */

module.exports = [
    {
        // 工具 1: 发送 HTTP 请求
        name: 'http_request',
        description: '发送 HTTP 请求到指定 URL',
        schema: {
            url: { type: 'string', required: true, description: '目标 URL' },
            method: { type: 'string', required: false, default: 'GET', description: 'HTTP 方法' },
            body: { type: 'object', required: false, description: '请求体' }
        },
        handler: async (args, context) => {
            const http = require('http');
            const https = require('https');
            const url = require('url');
            
            return new Promise((resolve, reject) => {
                const parsedUrl = url.parse(args.url);
                const lib = parsedUrl.protocol === 'https:' ? https : http;
                
                const options = {
                    method: args.method || 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(args.body ? {'Content-Length': Buffer.byteLength(JSON.stringify(args.body))} : {})
                    }
                };

                const req = lib.request(args.url, options, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        resolve({
                            success: true,
                            statusCode: res.statusCode,
                            headers: res.headers,
                            body: data
                        });
                    });
                });

                req.on('error', reject);
                
                if (args.body) {
                    req.write(JSON.stringify(args.body));
                }
                req.end();
            });
        }
    },

    {
        // 工具 2: 执行系统命令（谨慎使用）
        name: 'exec_command',
        description: '执行系统命令（仅限安全命令）',
        schema: {
            command: { type: 'string', required: true, description: '要执行的命令' },
            args: { type: 'array', required: false, description: '命令参数' }
        },
        handler: async (args, context) => {
            const { exec } = require('child_process');
            const util = require('util');
            const execPromise = util.promisify(exec);

            // 安全检查：禁止危险命令
            const dangerousCommands = ['rm', 'sudo', 'chmod', 'chown', 'dd', '>'];
            const cmdBase = args.command.split(' ')[0];
            
            if (dangerousCommands.some(dc => cmdBase.includes(dc))) {
                return {
                    success: false,
                    error: '禁止执行危险命令'
                };
            }

            try {
                const { stdout, stderr } = await execPromise(
                    args.command + (args.args ? ' ' + args.args.join(' ') : '')
                );
                
                return {
                    success: true,
                    stdout,
                    stderr
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        }
    },

    {
        // 工具 3: 读取文件内容
        name: 'read_file',
        description: '读取本地文件内容',
        schema: {
            filePath: { type: 'string', required: true, description: '文件路径' },
            encoding: { type: 'string', required: false, default: 'utf-8', description: '文件编码' }
        },
        handler: async (args, context) => {
            const fs = require('fs').promises;
            const path = require('path');

            try {
                // 限制只能读取当前目录下的文件
                const absolutePath = path.resolve(args.filePath);
                const content = await fs.readFile(absolutePath, args.encoding);
                
                return {
                    success: true,
                    content: content.toString(),
                    size: content.length
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        }
    }
];
`;

        await fs.promises.writeFile(examplePath, exampleCode);
        console.log(`[PluginLoader] ✅ 已创建示例插件：${examplePath}`);
    }
}

module.exports = PluginLoader;
