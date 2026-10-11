import { test, expect } from '@playwright/test';

test.describe('Lightpanda Integration Tests', () => {
  
  test('should navigate to example.com and check title', async ({ page }) => {
    await page.goto('https://example.com');
    
    // 验证页面标题
    await expect(page).toHaveTitle('Example Domain');
    
    // 验证页面包含特定文本
    await expect(page.getByText('Example Domain')).toBeVisible();
    
    // 截图验证
    await page.screenshot({ path: 'example-page.png' });
  });

  test('should perform search on duckduckgo', async ({ page }) => {
    await page.goto('https://duckduckgo.com');
    
    // 输入搜索词
    await page.getByPlaceholder('Search the web without being tracked').fill('Playwright testing');
    await page.keyboard.press('Enter');
    
    // 等待结果加载
    await page.waitForLoadState('networkidle');
    
    // 验证搜索结果包含相关文本
    await expect(page.locator('main')).toContainText('Playwright');
    
    await page.screenshot({ path: 'search-results.png' });
  });

  test('should handle JavaScript interactions', async ({ page }) => {
    await page.goto('https://the-internet.herokuapp.com/dynamic_controls');
    
    // 点击按钮移除输入框
    await page.getByRole('button', { name: 'Remove' }).click();
    
    // 等待消息出现
    await expect(page.getByText('It\'s gone!')).toBeVisible();
    
    // 验证输入框已被移除
    await expect(page.locator('#input-example')).toBeHidden();
    
    await page.screenshot({ path: 'dynamic-controls.png' });
  });

  test('should evaluate JavaScript in browser context', async ({ page }) => {
    await page.goto('https://example.com');
    
    // 在浏览器上下文中执行 JavaScript
    const dimensions = await page.evaluate(() => {
      return {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
        userAgent: navigator.userAgent
      };
    });
    
    console.log('Page dimensions:', dimensions);
    
    // 验证返回了正确的数据结构
    expect(dimensions.width).toBeGreaterThan(0);
    expect(dimensions.height).toBeGreaterThan(0);
    expect(typeof dimensions.userAgent).toBe('string');
  });

});