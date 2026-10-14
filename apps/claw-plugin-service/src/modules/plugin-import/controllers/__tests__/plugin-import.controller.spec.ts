import { PluginImportController } from '../plugin-import.controller';

const USER = { id: 'user-1' } as never;

function build() {
  const imports = {
    previewGithub: vi.fn().mockResolvedValue({ kind: 'MARKETPLACE', name: 'm', candidates: [] }),
    previewUpload: vi.fn().mockResolvedValue({ kind: 'MARKETPLACE', name: 'm', candidates: [] }),
    confirm: vi.fn().mockResolvedValue({ id: 'p1' }),
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue({ id: 'p1' }),
    remove: vi.fn().mockResolvedValue(undefined),
  };
  return { imports, controller: new PluginImportController(imports as never) };
}

describe('plugin import controller', () => {
  it('takes the user id from the token for every call', async () => {
    const { controller, imports } = build();

    await controller.previewGithub(USER, { source: 'o/r', subdir: 'p' });
    await controller.previewUpload(
      USER,
      { buffer: Buffer.from('x'), originalname: 'a.zip' },
      { subdir: 'q' },
    );
    await controller.confirm(USER, 'd1', { checksum: 'c'.repeat(64), acknowledged: true });
    await controller.list(USER);
    await controller.get(USER, 'p1');
    await controller.remove(USER, 'p1');

    expect(imports.previewGithub).toHaveBeenCalledWith('user-1', 'o/r', 'p');
    expect(imports.previewUpload).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ originalname: 'a.zip' }),
      'q',
    );
    expect(imports.confirm).toHaveBeenCalledWith('user-1', 'd1', 'c'.repeat(64));
    expect(imports.list).toHaveBeenCalledWith('user-1');
    expect(imports.get).toHaveBeenCalledWith('user-1', 'p1');
    expect(imports.remove).toHaveBeenCalledWith('user-1', 'p1');
  });
});
