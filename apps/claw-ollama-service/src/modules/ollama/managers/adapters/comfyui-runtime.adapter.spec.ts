import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ComfyUIRuntimeAdapter } from './comfyui-runtime.adapter';

jest.mock('@common/utilities', () => {
  const mockClient = { get: jest.fn() };
  return {
    __mockClient: mockClient,
    createHttpClient: jest.fn(() => mockClient),
  };
});

const tempRoot = { path: '' };

jest.mock('../../../../app/config/app.config', () => ({
  AppConfig: {
    get: jest.fn().mockImplementation(() => ({
      COMFYUI_BASE_URL: 'http://comfyui:8188',
      COMFYUI_MODELS_PATH: tempRoot.path,
    })),
  },
}));

describe('ComfyUIRuntimeAdapter', () => {
  const mockClient = jest.requireMock('@common/utilities').__mockClient as {
    get: jest.Mock;
  };

  beforeEach(async () => {
    tempRoot.path = await mkdtemp(join(tmpdir(), 'comfyui-adapter-'));
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (tempRoot.path !== '') {
      await rm(tempRoot.path, { recursive: true, force: true });
    }
  });

  it('reports healthy when /system_stats returns 200', async () => {
    mockClient.get.mockResolvedValue({ data: { devices: [] } });
    const adapter = new ComfyUIRuntimeAdapter();
    const result = await adapter.healthCheck();
    expect(result.runtime).toBe('COMFYUI');
    expect(result.healthy).toBe(true);
  });

  it('reports unhealthy and surfaces the error when /system_stats throws', async () => {
    mockClient.get.mockRejectedValue(new Error('ECONNREFUSED'));
    const adapter = new ComfyUIRuntimeAdapter();
    const result = await adapter.healthCheck();
    expect(result.healthy).toBe(false);
    expect(result.errorMessage).toContain('ECONNREFUSED');
  });

  it('throws on text generation', async () => {
    const adapter = new ComfyUIRuntimeAdapter();
    await expect(adapter.generate({ model: 'sd', prompt: 'x' })).rejects.toThrow(
      'does not support text generation',
    );
  });

  it('rejects pull for catalog keys without a descriptor', async () => {
    mockClient.get.mockResolvedValue({ data: {} });
    const adapter = new ComfyUIRuntimeAdapter();
    await expect(adapter.pullModel('nonexistent:tag')).rejects.toThrow('no download descriptor');
  });

  it('returns existing-file PullJobInfo when weight already present', async () => {
    mockClient.get.mockResolvedValue({ data: {} });
    const checkpointDir = join(tempRoot.path, 'checkpoints');
    await mkdir(checkpointDir, { recursive: true });
    await writeFile(
      join(checkpointDir, 'sd_xl_base_1.0.safetensors'),
      Buffer.from('PRETEND-WEIGHTS'),
    );

    const adapter = new ComfyUIRuntimeAdapter();
    const info = await adapter.pullModel('sdxl-base:1.0');

    expect(info.status).toBe('success');
    expect(info.total).toBeGreaterThan(0);
  });

  it('lists installed weights by scanning the models directory', async () => {
    const checkpointsDir = join(tempRoot.path, 'checkpoints');
    await mkdir(checkpointsDir, { recursive: true });
    await writeFile(join(checkpointsDir, 'foo.safetensors'), Buffer.from('xxx'));
    await writeFile(join(checkpointsDir, 'bar.safetensors.partial'), Buffer.from('yy'));

    const adapter = new ComfyUIRuntimeAdapter();
    const models = await adapter.listModels();

    const names = models.map((m) => m.name);
    expect(names).toContain('foo.safetensors');
    expect(names).not.toContain('bar.safetensors.partial');
  });
});
