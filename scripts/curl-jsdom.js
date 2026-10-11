#!/usr/bin/env node

/**
 * 使用 curl + jsdom 抓取网页（无需浏览器）
 * 
 * 原理:
 * 1. axios 获取 HTML
 * 2. jsdom 解析并执行 JS
 * 3. 提取所需数据
 * 
 * 适用：轻度动态网站，简单 JS 处理
 * 
 * 用法:
 *   node scripts/curl-jsdom.js [URL]
 */

const axios = require('axios');
const https = require('https');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const url = process.argv[2] || 'https://example.com';

// 禁用 SSL 证书验证（仅用于测试）
const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║   curl + jsdom 抓取（无需浏览器）                   ║');
console.log('╚══════════════════════════════════════════════════╝\n');

async function fetchWithJsdom(url, options = {}) {
    const {
        jsTimeout = 3000,
        resources = 'usable',
        runScripts = 'dangerously'
    } = options;

    console.log(`📡 请求 URL: ${url}`);
    console.log(`⏱️  JS 执行超时：${jsTimeout}ms`);
    console.log('');

    const startTime = Date.now();

    try {
        // 1. 获取 HTML
        console.log('📥 下载 HTML...');
        const { data: html } = await axios.get(url, {
            httpsAgent,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
            },
            timeout: 30000,
            maxRedirects: 5
        });

        const downloadTime = Date.now() - startTime;
        console.log(`✅ 下载完成 (${downloadTime}ms, ${html.length} 字符)`);

        // 2. 创建 JSDOM
        console.log('🔧 创建 DOM...');
        const dom = new JSDOM(html, {
            url,
            contentType: 'text/html',
            runScripts,
            resources,
            pretendToBeVisual: true,
            storageQuota: 10000000
        });

        // 3. 等待 JS 执行
        if (jsTimeout > 0) {
            console.log(`⏱️  等待 JS 执行 (${jsTimeout}ms)...`);
            await new Promise(resolve => setTimeout(resolve, jsTimeout));
        }

        const document = dom.window.document;

        // 4. 提取数据
        const result = {
            url: dom.window.location.href,
            title: document.title,
            html: document.documentElement.outerHTML,
            metaDescription: document.querySelector('meta[name="description"]')?.content || '',
            links: Array.from(document.querySelectorAll('a[href]'))
                .slice(0, 100)
                .map(a => ({
                    text: a.textContent?.trim().substring(0, 100) || '',
                    href: a.href
                })),
            headings: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
                .map(h => ({
                    tag: h.tagName,
                    text: h.textContent?.trim() || ''
                })),
            images: Array.from(document.querySelectorAll('img[src]'))
                .slice(0, 50)
                .map(img => ({
                    src: img.src,
                    alt: img.alt || ''
                }))
        };

        const jsTime = Date.now() - downloadTime - startTime;
        console.log(`✅ JS 处理完成 (${jsTime}ms)`);

        return {
            success: true,
            ...result,
            downloadTime,
            jsTime,
            totalTime: Date.now() - startTime
        };

    } catch (error) {
        console.error(`❌ 错误：${error.message}`);
        return {
            success: false,
            error: error.message,
            url
        };
    }
}

async function main() {
    console.log(`目标 URL: ${url}\n`);

    try {
        const result = await fetchWithJsdom(url, {
            jsTimeout: 3000,
            resources: 'usable',
            runScripts: 'dangerously'
        });

        if (result.success) {
            console.log('\n' + '═'.repeat(50));
            console.log('✅ 抓取完成！');
            console.log('─'.repeat(50));
            console.log(`📊 内容长度：${result.html.length} 字符 (${(result.html.length / 1024).toFixed(2)} KB)`);
            console.log(`📄 页面标题：${result.title}`);
            console.log(`🔗 链接数：${result.links.length}`);
            console.log(`📑 标题数：${result.headings.length}`);
            console.log(`🖼️  图片数：${result.images.length}`);
            console.log(`⏱️  总耗时：${result.totalTime}ms`);
            
            // 保存结果
            const outputDir = path.join(__dirname, 'output');
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            
            // 保存 HTML
            const htmlFile = path.join(outputDir, `jsdom-${path.basename(url)}.html`);
            fs.writeFileSync(htmlFile, result.html);
            console.log(`📁 HTML 已保存：${htmlFile}`);

            // 保存 JSON 数据
            const dataFile = path.join(outputDir, `data-${path.basename(url)}.json`);
            fs.writeFileSync(dataFile, JSON.stringify({
                url: result.url,
                title: result.title,
                metaDescription: result.metaDescription,
                links: result.links,
                headings: result.headings,
                images: result.images
            }, null, 2));
            console.log(`📊 数据已保存：${dataFile}`);

            // 显示预览
            console.log('\n📄 内容预览:');
            console.log('─'.repeat(50));
            console.log(`标题：${result.title}`);
            console.log(`描述：${result.metaDescription.substring(0, 150)}...`);
            
            if (result.headings.length > 0) {
                console.log('\n📑 标题结构:');
                result.headings.slice(0, 15).forEach(h => {
                    console.log(`   ${h.tag}: ${h.text}`);
                });
            }

            if (result.links.length > 0) {
                console.log('\n🔗 前 10 个链接:');
                result.links.slice(0, 10).forEach((link, i) => {
                    console.log(`   ${i + 1}. ${link.text || '[无文本]'} -> ${link.href.substring(0, 60)}...`);
                });
            }

            console.log('\n💡 提示:');
            console.log(`   查看完整 HTML: cat ${htmlFile} | head -100`);
            console.log(`   查看结构化数据：cat ${dataFile}`);

        } else {
            console.error('\n❌ 抓取失败:', result.error);
            console.error('\n💡 建议:');
            console.error('   1. 检查网络连接');
            console.error('   2. 确认 URL 是否正确');
            console.error('   3. 网站可能有反爬机制');
            console.error('   4. 尝试 Lightpanda: ./lightpanda-x86_64-linux.bin fetch URL');
            process.exit(1);
        }

    } catch (error) {
        console.error('\n❌ 错误:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

main();
