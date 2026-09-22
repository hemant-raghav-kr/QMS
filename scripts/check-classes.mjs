async function checkTailwindClasses() {
  const pageRes = await fetch('http://localhost:3000/dashboard');
  const html = await pageRes.text();
  const cssLinks = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map(m => m[1]);

  const cssUrl = `http://localhost:3000${cssLinks[0]}`;
  const cssRes = await fetch(cssUrl);
  const css = await cssRes.text();

  console.log(`Analyzing compiled stylesheet: ${cssUrl} (${css.length} bytes)\n`);

  const requiredClasses = [
    'bg-background',
    'text-foreground',
    'bg-card',
    'border-border',
    'text-muted-foreground',
    'bg-primary',
    'text-primary-foreground',
    'rounded-xl',
    'shadow-sm',
    'flex',
    'grid',
    'hidden',
    'lg\\:block',
    'dark',
    ':root'
  ];

  let allFound = true;
  for (const cls of requiredClasses) {
    const found = css.includes(cls);
    console.log(`  ${found ? '✓ [EXISTS]' : '✗ [MISSING]'} ${cls}`);
    if (!found) allFound = false;
  }

  console.log('\nResult:', allFound ? 'ALL REQUIRED UTILITIES VERIFIED PRESENT IN CSS ✓' : 'SOME MISSING ✗');
  if (!allFound) process.exit(1);
}

checkTailwindClasses();
