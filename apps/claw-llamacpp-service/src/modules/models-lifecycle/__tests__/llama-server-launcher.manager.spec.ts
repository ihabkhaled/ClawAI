import { LlamaServerLauncherManager } from '../managers/llama-server-launcher.manager';

describe('LlamaServerLauncherManager - argv safety', () => {
  const binaryService = {
    snapshot: jest
      .fn()
      .mockReturnValue({
        installed: true,
        path: '/tmp/llama-server',
        version: 'b4123',
        platform: 'linux-x64-cpu',
      }),
  };
  const launcher = new LlamaServerLauncherManager(binaryService as any);

  it('rejects customArgs containing semicolons', () => {
    expect(() => (launcher as any).parseCustomArgs('--n-batch 32 ; rm -rf /')).toThrow(/forbidden/);
  });

  it('rejects customArgs containing backticks', () => {
    expect(() => (launcher as any).parseCustomArgs('--n-batch `pwd`')).toThrow(/forbidden/);
  });

  it('rejects non-allowlisted flag', () => {
    expect(() => (launcher as any).parseCustomArgs('--random-flag yes')).toThrow(/disallowed/);
  });

  it('accepts allowlisted flag', () => {
    expect(() => (launcher as any).parseCustomArgs('--n-batch 32')).not.toThrow();
  });
});

describe('LlamaServerLauncherManager - --jinja gating', () => {
  const binaryService = {
    snapshot: jest.fn().mockReturnValue({
      installed: true,
      path: '/tmp/llama-server',
      version: 'b4123',
      platform: 'linux-x64-cpu',
    }),
  };
  const launcher = new LlamaServerLauncherManager(binaryService as any);

  const entry = (capabilities: string[]) => ({ name: 'kimi-k2', tag: 'q4', capabilities }) as any;

  it('enables --jinja for an entry advertising the tools capability', () => {
    expect((launcher as any).shouldEnableJinja(entry(['reasoning', 'tools']), true)).toBe(true);
  });

  it('does NOT enable --jinja for an entry without the tools capability', () => {
    // A GGUF whose embedded template is not tool-aware can fail to start under
    // --jinja. Gating per entry means a bad template can never take down a
    // model that never needed tools.
    expect((launcher as any).shouldEnableJinja(entry(['code_generation']), true)).toBe(false);
    expect((launcher as any).shouldEnableJinja(entry([]), true)).toBe(false);
  });

  it('honours the LLAMACPP_ENABLE_JINJA kill switch even for a tools entry', () => {
    expect((launcher as any).shouldEnableJinja(entry(['tools']), false)).toBe(false);
  });
});
