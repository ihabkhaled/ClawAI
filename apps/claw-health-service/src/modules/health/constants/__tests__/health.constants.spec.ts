import { SERVICE_URLS } from '../health.constants';

describe('SERVICE_URLS', () => {
  it('registers both Threads services on their configured health routes', () => {
    expect(SERVICE_URLS['threads-service']).toBe('https://threads-service:4019/api/v1/health');
    expect(SERVICE_URLS['thread-generation-service']).toBe(
      'https://thread-generation-service:4020/api/v1/health',
    );
  });
});
