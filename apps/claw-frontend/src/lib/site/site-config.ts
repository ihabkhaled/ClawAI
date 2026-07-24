import { z } from 'zod';

// Server-only site configuration. Never imported from a 'use client' file —
// SITE_URL is deliberately NOT prefixed NEXT_PUBLIC_ so it is unavailable to
// the browser bundle; every consumer (generateMetadata, robots.ts,
// sitemap.ts, manifest.ts, the root layout) runs on the server.
//
// Validation rules (per the SEO spec): production canonical origin must be
// https://, must not be localhost/127.0.0.1/an unmapped Vercel preview
// domain, and must be a bare origin (no path, query, or fragment). Preview,
// development, and any deployment where SITE_URL is missing or invalid are
// treated as non-canonical and are told to noindex everything — fail-safe,
// never fail-open on indexability.
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
  return (
    process.env.NODE_ENV === 'production' &&
    !isVercelPreviewOrDevEnvironment() &&
    readValidatedSiteUrl() !== undefined
  );
}

export function shouldNoIndexEverything(): boolean {
  return !isProductionCanonical();
}

export function getSiteUrl(): string {
  return readValidatedSiteUrl() ?? DEV_FALLBACK_SITE_URL;
}
