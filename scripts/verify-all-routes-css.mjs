async function verifyAllRoutes() {
  const routes = [
    '/dashboard',
    '/meetings',
    '/points',
    '/points/transactions',
    '/notifications',
    '/announcements',
    '/admin',
    '/admin/attendance',
    '/admin/rules',
    '/admin/reports',
    '/admin/settings',
    '/login',
    '/signup'
  ];

  console.log('Testing CSS delivery across all routes on https://quartzitemanagementsystem.vercel.app:\n');

  let allOk = true;

  for (const route of routes) {
    const url = `https://quartzitemanagementsystem.vercel.app${route}`;
    try {
      const res = await fetch(url);
      const html = await res.text();
      const cssLinks = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map(m => m[1]);

      let cssOk = false;
      let cssSize = 0;

      for (const href of cssLinks) {
        const cssUrl = href.startsWith('http') ? href : `https://quartzitemanagementsystem.vercel.app${href}`;
        const cssRes = await fetch(cssUrl);
        if (cssRes.status === 200) {
          const cssText = await cssRes.text();
          cssSize = cssText.length;
          if (cssText.includes('--background') && cssText.includes('bg-background')) {
            cssOk = true;
          }
        }
      }

      const statusStr = res.status === 200 ? '200 OK' : `${res.status}`;
      const cssStr = cssOk ? `CSS LOADED (${cssSize} bytes)` : 'CSS FAILED';

      if (res.status === 200 && cssOk) {
        console.log(`  ✓ [PASS] ${route.padEnd(25)} -> ${statusStr} | ${cssStr}`);
      } else {
        console.error(`  ✗ [FAIL] ${route.padEnd(25)} -> ${statusStr} | ${cssStr}`);
        allOk = false;
      }
    } catch (err) {
      console.error(`  ✗ [ERR]  ${route.padEnd(25)} -> ${err.message}`);
      allOk = false;
    }
  }

  console.log('\nAll routes verification result:', allOk ? 'ALL PASSED ✓' : 'SOME FAILED ✗');
  if (!allOk) process.exit(1);
}

verifyAllRoutes();
