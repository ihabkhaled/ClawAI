import { lookup } from 'node:dns/promises';

import { EgressErrorCode } from '../../../common/enums/egress-error-code.enum';
import { DnsHostResolver } from '../resolvers/dns-host.resolver';

vi.mock('node:dns/promises', () => ({ lookup: vi.fn() }));

const lookupMock = vi.mocked(lookup) as unknown as ReturnType<typeof vi.fn>;

describe('DnsHostResolver', () => {
  afterEach(() => {
    vi.useRealTimers();
    lookupMock.mockReset();
  });

  it('asks for every address, not just the first, in the order the system returns them', async () => {
    lookupMock.mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '2606:2800:220:1::1', family: 6 },
    ]);

    const answers = await new DnsHostResolver().resolveAll('example.com');

    expect(answers).toEqual(['93.184.216.34', '2606:2800:220:1::1']);
    expect(lookupMock).toHaveBeenCalledWith('example.com', { all: true, verbatim: true });
  });

  it('reports a failed lookup as DNS_FAILURE without the system error text', async () => {
    lookupMock.mockRejectedValue(
      Object.assign(new Error('getaddrinfo ENOTFOUND internal-host.corp'), { code: 'ENOTFOUND' }),
    );

    let error = { code: '', message: '', detail: '' };
    try {
      await new DnsHostResolver().resolveAll('internal-host.corp');
    } catch (caught) {
      error = caught as typeof error;
    }

    expect(error.code).toBe(EgressErrorCode.DNS_FAILURE);
    expect(error.message).not.toContain('internal-host');
    expect(error.detail).not.toContain('internal-host');
  });

  it('gives up after the DNS timeout', async () => {
    vi.useFakeTimers();
    lookupMock.mockReturnValue(new Promise(() => {}));

    const pending = new DnsHostResolver().resolveAll('slow.example.com');
    const assertion = expect(pending).rejects.toMatchObject({ code: EgressErrorCode.DNS_FAILURE });
    await vi.advanceTimersByTimeAsync(5100);

    await assertion;
  });
});
