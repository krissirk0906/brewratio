const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Simple static server for dist directory
function startStaticServer(distDir, port) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain',
  };

  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath.endsWith('/')) {
      reqPath += 'index.html';
    } else if (!path.extname(reqPath)) {
      reqPath += '/index.html';
    }

    const filePath = path.join(distDir, reqPath);
    fs.readFile(filePath, (err, content) => {
      if (err) {
        if (err.code === 'ENOENT') {
          fs.readFile(path.join(distDir, '404.html'), (e404, c404) => {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(c404 || '404 Not Found');
          });
        } else {
          res.writeHead(500);
          res.end(`Server Error: ${err.code}`);
        }
      } else {
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        res.end(content, 'utf-8');
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}

async function runBrewRatioQCAudit() {
  const distDir = path.resolve(__dirname, '../dist');
  const port = 4173;
  const baseUrl = `http://localhost:${port}`;
  const server = await startStaticServer(distDir, port);
  console.log(`=== START SENIOR QC AUDIT: ${baseUrl} ===\n`);

  const browser = await chromium.launch({ channel: 'chrome' });
  const context = await browser.newContext();
  const page = await context.newPage();

  const issues = [];
  const passed = [];
  const consoleErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  try {
    // Suite 1: Homepage & Initial Calculations
    console.log('--- Suite 1: Homepage & SEO/Branding ---');
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });

    const title = await page.title();
    if (title.includes('BrewRatio')) {
      passed.push(`Title contains "BrewRatio" ("${title}")`);
    } else {
      issues.push(`Title invalid: "${title}"`);
    }

    // Verify package ID is NOT exposed on public UI/DOM
    const content = await page.content();
    if (!content.includes('com.junenine')) {
      passed.push('Package ID "com.junenine" is strictly internal (0 leaks in public DOM)');
    } else {
      issues.push('Package ID "com.junenine" was found leaked in DOM!');
    }

    // Verify Ads.txt
    const adsTxtRes = await page.goto(`${baseUrl}/ads.txt`);
    const adsTxtBody = await adsTxtRes.text();
    if (adsTxtBody.includes('pub-2321353976447632')) {
      passed.push('ads.txt properly served with studio publisher ID');
    } else {
      issues.push('ads.txt invalid or publisher ID missing');
    }

    // Return to homepage
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });

    // Suite 2: Interactive Calculator & State Changes
    console.log('\n--- Suite 2: Calculator Interactivity ---');
    // Default V60, 15g -> 240g water
    const outWater = await page.locator('#out-water').textContent();
    const outCoffee = await page.locator('#out-coffee').textContent();
    const outYield = await page.locator('#out-yield').textContent();

    if (outWater.trim() === '240g' && outCoffee.trim() === '15g') {
      passed.push('Default 15g V60 calculation matches 240g water');
    } else {
      issues.push(`Expected 240g water / 15g coffee, got ${outWater} / ${outCoffee}`);
    }

    // Switch method to French Press (default 1:15)
    await page.locator('button[data-method="french_press"]').click();
    const frenchWater = await page.locator('#out-water').textContent();
    if (frenchWater.trim() === '225g') {
      passed.push('Method switch to French Press updates water to 225g (15g @ 1:15)');
    } else {
      issues.push(`French Press expected 225g water, got ${frenchWater}`);
    }

    // Switch mode to "by_water" (e.g. 300ml)
    await page.locator('button[data-mode="by_water"]').click();
    await page.locator('#amount-input').fill('300');
    await page.locator('#amount-input').dispatchEvent('input');
    const coffeeFor300 = await page.locator('#out-coffee').textContent();
    if (coffeeFor300.trim() === '20g') {
      passed.push('Mode "by_water" (300g @ 1:15) correctly calculates 20g coffee');
    } else {
      issues.push(`Expected 20g coffee for 300g water on 1:15, got ${coffeeFor300}`);
    }

    // Switch mode to "by_yield" (200ml beverage)
    await page.locator('button[data-mode="by_yield"]').click();
    await page.locator('#amount-input').fill('200');
    await page.locator('#amount-input').dispatchEvent('input');
    const yieldYield = await page.locator('#out-yield').textContent();
    if (yieldYield.includes('200')) {
      passed.push('Mode "by_yield" achieves target beverage yield with absorption offset');
    } else {
      issues.push(`Expected ~200ml yield, got ${yieldYield}`);
    }

    // Suite 3: Pulse Pour Timer & Step Progression
    console.log('\n--- Suite 3: Pulse Pour Timer ---');
    const stepRowsCount = await page.locator('.pulse-step-row').count();
    if (stepRowsCount > 0) {
      passed.push(`Generated ${stepRowsCount} interactive pulse pouring steps`);
    } else {
      issues.push('No pulse steps generated in schedule list');
    }

    // Click 4:6 Method
    await page.locator('button[data-pulse="four_six"]').click();
    const kasuyaSteps = await page.locator('.pulse-step-row').count();
    if (kasuyaSteps === 5) {
      passed.push('Tetsu Kasuya 4:6 method generates exactly 5 pour pulses');
    } else {
      issues.push(`Expected 5 steps for 4:6 method, got ${kasuyaSteps}`);
    }

    // Start timer
    await page.locator('#btn-timer-start').click();
    await page.waitForTimeout(2100); // Wait 2 seconds
    const timerDigits = await page.locator('#timer-digits').textContent();
    if (timerDigits !== '00:00' && timerDigits.includes('00:0')) {
      passed.push(`Timer successfully ticks while running (${timerDigits})`);
    } else {
      issues.push(`Timer failed to advance: "${timerDigits}"`);
    }

    // Reset timer
    await page.locator('#btn-timer-reset').click();
    const resetDigits = await page.locator('#timer-digits').textContent();
    if (resetDigits.trim() === '00:00') {
      passed.push('Timer resets cleanly back to 00:00');
    } else {
      issues.push(`Timer failed to reset: "${resetDigits}"`);
    }

    // Suite 4: Responsive Viewport & Zero Horizontal Overflow
    console.log('\n--- Suite 4: Responsive Viewport & Overflow Audit ---');
    const viewports = [
      { name: 'Mobile Small', width: 320, height: 568 },
      { name: 'Mobile Standard', width: 375, height: 667 },
      { name: 'Mobile Large', width: 414, height: 896 },
      { name: 'Tablet Portrait', width: 768, height: 1024 },
      { name: 'Desktop HD', width: 1280, height: 800 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      if (!hasHorizontalScroll) {
        passed.push(`Viewport ${vp.name} (${vp.width}px): 0 horizontal scroll overflow`);
      } else {
        const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
        issues.push(`Viewport ${vp.name} (${vp.width}px) has overflow: scrollWidth=${scrollW}`);
      }
    }

    // Suite 5: Static Pages Verification (404, Methodology, About, Privacy, Terms)
    console.log('\n--- Suite 5: Static Pages & Navigation ---');
    const testPages = ['/methodology/', '/about/', '/privacy-policy/', '/terms/', '/404.html'];
    for (const p of testPages) {
      const res = await page.goto(`${baseUrl}${p}`);
      if (res.status() === 200 || (p.includes('404') && res.status() === 404)) {
        passed.push(`Route ${p} rendered status ${res.status()}`);
      } else {
        issues.push(`Route ${p} failed with status ${res.status()}`);
      }
    }

    // Console Error Check
    if (consoleErrors.length === 0) {
      passed.push('Zero browser console errors / exceptions detected across entire audit');
    } else {
      issues.push(`Console errors detected: ${JSON.stringify(consoleErrors)}`);
    }

  } finally {
    await browser.close();
    server.close();
  }

  console.log('\n========================================');
  console.log(`QC AUDIT SUMMARY:`);
  console.log(`PASSED: ${passed.length}`);
  console.log(`ISSUES: ${issues.length}`);
  console.log('========================================');

  if (issues.length > 0) {
    console.error('\nIssues found:');
    issues.forEach((iss, i) => console.error(`${i + 1}. ${iss}`));
    process.exit(1);
  } else {
    console.log('\nALL 20+ QC AUDIT SCENARIOS PASSED 100% CLEAN!');
    process.exit(0);
  }
}

runBrewRatioQCAudit().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
