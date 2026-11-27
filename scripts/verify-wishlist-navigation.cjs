// Run from this repository: node scripts/verify-wishlist-navigation.cjs
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const slug = /kuni/.test(root) ? 'kuni' : /luni/.test(root) ? 'luni' : /n1x/.test(root) ? 'n1x' : 'nordel';
const live = process.env.QA_LIVE_URL;
const mime = {'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
(async () => {
 const server = http.createServer((req,res) => {
  const f = path.join(root,'build/prod', new URL(req.url,'http://localhost').pathname);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type',mime[path.extname(f)] || 'application/octet-stream');
  fs.createReadStream(f).pipe(res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base = live || 'http://127.0.0.1:'+server.address().port;
 const browser = await chromium.launch();
 try {
  for (const mode of (live ? ['wishlist_only'] : ['wishlist_only','live'])) {
   for (const width of [1440,390]) {
    const ctx = await browser.newContext({viewport:{width,height:900}});
    if (!live) await ctx.route('**/*', route=>{
     const url=route.request().url();
     if (url.includes('/site-config')) return route.fulfill({json:{site_id:slug,launch_mode:mode,servers_enabled:mode==='live',checkout_enabled:mode==='live',wishlist_bot_username:'Your_Wishlist_VPN_Official_Bot'}});
     if (url.includes('/plans')) return route.fulfill({json:{plans:[]}});
     if (url.includes('/_api/servers')) return route.fulfill({json:{servers:[]}});
     if (url.startsWith(base)) return route.continue();
     return route.abort();
    });
    const page=await ctx.newPage();
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    for(const pageName of ['index','privacy','terms']) {
     await page.goto(base+'/'+pageName+'.html',{waitUntil:'networkidle'});
     await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-page-boot'));
     assert.equal(await page.getAttribute('html','data-launch-mode'),mode);
     const auth=page.locator('header a[href*="login.html"],header a[href*="create-account.html"],footer a[href*="login.html"],footer a[href*="create-account.html"]');
     if(mode==='wishlist_only') for(const el of await auth.all()) assert.equal(await el.isVisible(),false,'guest auth navigation must be hidden');
     if(slug==='kuni') {
      const cta=page.locator('header [data-open-checkout]');
      assert.equal(await cta.count(),1);
      if(mode==='wishlist_only') assert.match(await cta.getAttribute('href'),/t.me.*site_kuni/);
      if(pageName==='index') {
       assert.equal(await page.locator('[data-open-checkout="monthly"]').innerText(),'Choose plan');
       assert.equal(await page.locator('.hero-copy > a.button').getAttribute('href'),'./index.html#plans');
      }
     }
     if(slug==='luni' && pageName==='index' && mode==='wishlist_only') {
      for(const el of await page.locator('a[data-select-plan]').all()) assert.match(await el.getAttribute('href'),/t.me.*__plan_/);
      if (width === 390) await page.locator('[data-nav-toggle]').click();
      await page.locator('[data-language-select]').selectOption('ru');
      for(const el of await page.locator('a[data-select-plan]').all()) assert.match(await el.getAttribute('href'),/__lang_ru$/);
     }
     if(slug==='n1x' && pageName==='index') assert.equal(await page.locator('[data-select-plan="monthly"]').first().innerText(),'Choose 1 Month');
    }
    assert.deepEqual(errors,[]);
    await ctx.close();
   }
  }
  console.log('PASS '+slug+': navigation, CTA, boot, desktop/mobile; '+(live?'production wishlist':'wishlist/live'));
 } finally { await browser.close(); server.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
