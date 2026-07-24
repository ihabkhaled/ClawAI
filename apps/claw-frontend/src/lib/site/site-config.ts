import { z } from 'zod';

// Server-only site configuration. Never imported from a 'use client' file —
// SITE_URL is deliberately NOT prefixed NEXT_PUBLIC_ so it is unavailable to
// the browser bundle; every consumer (generateMetadata, robots.ts,
// sitemap.ts, manifest.ts, the root layout) runs on the server.
//
// Validation rules (per the SEO spec): a crawlable canonical origin must be
// https://, must not be localhost/127.0.0.1/an unmapped Vercel preview
// domain, and must be a bare origin (no path, query, or fragment).
//
// Crawlability signal: explicitly setting a VALID SITE_URL is the operator's
// deliberate opt-in that this deployment is the public canonical origin and
// should be indexed. We therefore allow crawling whenever SITE_URL is valid
// and we are NOT on a Vercel preview/development deployment — this covers
// self-hosted production (including a real domain served from the Docker
// stack, even when NODE_ENV is not literally "production"). A missing/invalid
// SITE_URL, a localhost/127.0.0.1 value, or a Vercel non-production env all
// fall back to site-wide noindex — fail-safe, never fail-open on indexability.
const DEV_FALLBACK_SITE_URL = 'http://localhost:3000';

const siteUrlSchema = z
  .string()
  .url('SITE_URL must be a valid absolute URL')
  .refine((value) => new URL(value).protocol === 'https:', {
    message: 'SITE_URL must use the https:// protocol',
  })
  .refine(
    (value) => {
      const hostname = new URL(value).hostname.toLowerCase();
      return (
        hostname !== 'localhost' &&
        hostname !== '127.0.0.1' &&
        hostname !== '::1' &&
        !hostname.endsWith('.vercel.app')
      );
    },
    { message: 'SITE_URL must not be localhost, 127.0.0.1, or a Vercel-assigned domain' },
  )
  .refine(
    (value) => {
      const url = new URL(value);
      return url.pathname === '/' && url.search === '' && url.hash === '';
    },
    { message: 'SITE_URL must be a bare origin with no path, query, or fragment' },
  );

function isVercelPreviewOrDevEnvironment(): boolean {
  const vercelEnv = process.env['VERCEL_ENV'];
  return vercelEnv !== undefined && vercelEnv !== 'production';
}

function readValidatedSiteUrl(): string | undefined {
  const raw = process.env['SITE_URL'];
  if (raw === undefined || raw === '') {
    return undefined;
  }
  const result = siteUrlSchema.safeParse(raw);
  if (!result.success) {
    // console.warn is the only permitted console method outside main.ts —
    // this runs server-side (build/request time), never in the browser.
    console.warn(
      `[site-config] SITE_URL is set but invalid, falling back to a non-canonical origin: ${result.error.issues.map((issue) => issue.message).join('; ')}`,
    );
    return undefined;
  }
  return result.data.replace(/\/$/, '');
}

export function isProductionCanonical(): boolean {
  // A validly-configured, non-preview SITE_URL is the operator's explicit
  // signal that this is the public canonical origin. NODE_ENV is deliberately
  // NOT part of this check: a self-hosted production deployment (e.g. served
  // at a real domain from the Docker stack) is crawlable even if it does not
  // run with NODE_ENV=production, while localhost/preview/unset still fall
  // back to noindex via SITE_URL validation + the Vercel-env guard.
  return !isVercelPreviewOrDevEnvironment() && readValidatedSiteUrl() !== undefined;
}

export function shouldNoIndexEverything(): boolean {
  return !isProductionCanonical();
}

export function getSiteUrl(): string {
  return readValidatedSiteUrl() ?? DEV_FALLBACK_SITE_URL;
}
