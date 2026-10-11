#!/usr/bin/env node

/**
 * Browser Automation Server 启动脚本
 *
 * 用法:
 *   npx browser-server serve [options]
 *   node server.js [options]
 *
 * 选项:
 *   --port, -p     端口号 (默认 8080)
 *   --host, -H     监听地址 (默认 127.0.0.1)
 *   --no-ws        禁用 WebSocket
 */

const path = require('path');
const BrowserServer = require('./server/index');

// 解析命令行参数
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        port: 8080,
        host: '127.0.0.1',
        enableWebSocket: true
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        switch (arg) {
            case '--port':
            case '-p':
                options.port = parseInt(args[++i]);
                break;

            case '--host':
            case '-H':
                options.host = args[++i];
                break;

            case '--no-ws':
                options.enableWebSocket = false;
                break;

            case '--help':
            case '-h':
                showHelp();
                process.exit(0);

            case '--version':
            case '-v':
                console.log('2.0.0');
                process.exit(0);
        }
    }

    return options;
}

function showHelp() {
    console.log(`
Browser Automation Server v2.0.0

用法:
  npx browser-server serve [选项]

选项:
  --port, -p     端口号 (默认 8080)
  --host, -H     监听地址 (默认 127.0.0.1)
  --no-ws        禁用 WebSocket
  --help, -h     显示帮助
  --version, -v  显示版本号

示例:
  node server.js --port 9000
  node server.js --no-ws
`);
}

// 主流程
async function main() {
    const options = parseArgs();

    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║     Browser Automation Server v2.0.0           ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    const server = new BrowserServer({
        port: options.port,
        host: options.host,
        enableWebSocket: options.enableWebSocket,
        browserConfig: {
            backend: process.env.BROWSER_BACKEND || 'chromium',
            headless: process.env.HEADLESS === 'true',
            humanize: process.env.HUMANIZE === 'true'
        }
    });

    await server.start();

    // 处理退出
    process.on('SIGINT', async () => {
        console.log('\n[Server] 正在关闭...');
        await server.stop();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('\n[Server] 正在关闭...');
        await server.stop();
        process.exit(0);
    });
}

// 作为脚本直接运行时执行
if (require.main === module) {
    main().catch((error) => {
        console.error('启动失败:', error);
        process.exit(1);
    });
}

module.exports = BrowserServer;
