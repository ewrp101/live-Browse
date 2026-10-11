#!/usr/bin/env node

/**
 * 使用 Docker 镜像内的浏览器（通过 playwright-core）
 * 适配 Docker 镜像 mcr.microsoft.com/playwright:v1.40.0
 */

const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const url = process.argv[2] || 'https://example.com';

console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║   Playwright v1.40.0 抓取（Docker 内运行）           ║');
console.log('╚══════════════════════════════════════════════════╝\n');

async function main() {
    console.log(`目标 URL: ${url}\n`);
    
    // 使用 playwright-core 连接到镜像内的浏览器
    // Docker 镜像 v1.40.0 使用 chromium-1091
    const browser = await chromium.launch({
        headless: true,
        executablePath: '/ms-playwright/chromium-1091/chrome-linux/chrome',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    });

    console.log('✅ 浏览器已启动');

    const page = await browser.newPage();

    try {
        console.log(`📡 导航到：${url}`);
        const startTime = Date.now();
        
        // 先尝试 load 模式，如果失败则使用 5 秒超时
        try {
            await page.goto(url, {
                waitUntil: 'load',
                timeout: 30000
            });
        } catch (e) {
            console.log('⚠️  标准加载超时，尝试继续...');
            await page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: 10000
            }).catch(() => {
                console.log('⚠️  使用当前页面状态...');
            });
        }

        const navTime = Date.now() - startTime;
        console.log(`✅ 导航完成 (${navTime}ms)`);

        await page.waitForTimeout(5000);  // 等待 5 秒让 JS 执行

        const html = await page.content();
        const title = await page.title();

        console.log(`\n📄 页面标题：${title}`);
        console.log(`📊 HTML 长度：${html.length} 字符`);

        // 保存
        const outputDir = path.join(__dirname, 'output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const htmlFile = path.join(outputDir, `docker-${path.basename(url)}.html`);
        fs.writeFileSync(htmlFile, html);
        console.log(`📁 已保存：${htmlFile}`);

    } catch (error) {
        console.error('❌ 错误:', error.message);
        throw error;
    } finally {
        await browser.close();
    }
}

main().catch(console.error);
