import { ROUTINE_SUCCESS_PATHS } from '../constants/routine-routes.constants';

/** Whether a request URL (query string ignored) is one of the routine routes. */
export function isRoutineRoute(url: string | undefined): boolean {
  const path = (url ?? '').split('?')[0] ?? '';
  return ROUTINE_SUCCESS_PATHS.includes(path);
}
