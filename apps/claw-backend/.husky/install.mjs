import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Only install husky if we are in a git repo and not in CI
const gitDir = resolve(process.cwd(), '.git');
if (existsSync(gitDir) && !process.env.CI) {
  try {
    execSync('npx husky install apps/claw-backend/.husky', { stdio: 'inherit' });
  } catch {
    // Husky install is best-effort
    console.warn('Husky install skipped (not in git root or husky not available)');
  }
}
