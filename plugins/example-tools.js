/**
 * 示例插件 - 自定义工具集合
 * 
 * 复制此文件作为模板，创建你自己的工具
 */

module.exports = [
    // 工具 1: 发送 HTTP 请求
    {
        name: 'http_request',
        description: '发送 HTTP 请求到指定 URL',
        schema: {
            url: { type: 'string', required: true, description: '目标 URL' },
            method: { type: 'string', required: false, default: 'GET', description: 'HTTP 方法' },
            headers: { type: 'object', required: false, description: '请求头' },
            body: { type: 'string', required: false, description: '请求体' }
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
                        ...(args.headers || {}),
                        ...(args.body ? {'Content-Length': Buffer.byteLength(args.body)} : {})
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
                    req.write(args.body);
                }
                req.end();
            });
        }
    }
];
