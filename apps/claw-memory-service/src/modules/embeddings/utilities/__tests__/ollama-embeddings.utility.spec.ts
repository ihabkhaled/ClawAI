import { AppConfig } from '../../../../app/config/app.config';
import { resetCircuits } from '../../../../common/utilities';
import { fetchEmbedding } from '../ollama-embeddings.utility';

/**
 * `requestEmbedding` reaches `fetch` directly rather than through the shared
 * http client, so it carries its own copy of the URL guard (alert #58). These
 * drive it through the public `fetchEmbedding` entry point by pointing
 * OLLAMA_BASE_URL at each refused shape, and assert no socket was opened.
 */
describe('fetchEmbedding URL guard', () => {
  const originalFetch = global.fetch;
  const originalBaseUrl = process.env['OLLAMA_BASE_URL'];
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resetCircuits();
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    process.env['MEMORY_DATABASE_URL'] ??= 'postgresql://user:pass@localhost:5432/memory';
    process.env['REDIS_URL'] ??= 'redis://localhost:6379';
    process.env['RABBITMQ_URL'] ??= 'amqp://localhost:5672';
    process.env['JWT_SECRET'] ??= 'test-secret-value-that-is-long-enough-32';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalBaseUrl === undefined) {
      delete process.env['OLLAMA_BASE_URL'];
    } else {
      process.env['OLLAMA_BASE_URL'] = originalBaseUrl;
    }
  });

  function withBaseUrl(baseUrl: string): void {
    process.env['OLLAMA_BASE_URL'] = baseUrl;
    AppConfig.validate();
  }

  it('refuses a file:// base URL and never opens a socket', async () => {
    withBaseUrl('file:///etc');
    await expect(fetchEmbedding({ content: 'hello' })).rejects.toThrow(/refusing protocol/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a base URL with embedded credentials', async () => {
    withBaseUrl('https://user:pass@example.com');
    await expect(fetchEmbedding({ content: 'hello' })).rejects.toThrow(/embedded credentials/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses the cloud metadata address', async () => {
    withBaseUrl('http://169.254.169.254/latest/meta-data');
    await expect(fetchEmbedding({ content: 'hello' })).rejects.toThrow(/cloud metadata/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
