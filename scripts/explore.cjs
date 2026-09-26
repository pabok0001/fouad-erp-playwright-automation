// Read-only page explorer for module analysis (docs/modules/).
// Opens each path with the stored admin session and saves an ARIA snapshot + screenshot.
// It never clicks or saves anything. Refresh the session first with `npx playwright test --project=setup`.
//
// Usage: npm run explore -- <module> <path> [<path> ...]
//   e.g. npm run explore -- registration hospital/newregistration hospital/patients/new
// Output: scripts/explore-output/<module>/ (gitignored)
const path = require('path');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env'), quiet: true });
const { chromium } = require('@playwright/test');

(async () => {
  const [moduleName, ...paths] = process.argv.slice(2);
  if (!moduleName || paths.length === 0) {
    console.error('Usage: npm run explore -- <module> <path> [<path> ...]');
    process.exit(1);
  }
  const outDir = path.join(ROOT, 'scripts', 'explore-output', moduleName);
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    baseURL: process.env.BASE_URL,
    ignoreHTTPSErrors: true,
    storageState: path.join(ROOT, '.auth', 'admin.json'),
    viewport: { width: 1600, height: 1000 },
  });
  const page = await ctx.newPage();
  let failed = 0;
  // Leading slash is optional — Git Bash rewrites "/hospital/x" into a Windows path.
  for (const p of paths.map((x) => (x.startsWith('/') ? x : `/${x}`))) {
    const name = p.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'root';
    try {
      await page.goto(p, { timeout: 60_000 });
      await page.waitForTimeout(6_000); // Blazor circuit + initial data load
      if (/Account\/Login/.test(page.url()))
        throw new Error('session expired — run the setup project');
      const snapshot = await page.locator('body').ariaSnapshot();
      fs.writeFileSync(path.join(outDir, `${name}.yml`), `# ${page.url()}\n${snapshot}`);
      await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
      console.log('ok  ', p);
    } catch (e) {
      failed++;
      console.log('FAIL', p, e.message.split('\n')[0]);
    }
  }
  await browser.close();
  console.log(`Saved to ${path.relative(ROOT, outDir)}`);
  process.exit(failed ? 1 : 0);
})();
