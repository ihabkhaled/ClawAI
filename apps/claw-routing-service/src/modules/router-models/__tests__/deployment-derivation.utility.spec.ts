import { DeploymentType, PrivacyClass, RouterProvider } from '../../../generated/prisma';
import type { DeploymentSeedSourceRow } from '../types/deployment-seed.types';
import { buildDeploymentKey, deriveDeployments } from '../utilities/deployment-derivation.utility';

const row = (overrides: Partial<DeploymentSeedSourceRow> = {}): DeploymentSeedSourceRow => ({
  id: 'def_1',
  provider: 'GEMINI',
  modelKey: 'gemini-2.5-flash',
  connectorId: 'conn_1',
  runtimeId: null,
  isLocal: false,
  privacySupport: PrivacyClass.CLOUD_PERMITTED,
  contextWindowTokens: 1_000_000,
  maxOutputTokens: 8_192,
  supportsTools: true,
  supportsStructuredOutput: true,
  supportsStreaming: true,
  supportsVision: true,
  ...overrides,
});

describe('buildDeploymentKey', () => {
  // connectorId and runtimeId are both nullable and Postgres treats NULLs as
  // distinct, so identity is collapsed into one comparable string instead of a
  // composite unique that would admit duplicates.
  it('keys on the connector when there is one', () => {
    expect(buildDeploymentKey('GEMINI', 'gemini-2.5-flash', 'conn_1', null)).toBe(
      'GEMINI:gemini-2.5-flash:conn_1',
    );
  });

  it('falls back to the runtime for local models', () => {
    expect(buildDeploymentKey('OLLAMA', 'glm-5.2', null, 'rt_1')).toBe('OLLAMA:glm-5.2:rt_1');
  });

  it('uses an explicit scope when neither is present, so the key is never ambiguous', () => {
    expect(buildDeploymentKey('OLLAMA', 'glm-5.2', null, null)).toBe('OLLAMA:glm-5.2:default');
  });

  it('distinguishes the same model reached through two different connectors', () => {
    const first = buildDeploymentKey('GEMINI', 'gemini-2.5-flash', 'conn_1', null);
    const second = buildDeploymentKey('GEMINI', 'gemini-2.5-flash', 'conn_2', null);
    expect(first).not.toBe(second);
  });
});

