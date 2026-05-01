import { LlamaServerLauncherManager } from '../managers/llama-server-launcher.manager';

describe('LlamaServerLauncherManager - argv safety', () => {
  const binaryService = {
    snapshot: jest.fn().mockReturnValue({ installed: true, path: '/tmp/llama-server', version: 'b4123', platform: 'linux-x64-cpu' }),
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
