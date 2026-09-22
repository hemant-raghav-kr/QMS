async function test() {
  console.log('Fetching http://localhost:3000/dashboard...');
  const res = await fetch('http://localhost:3000/dashboard');
  console.log('Page status:', res.status);
  const html = await res.text();
  console.log('HTML size:', html.length);

  const cssLinks = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map(m => m[1]);
  console.log('CSS Links:', cssLinks);

  for (const href of cssLinks) {
    const cssUrl = href.startsWith('http') ? href : `http://localhost:3000${href}`;
    console.log(`\nFetching CSS from: ${cssUrl}`);
    const cssRes = await fetch(cssUrl);
    console.log('CSS HTTP Status:', cssRes.status);
    const cssText = await cssRes.text();
    console.log('CSS length:', cssText.length);
    console.log('Has --background?', cssText.includes('--background'));
    console.log('Has .dark?', cssText.includes('.dark'));
    console.log('Has bg-background?', cssText.includes('bg-background'));
    console.log('Has .flex?', cssText.includes('.flex'));
    console.log('Has rounded-xl?', cssText.includes('rounded-xl'));
    console.log('First 200 chars:', cssText.slice(0, 200));
  }
}

test().catch(console.error);
