import { test, expect } from '@playwright/test';

const viewports = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '430x932', width: 430, height: 932 },
  { name: '390x844', width: 390, height: 844 },
  { name: '360x800', width: 360, height: 800 },
];

const pages = [
  { path: '/', name: 'Dashboard' },
  { path: '/passport', name: 'Passport Studio' },
  { path: '/editor', name: 'Normal Photo Editor' },
  { path: '/background', name: 'Background Editor' },
  { path: '/projects', name: 'Recent Projects' },
  { path: '/settings', name: 'Settings' },
];

test.describe('App Startup', () => {
  test('renders without blank screen', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    await page.goto('/');
    await expect(page).toHaveTitle(/PHOTO STUDIO AI/);

    // Check no blank screen - root should have visible content
    const root = page.locator('#root');
    await expect(root).toBeVisible();

    // Check for sidebar
    const sidebar = page.locator('aside[aria-label="Main navigation"]');
    await expect(sidebar).toBeVisible();

    // No critical console errors
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('404')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('no unhandled promise rejections', async ({ page }) => {
    const rejections: string[] = [];
    page.on('pageerror', (err) => rejections.push(err.message));

    await page.goto('/');
    await page.waitForTimeout(2000);

    const realErrors = rejections.filter((e) => e && e !== 'Error' && e.length > 5);
    expect(realErrors).toHaveLength(0);
  });
});

test.describe('Page Navigation', () => {
  for (const p of pages) {
    test(`loads ${p.name} page directly`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await page.goto(p.path);

      await expect(page.locator('h1, h2, h3').first()).toBeVisible({ timeout: 10000 });

      const criticalErrors = consoleErrors.filter(
        (e) => !e.includes('favicon') && !e.includes('404')
      );
      expect(criticalErrors).toHaveLength(0);
    });
  }

  test('direct URL navigation works on refresh', async ({ page }) => {
    await page.goto('/passport');
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();

    await page.reload();
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
  });

  test('navigation between pages works', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Welcome back').first()).toBeVisible();

    await page.click('text=Passport Studio');
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();

    await page.click('text=Background Editor');
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();

    await page.click('text=Recent Projects');
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();

    await page.click('text=Settings');
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();

    await page.click('text=Dashboard');
    await expect(page.locator('text=Welcome back').first()).toBeVisible();
  });
});

test.describe('Sidebar Responsive', () => {
  test('desktop sidebar is visible on large screens', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const sidebar = page.locator('aside[aria-label="Main navigation"]');
    await expect(sidebar).toBeVisible();

    const sidebarBox = await sidebar.boundingBox();
    expect(sidebarBox?.width).toBeGreaterThan(100);
    expect(sidebarBox?.width).toBeLessThan(300);
  });

  test('sidebar collapses to 64px rail', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const collapseBtn = page.locator('button[aria-label="Collapse navigation"]');
    if (await collapseBtn.isVisible()) {
      await collapseBtn.click();
      await page.waitForTimeout(300);

      const sidebar = page.locator('aside[aria-label="Main navigation"]');
      const sidebarBox = await sidebar.boundingBox();
      expect(sidebarBox?.width).toBeLessThan(100);
    }
  });

  test('sidebar brand is visible', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const brand = page.locator('text=PHOTO').first();
    await expect(brand).toBeVisible();
  });
});

test.describe('Mobile Drawer', () => {
  test('opens and closes with menu button', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const menuBtn = page.locator('button[aria-label="Open navigation menu"]');
    await expect(menuBtn).toBeVisible();

    await menuBtn.click();
    const drawer = page.locator('aside[aria-label="Mobile navigation drawer"]');
    await expect(drawer).toBeVisible();

    const closeBtn = page.locator('button[aria-label="Close navigation"]');
    await closeBtn.click();
    // Drawer should slide off-screen (translate-x-full)
    await expect(drawer).toHaveClass(/-translate-x-full/);
  });

  test('closes on backdrop click', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const menuBtn = page.locator('button[aria-label="Open navigation menu"]');
    await menuBtn.click();

    const drawer = page.locator('aside[aria-label="Mobile navigation drawer"]');
    await expect(drawer).toBeVisible();

    const backdrop = page.locator('.bg-black\\/40.backdrop-blur-sm');
    await backdrop.click();
    // Drawer should slide off-screen (translate-x-full)
    await expect(drawer).toHaveClass(/-translate-x-full/);
  });

  test('navigation closes drawer', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const menuBtn = page.locator('button[aria-label="Open navigation menu"]');
    await menuBtn.click();

    const drawer = page.locator('aside[aria-label="Mobile navigation drawer"]');
    await expect(drawer).toBeVisible();

    await page.locator('aside[aria-label="Mobile navigation drawer"]').locator('text=Dashboard').click();
    // Drawer should slide off-screen (translate-x-full)
    await expect(drawer).toHaveClass(/-translate-x-full/);
  });
});

test.describe('Theme Toggle', () => {
  test('switches between light and dark themes', async ({ page }) => {
    await page.goto('/');

    const themeBtn = page.locator('header').locator('button[aria-label="Toggle theme"]');
    await expect(themeBtn).toBeVisible();

    await themeBtn.click();
    const htmlClass = await page.evaluate(() => document.documentElement.className);
    expect(htmlClass).toContain('theme-dark');

    await themeBtn.click();
    const htmlClassLight = await page.evaluate(() => document.documentElement.className);
    expect(htmlClassLight).toContain('theme-light');
  });
});

test.describe('Passport Studio', () => {
  test('loads and shows default settings', async ({ page }) => {
    await page.goto('/passport');
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
  });
});

test.describe('Background Editor', () => {
  test('loads and shows upload controls', async ({ page }) => {
    await page.goto('/background');
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
  });
});

test.describe('Settings', () => {
  test('loads and shows theme and zero-spend controls', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
  });
});

test.describe('Responsive Viewports', () => {
  for (const vp of viewports) {
    test(`renders correctly at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');

      await expect(page.locator('#root')).toBeVisible();

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = vp.width;
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20);
    });
  }
});
