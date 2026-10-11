/**
 * Browser Automation Library
 *
 * 浏览器自动化库
 * 提供统一的浏览器接口，支持 Lightpanda 和 Chromium 后端
 */

const UnifiedBrowserInterface = require('./browser/unified-interface');

module.exports = {
    // 核心类
    UnifiedBrowserInterface
};

// 默认导出
module.exports.default = UnifiedBrowserInterface;

// 便捷创建函数
function createBrowser(options = {}) {
    return new UnifiedBrowserInterface(options);
}

module.exports.createBrowser = createBrowser;
