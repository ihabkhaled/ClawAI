import { ImportErrorCode } from '../../../../common/enums/import-error-code.enum';
import { PluginImportError } from '../../errors/plugin-import.error';
import { PluginImportFilter } from '../plugin-import.filter';

function run(error: PluginImportError) {
  const response = { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() };
  const host = { switchToHttp: () => ({ getResponse: () => response }) };
  new PluginImportFilter().catch(error, host as never);
  return response;
}

describe('plugin import filter', () => {
  it('answers a rate limit with 429, Retry-After and the retry time in the body', () => {
    const at = '2026-10-15T10:30:00.000Z';
    const response = run(
      new PluginImportError(ImportErrorCode.SOURCE_RATE_LIMITED, 'limited', {
        afterSeconds: 90,
        at,
      }),
    );

    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '90');
    expect(response.status).toHaveBeenCalledWith(429);
    expect(response.json).toHaveBeenCalledWith({
      message: 'limited',
      errorCode: 'PLUGIN_IMPORT_SOURCE_RATE_LIMITED',
      retryAfterSeconds: 90,
      retryAt: at,
    });
  });

  it('sets no header for an ordinary refusal', () => {
    const response = run(new PluginImportError(ImportErrorCode.NO_PLUGIN_FOUND, 'none'));

    expect(response.setHeader).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(422);
  });
});
