import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Schema-contract tests. The definition/deployment split carries invariants that
// are cheap to break in a later migration and expensive to notice: a destructive
// statement slipping into an "additive" migration, OLLAMA_CLOUD collapsing back
// into OLLAMA, or a seeded deployment defaulting to ACTIVE and becoming eligible
// without ever being validated. None of these needs a live database to assert.

const PRISMA_DIR = join(__dirname, '..', '..', '..', '..', 'prisma');
const SCHEMA_PATH = join(PRISMA_DIR, 'schema.prisma');
const MIGRATION_NAME = '20260814073945_add_model_deployment_and_capability_evidence';

const readSchema = (): string => readFileSync(SCHEMA_PATH, 'utf8');
const readMigration = (name: string): string =>
  readFileSync(join(PRISMA_DIR, 'migrations', name, 'migration.sql'), 'utf8');

describe('model deployment schema contract', () => {
  describe('the deployment migration is additive', () => {
    const sql = readMigration(MIGRATION_NAME);

    // The pack mandates additive migrations over destructive rewrites, and this
    // one runs against a populated production registry.
    it.each(['DROP', 'TRUNCATE', 'DELETE FROM', 'ALTER COLUMN', 'RENAME'])(
      'contains no %s statement',
      (keyword) => {
        expect(sql.toUpperCase()).not.toContain(keyword);
      },
    );

    // ALTER TABLE is permitted only to hang foreign keys on the two new tables.
    // Touching an existing table would make the migration non-additive.
    it('only alters the tables it created', () => {
      const altered = [...sql.matchAll(/ALTER TABLE "([a-z_]+)"/g)].map((m) => m[1]);
      const created = [...sql.matchAll(/CREATE TABLE "([a-z_]+)"/g)].map((m) => m[1]);

      expect(created.sort()).toEqual(['capability_evidence', 'model_deployments']);
      for (const table of altered) {
        expect(created).toContain(table);
      }
    });
  });

  describe('provider identity', () => {
    const schema = readSchema();

    // connector-service rewrites any localhost Ollama base URL to
    // https://ollama.com/api, so a single OLLAMA identifier was covering both a
    // local runtime and a third-party endpoint with different privacy and
    // billing. They must stay separable.
    it('distinguishes local OLLAMA from OLLAMA_CLOUD', () => {
      const block = schema.match(/enum RouterProvider \{([^}]*)\}/);
      expect(block).not.toBeNull();

      const members = (block?.[1] ?? '')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('/'));

      expect(members).toContain('OLLAMA');
      expect(members).toContain('OLLAMA_CLOUD');
      expect(members).toContain('GEMINI');
    });
  });

  describe('deployment eligibility defaults', () => {
    const schema = readSchema();

    // A seed writes a bootstrap alias, not a verified endpoint. Defaulting to
    // ACTIVE would let an unvalidated — possibly retired — model id become
    // routable the moment it is seeded.
    it('defaults a new deployment to REQUIRES_VALIDATION', () => {
      const model = schema.match(/model ModelDeployment \{([\s\S]*?)\n\}/);
      expect(model).not.toBeNull();
      expect(model?.[1]).toMatch(
        /activationState\s+DeploymentActivationState\s+@default\(REQUIRES_VALIDATION\)/,
      );
    });

    // connectorId and runtimeId are both nullable, and Postgres treats NULLs as
    // distinct — a composite unique across them would silently admit duplicate
    // local deployments. The identity is therefore one explicit column.
    it('enforces deployment identity through a single unique key column', () => {
      const model = schema.match(/model ModelDeployment \{([\s\S]*?)\n\}/);
      expect(model?.[1]).toMatch(/deploymentKey\s+String\s+@unique/);
    });
  });

  describe('capability evidence provenance', () => {
    const schema = readSchema();
    const model = schema.match(/model CapabilityEvidence \{([\s\S]*?)\n\}/);

    // An unsourced boolean cannot be discounted, expired, or audited. Every
    // claim carries where it came from, how confident it is, and when it was seen.
    it.each(['source', 'confidence', 'observedAt', 'expiresAt'])(
      'requires a %s field on every claim',
      (field) => {
        expect(model?.[1]).toContain(field);
      },
    );

    it('separates declared capability from measured capability', () => {
      const block = schema.match(/enum EvidenceSource \{([^}]*)\}/);
      const members = (block?.[1] ?? '')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('/'));

      expect(members).toContain('PROVIDER_DECLARED');
      expect(members).toContain('LAB_MEASURED');
    });
  });

  describe('migration history', () => {
    const migrationDirs = (): string[] =>
      readdirSync(join(PRISMA_DIR, 'migrations'), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();

    it('is present in the migration history', () => {
      expect(migrationDirs()).toContain(MIGRATION_NAME);
    });

    // Prisma applies migrations in lexicographic directory order. The
    // deployment tables must sort after every migration that predates them —
    // notably the one creating router_model_registry, which they hold a foreign
    // key to. Asserting it is merely *last* would break the moment any later
    // migration lands, which is not the invariant that matters.
    it('sorts after every migration that predates it', () => {
      const dirs = migrationDirs();
      const index = dirs.indexOf(MIGRATION_NAME);
      const preExisting = dirs.filter((name) => name.startsWith('2026') && name < MIGRATION_NAME);

      expect(index).toBeGreaterThan(-1);
      for (const earlier of preExisting) {
        expect(dirs.indexOf(earlier)).toBeLessThan(index);
      }
    });
  });
});
