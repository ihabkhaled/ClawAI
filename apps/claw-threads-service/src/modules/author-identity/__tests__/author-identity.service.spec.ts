import { AuthorIdentityService } from '../services/author-identity.service';

function create() {
  const client = {
    fetchProfiles: vi.fn(),
    fetchByUsername: vi.fn(),
  };
  return { client, service: new AuthorIdentityService(client as never) };
}

const ada = { id: 'u1', username: 'ada', displayName: 'Ada Lovelace' };

describe('AuthorIdentityService', () => {
  it('names the authors, drops null and repeated ids and never exposes the id', async () => {
    const { client, service } = create();
    client.fetchProfiles.mockResolvedValue([ada]);
    const names = await service.resolveMany(['u1', null, 'u1', undefined, '']);
    expect(client.fetchProfiles).toHaveBeenCalledWith(['u1']);
    expect(names.get('u1')).toEqual({ username: 'ada', displayName: 'Ada Lovelace' });
    expect(names.get('u1')).not.toHaveProperty('id');
  });

  it('serves a second request from the cache', async () => {
    const { client, service } = create();
    client.fetchProfiles.mockResolvedValue([ada]);
    await service.resolveMany(['u1']);
    await service.resolveMany(['u1']);
    expect(client.fetchProfiles).toHaveBeenCalledTimes(1);
  });

  it('leaves out an id the auth service did not return and ignores strangers in the answer', async () => {
    const { client, service } = create();
    client.fetchProfiles.mockResolvedValue([
      ada,
      { id: 'intruder', username: 'x', displayName: 'X' },
    ]);
    const names = await service.resolveMany(['u1', 'gone']);
    expect(names.has('u1')).toBe(true);
    expect(names.has('gone')).toBe(false);
    expect(names.has('intruder')).toBe(false);
  });

  it('batches 100 ids per call', async () => {
    const { client, service } = create();
    client.fetchProfiles.mockResolvedValue([]);
    const ids = Array.from({ length: 230 }, (_, index) => `u${String(index)}`);
    await service.resolveMany(ids);
    expect(client.fetchProfiles).toHaveBeenCalledTimes(3);
    expect(client.fetchProfiles.mock.calls[0]?.[0]).toHaveLength(100);
    expect(client.fetchProfiles.mock.calls[2]?.[0]).toHaveLength(30);
  });

  it('resolveOne gives null for a null id, an unknown id and a failed lookup', async () => {
    const { client, service } = create();
    client.fetchProfiles.mockResolvedValue([]);
    await expect(service.resolveOne(null)).resolves.toBeNull();
    await expect(service.resolveOne('u9')).resolves.toBeNull();
  });

  it('resolves a username case-insensitively through one cached lookup', async () => {
    const { client, service } = create();
    client.fetchByUsername.mockResolvedValue(ada);
    await expect(service.resolveByUsername('ADA')).resolves.toEqual(ada);
    await expect(service.resolveByUsername('ada')).resolves.toEqual(ada);
    expect(client.fetchByUsername).toHaveBeenCalledTimes(1);
  });

  it('does not cache an unknown username', async () => {
    const { client, service } = create();
    client.fetchByUsername.mockResolvedValue(null);
    await service.resolveByUsername('ghost');
    await service.resolveByUsername('ghost');
    expect(client.fetchByUsername).toHaveBeenCalledTimes(2);
  });
});
