/**
 * Browser Automation 使用示例
 *
 * 演示如何使用浏览器自动化库的 API
 */

const { UnifiedBrowserInterface } = require('../src/index');

async function example1_navigate() {
    console.log('\n=== Example 1: Navigate to a webpage ===');

    const browser = new UnifiedBrowserInterface({
        backend: 'chromium',
        headless: true,
        humanize: true
    });

    try {
        await browser.launch();
        await browser.goto('https://example.com');
        
        console.log('Page title:', await browser.title());
        console.log('Page URL:', await browser.url());
        
    } finally {
        await browser.close();
    }
}

async function example2_screenshot() {
    console.log('\n=== Example 2: Take a screenshot ===');

    const browser = new UnifiedBrowserInterface({
        backend: 'chromium',
        headless: true,
        humanize: true
    });

    try {
        await browser.launch();
        await browser.goto('https://example.com');
        
        const screenshotB64 = await browser.screenshot({ encoding: 'base64' });
        console.log('Screenshot length (base64):', screenshotB64.length);
        
    } finally {
        await browser.close();
    }
}

async function example3_clickAndType() {
    console.log('\n=== Example 3: Click and type ===');

    const browser = new UnifiedBrowserInterface({
        backend: 'chromium',
        headless: true,
        humanize: true
    });

    try {
        await browser.launch();
        await browser.goto('https://example.com');
        
        // Click a link
        await browser.click('a[href="https://www.iana.org/domains/example"]');
        
        // Wait for navigation
        await browser.waitFor('navigation');
        
        console.log('New URL:', await browser.url());
        
    } finally {
        await browser.close();
    }
}

async function example4_scrape() {
    console.log('\n=== Example 4: Scrape page content ===');

    const browser = new UnifiedBrowserInterface({
        backend: 'chromium',
        headless: true,
        humanize: false
    });

    try {
        await browser.launch();
        await browser.goto('https://example.com');
        
        // Get full HTML
        const html = await browser.content();
        console.log('HTML length:', html.length);
        
        // Get accessible snapshot (ARIA tree)
        const snap = await browser.snapshot();
        console.log('Snapshot summary:', JSON.stringify(snap.summary));
        
    } finally {
        await browser.close();
    }
}

async function example5_waitForElement() {
    console.log('\n=== Example 5: Wait for element ===');

    const browser = new UnifiedBrowserInterface({
        backend: 'chromium',
        headless: true,
        humanize: true
    });

    try {
        await browser.launch();
        await browser.goto('https://example.com');
        
        // Wait for specific element
        await browser.waitFor('h1', { timeout: 10000 });
        console.log('h1 loaded');
        
        // Get text of element
        const h1Text = await browser.rawPage.$eval('h1', el => el.textContent);
        console.log('h1 text:', h1Text);
        
    } finally {
        await browser.close();
    }
}

async function example6_verify() {
    console.log('\n=== Example 6: Verify assertions ===');

    const browser = new UnifiedBrowserInterface({
        backend: 'chromium',
        headless: true,
        humanize: false
    });

    try {
        await browser.launch();
        await browser.goto('https://example.com');
        
        // Verify page title
        const titleCheck = await browser.verify('title', { expected: 'Example Domain' });
        console.log('Title check:', titleCheck);
        
        // Verify h1 is visible
        const h1Check = await browser.verify('visible', { target: 'h1' });
        console.log('h1 visible:', h1Check);
        
        // Verify URL contains domain
        const urlCheck = await browser.verify('url', { expected: 'example.com' });
        console.log('URL check:', urlCheck);
        
    } finally {
        await browser.close();
    }
}

// Run examples
if (require.main === module) {
    const arg = process.argv[2];
    const num = arg ? parseInt(arg) : 0;
    
    const examples = {
        1: example1_navigate,
        2: example2_screenshot,
        3: example3_clickAndType,
        4: example4_scrape,
        5: example5_waitForElement,
        6: example6_verify
    };

    if (num && examples[num]) {
        examples[num]().catch(console.error);
    } else {
        console.log('Available examples: 1-6');
        console.log('Usage: node basic-examples.js <1-6>');
        for (const n of Object.keys(examples).map(Number)) {
            console.log(`  ${n}. ${examples[n].name}`);
        }
    }
}

module.exports = {
    example1_navigate,
    example2_screenshot,
    example3_clickAndType,
    example4_scrape,
    example5_waitForElement,
    example6_verify,
};
