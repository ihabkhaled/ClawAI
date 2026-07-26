// Every top-level path prefix that lives inside the (portal) or (auth) route
// groups. Used by robots.ts (Disallow) and documented here as the single
// hand-maintained list — kept in sync manually against src/app/(portal)/*
// and src/app/(auth)/* whenever a new top-level portal route is added.
// Sub-routes (e.g. /chat/compare, /admin/plans) are covered by their parent
// prefix automatically since robots.txt Disallow matches by prefix.
export const PRIVATE_ROUTE_PREFIXES: ReadonlyArray<string> = [
  '/login',
  '/register',
  '/dashboard',
  '/chat',
  '/connectors',
  '/models',
  '/routing',
  '/memory',
  '/context',
  '/files',
  '/audits',
  '/logs',
  '/observability',
  '/settings',
  '/admin',
  '/research',
  '/workspace',
  '/usage',
  '/plan',
  '/billing',
  '/agent',
  '/api',
];
