import { test } from '@playwright/test';

import { expectNoHorizontalOverflow, RESPONSIVE_VIEWPORTS } from './helpers/responsive';

// Asserts the core acceptance criterion of the UI/UX refactor — no horizontal
// page overflow — across the full device-class matrix. Targets /login because
// it is the only route reachable without a seeded backend session; auth-gated
// routes are covered by the manual UAT matrix documented in the refactor plan.
test.describe('Responsive shell — no horizontal overflow', () => {
  for (const viewport of RESPONSIVE_VIEWPORTS) {
    test(`/login has no horizontal overflow at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/login');
      await expectNoHorizontalOverflow(page);
    });
  }
});
