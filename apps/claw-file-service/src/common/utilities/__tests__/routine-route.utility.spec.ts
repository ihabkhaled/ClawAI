import { isRoutineRoute } from '../routine-route.utility';

describe('isRoutineRoute', () => {
  it.each(['/api/v1/health', '/api/v1/metrics', '/api/v1/metrics?x=1'])('%s is routine', (url) => {
    expect(isRoutineRoute(url)).toBe(true);
  });

  it.each(['/api/v1/files', '/api/v1/metrics/extra', undefined])('%s is not', (url) => {
    expect(isRoutineRoute(url)).toBe(false);
  });
});
