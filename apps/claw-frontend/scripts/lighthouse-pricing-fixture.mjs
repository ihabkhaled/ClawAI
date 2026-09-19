// A stand-in for auth-service's plan catalog, for the Lighthouse CI job only.
//
// Lighthouse builds and audits the frontend with no backend. /en and
// /en/pricing then render the honest "pricing unavailable" state, and the
// browser logs the 503 from /api/pricing as a console error. That cost
// best-practices 0.04 and kept the Lighthouse gate red on main from at least
// 2026-09-17. Worse, it audited the error state instead of the page users see.
//
// These plans are TEST DATA. They are never read outside that job, and real
// prices live in PlanPriceVersion rows only.
//
//   PORT=4901 SERVICE_TOKEN=lighthouse-fixture node scripts/lighthouse-pricing-fixture.mjs
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

export const CATALOG_PATH = '/api/v1/internal/plans/catalog';

const price = (planId, interval, amountMinor) => ({
  id: `${planId}-${interval.toLowerCase()}`,
  planId,
  billingInterval: interval,
  currency: 'USD',
  amountMinor,
  version: 1,
  isActive: true,
});

const plan = (id, order, name, monthlyMinor, extra = {}) => ({
  id,
  slug: id,
  name,
  description: `${name} (Lighthouse fixture)`,
  displayOrder: order,
  isDefault: order === 1,
  isPopular: order === 2,
  isPublic: true,
  isActive: true,
  currency: 'USD',
  isTrial: false,
  trialDurationDays: null,
  paygCreditPercentBps: 3000,
  dailyTokenQuota: null,
  weeklyTokenQuota: null,
  monthlyTokenQuota: 1_000_000 * order,
  maxChatsPerDay: null,
  maxMessagesPerDay: null,
  maxWorkspaceConnections: order,
  maxContextPacks: 5 * order,
  maxMemoryItems: 100 * order,
  prices: [price(id, 'MONTHLY', monthlyMinor), price(id, 'YEARLY', monthlyMinor * 10)],
  features: [],
  ...extra,
});

export const LIGHTHOUSE_PLAN_CATALOG = [
  plan('fixture-free', 1, 'Free', 0),
  plan('fixture-pro', 2, 'Pro', 2000),
  plan('fixture-team', 3, 'Team', 6000),
];

export function createCatalogServer(serviceToken) {
  return createServer((request, response) => {
    if (request.url !== CATALOG_PATH) {
      response.writeHead(404).end();
      return;
    }
    if (request.headers.authorization !== `Service ${serviceToken}`) {
      response.writeHead(401).end();
      return;
    }
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(LIGHTHOUSE_PLAN_CATALOG));
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const port = Number(process.env['PORT'] ?? 4901);
  const token = process.env['SERVICE_TOKEN'] ?? 'lighthouse-fixture';
  createCatalogServer(token).listen(port, '127.0.0.1', () => {
    process.stdout.write(`lighthouse pricing fixture on http://127.0.0.1:${String(port)}\n`);
  });
}
