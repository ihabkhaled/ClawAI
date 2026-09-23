import { isRoutineRoute } from '../routine-route.utility';

describe('isRoutineRoute', () => {
  it.each([
    ['/api/v1/health', true],
    ['/api/v1/health?probe=1', true],
    ['/api/v1/auth/grafana-access/verify', true],
    ['/api/v1/auth/grafana-access', false],
    ['/api/v1/auth/login', false],
    [undefined, false],
  ])('%s → %s', (url, expected) => {
    expect(isRoutineRoute(url)).toBe(expected);
  });
});
