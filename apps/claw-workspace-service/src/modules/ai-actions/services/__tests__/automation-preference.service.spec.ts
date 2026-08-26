import { AppConfig } from '../../../../app/config/app.config';
import { AutomationPreferenceService } from '../automation-preference.service';

const mockConfig = { MEMORY_SERVICE_URL: 'http://memory-service:4013' };

global.fetch = jest.fn();

describe('AutomationPreferenceService.fetchLearned', () => {
  let service: AutomationPreferenceService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(AppConfig, 'get')
      .mockReturnValue(mockConfig as unknown as ReturnType<typeof AppConfig.get>);
    service = new AutomationPreferenceService({} as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('requests memory-service with the userId and returns the parsed rows', async () => {
    const rows = [
      { id: 'p1', content: 'User prefers X', type: 'PREFERENCE', createdAt: 'a', updatedAt: 'b' },
    ];
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(rows) });

    const result = await service.fetchLearned('user-1');

    expect(result).toEqual(rows);
    const [url] = (global.fetch as jest.Mock).mock.calls[0] as [string];
    expect(url).toContain(
      'http://memory-service:4013/api/v1/internal/memories/learned-preferences',
    );
    expect(url).toContain('userId=user-1');
  });

  it('includes actionKind and limit in the query string when given', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });

    await service.fetchLearned('user-1', 'DRAFT', 5);

    const [url] = (global.fetch as jest.Mock).mock.calls[0] as [string];
    expect(url).toContain('actionKind=DRAFT');
    expect(url).toContain('limit=5');
  });

  it('returns an empty list when memory-service responds with a non-OK status', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

    const result = await service.fetchLearned('user-1');

    expect(result).toEqual([]);
  });

  it('returns an empty list rather than throwing when the request itself fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network down'));

    const result = await service.fetchLearned('user-1');

    expect(result).toEqual([]);
  });
});
