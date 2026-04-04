// Skip Husky install in production, CI, and deployment environments
if (
  process.env.NODE_ENV === 'production' ||
  process.env.CI ||
  process.env.VERCEL ||
  process.env.NETLIFY ||
  process.env.GITHUB_ACTIONS
) {
  process.exit(0);
}

const husky = (await import('husky')).default;
husky();