describe('deriveDeployments', () => {
  describe('provider mapping', () => {
    it.each([
      ['OPENAI', RouterProvider.OPENAI],
      ['ANTHROPIC', RouterProvider.ANTHROPIC],
      ['GEMINI', RouterProvider.GEMINI],
      ['DEEPSEEK', RouterProvider.DEEPSEEK],
      ['GROK', RouterProvider.GROK],
      ['OLLAMA', RouterProvider.OLLAMA],
      ['LLAMACPP', RouterProvider.LLAMACPP],
    ])('maps the registry string %s to the canonical enum', (registryProvider, expected) => {
      const { deployments } = deriveDeployments([row({ provider: registryProvider })]);
      expect(deployments[0]?.provider).toBe(expected);
    });

    // The seed writes BEDROCK; the enum calls it AWS_BEDROCK. Both must land on
    // the same identity or one model becomes two unrelated endpoints.
    it.each(['BEDROCK', 'AWS_BEDROCK'])('folds %s onto AWS_BEDROCK', (registryProvider) => {
      const { deployments } = deriveDeployments([row({ provider: registryProvider })]);
      expect(deployments[0]?.provider).toBe(RouterProvider.AWS_BEDROCK);
    });

    it('accepts a lower-case provider string', () => {
      const { deployments } = deriveDeployments([row({ provider: 'gemini' })]);
      expect(deployments[0]?.provider).toBe(RouterProvider.GEMINI);
    });

    // Guessing here would mint a routable endpoint for a provider nobody has
    // verified, which is exactly what the activation states exist to prevent.
    it('skips an unrecognised provider instead of guessing', () => {
      const { deployments, skipped } = deriveDeployments([row({ provider: 'MYSTERY_VENDOR' })]);

      expect(deployments).toHaveLength(0);
      expect(skipped).toEqual([
        { definitionId: 'def_1', provider: 'MYSTERY_VENDOR', reason: 'UNMAPPED_PROVIDER' },
      ]);
    });

    it('skips a definition with a blank model key', () => {
      const { deployments, skipped } = deriveDeployments([row({ modelKey: '   ' })]);

      expect(deployments).toHaveLength(0);
      expect(skipped[0]?.reason).toBe('EMPTY_MODEL_KEY');
    });

    it('keeps deriving the rest after skipping one', () => {
      const { deployments, skipped } = deriveDeployments([
        row({ id: 'def_bad', provider: 'MYSTERY_VENDOR' }),
        row({ id: 'def_good', provider: 'OPENAI', modelKey: 'gpt-4o-mini' }),
      ]);

      expect(skipped).toHaveLength(1);
      expect(deployments).toHaveLength(1);
      expect(deployments[0]?.definitionId).toBe('def_good');
    });
  });

  describe('deployment type', () => {
    it('types a local runtime model as LOCAL', () => {
      const { deployments } = deriveDeployments([
        row({ provider: 'OLLAMA', isLocal: true, connectorId: null, runtimeId: 'rt_1' }),
      ]);
      expect(deployments[0]?.deploymentType).toBe(DeploymentType.LOCAL);
    });

    it('types a connector-reached model as CLOUD_API', () => {
      const { deployments } = deriveDeployments([row()]);
      expect(deployments[0]?.deploymentType).toBe(DeploymentType.CLOUD_API);
    });

    // An OLLAMA row flagged non-local is reaching something that is not the
    // local runtime, so typing it LOCAL would misreport where the data goes.
    it('does not type a non-local OLLAMA row as LOCAL', () => {
      const { deployments } = deriveDeployments([
        row({ provider: 'OLLAMA', isLocal: false, connectorId: 'conn_9', runtimeId: null }),
      ]);
      expect(deployments[0]?.deploymentType).toBe(DeploymentType.CLOUD_API);
    });

    // Promoting a local Ollama row to the cloud would be an assumption about
    // data egress. Only discovery may create OLLAMA_CLOUD endpoints.
    it('never derives OLLAMA_CLOUD from the registry', () => {
      const { deployments } = deriveDeployments([
        row({ provider: 'OLLAMA', isLocal: true, runtimeId: 'rt_1', connectorId: null }),
        row({ id: 'def_2', provider: 'OLLAMA', isLocal: false, connectorId: 'conn_2' }),
      ]);

      expect(deployments.map((entry) => entry.provider)).not.toContain(RouterProvider.OLLAMA_CLOUD);
    });
  });

  describe('carried metadata', () => {
    it('preserves the definition privacy class', () => {
      const { deployments } = deriveDeployments([row({ privacySupport: PrivacyClass.LOCAL_ONLY })]);
      expect(deployments[0]?.privacyClass).toBe(PrivacyClass.LOCAL_ONLY);
    });

    it('carries capability flags through, including unknown-as-null', () => {
      const { deployments } = deriveDeployments([
        row({ supportsTools: null, supportsVision: false }),
      ]);

      expect(deployments[0]?.supportsTools).toBeNull();
      expect(deployments[0]?.supportsVision).toBe(false);
    });

    // A derived row must never claim to be validated. The column default is
    // REQUIRES_VALIDATION, so the derivation deliberately does not emit one.
    it('never emits an activation state', () => {
      const { deployments } = deriveDeployments([row()]);
      expect(deployments[0]).not.toHaveProperty('activationState');
    });

    it('tags the row so a backfilled endpoint is distinguishable from a synced one', () => {
      const { deployments } = deriveDeployments([row()]);
      expect(deployments[0]?.metadataSource).toBe('deployment-backfill');
    });
  });

  it('returns empty results for an empty registry', () => {
    expect(deriveDeployments([])).toEqual({ deployments: [], skipped: [] });
  });
});
