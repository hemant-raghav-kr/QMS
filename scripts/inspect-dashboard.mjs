async function inspectDashboardClasses() {
  const res = await fetch('http://localhost:3000/dashboard');
  const html = await res.text();

  const checks = [
    { name: 'Sidebar container (DesktopSidebar)', pattern: /lg:w-64/ },
    { name: 'Top navigation header', pattern: /TopHeader|border-b border-border/ },
    { name: 'Card component classes', pattern: /rounded-xl border/ },
    { name: 'Semantic background', pattern: /bg-slate-50 dark:bg-slate-950/ },
    { name: 'Emerald primary branding', pattern: /emerald-600|bg-emerald/ },
    { name: 'Theme script in head', pattern: /qms-theme/ },
    { name: 'Responsive navigation', pattern: /MobileNavigation|lg:hidden|hidden lg:block/ },
    { name: 'Button styles', pattern: /inline-flex items-center justify-center/ },
  ];

  console.log('Inspecting rendered /dashboard HTML structure:\n');
  for (const check of checks) {
    const passed = check.pattern.test(html);
    console.log(`  ${passed ? '✓ [PASS]' : '✗ [FAIL]'} ${check.name}`);
  }
}

inspectDashboardClasses();
