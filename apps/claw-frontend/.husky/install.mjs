import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

if (
  process.env.NODE_ENV === 'production' ||
  process.env.CI ||
  process.env.VERCEL ||
  process.env.NETLIFY ||
  process.env.GITHUB_ACTIONS
) {
  process.exit(0);
}

const repositoryRoot = fileURLToPath(new URL('../../..', import.meta.url));
process.chdir(repositoryRoot);

if (!existsSync('.git')) {
  process.exit(0);
}

try {
  const husky = (await import('husky')).default;
  husky();
} catch {
  process.exit(0);
}
