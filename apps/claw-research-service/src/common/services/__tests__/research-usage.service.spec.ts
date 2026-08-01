import { ResearchUsageService } from '../research-usage.service';

describe('ResearchUsageService', () => {
  it('records durable feature usage without exposing accounting outages to research', async () => {
    const recordFeatureUsage = jest.fn().mockRejectedValue(new Error('auth unavailable'));
    const service = new ResearchUsageService({ recordFeatureUsage } as never);

    await expect(service.record('user-1', 'WEB_SEARCH', 'request-1')).resolves.toBeUndefined();
    expect(recordFeatureUsage).toHaveBeenCalledWith({
      userId: 'user-1',
      feature: 'WEB_SEARCH',
      requestId: 'request-1',
    });
  });
});
