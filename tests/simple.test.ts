import { test, expect } from '@playwright/test';

test.describe('Lightpanda Basic Tests', () => {
  
  test('basic navigation test', async ({ page }) => {
    console.log('Navigating to example.com...');
    const response = await page.goto('https://example.com', { 
      waitUntil: 'domcontentloaded',
      timeout: 10000 
    });
    
    console.log('Response status:', response?.status());
    
    // 验证页面标题
    const title = await page.title();
    console.log('Page title:', title);
    expect(title).toBe('Example Domain');
    
    // 验证页面包含特定文本
    const hasText = await page.getByText('Example Domain').isVisible();
    console.log('Has example text:', hasText);
    expect(hasText).toBeTruthy();
    
    console.log('Test completed successfully');
  });

  test('simple click test', async ({ page }) => {
    await page.goto('https://httpbin.org/html');
    
    // 等待并点击链接
    const link = page.getByRole('link', { name: 'httpbin' });
    await expect(link).toBeVisible();
    
    const href = await link.getAttribute('href');
    console.log('Link href:', href);
    expect(href).toContain('httpbin.org');
  });

});