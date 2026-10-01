import { ROUTINE_SECRET_AAD_LABEL } from '../constants/routine-secret.constants';

/**
 * The AAD a routine secret is sealed with. A JSON array, not a delimited string, so no
 * id or name can be read as part of another field: `["label","a","b:c","N"]` and
 * `["label","a:b","c","N"]` can never collide.
 */
export function routineSecretAad(routineId: string, userId: string, name: string): string {
  return JSON.stringify([ROUTINE_SECRET_AAD_LABEL, routineId, userId, name]);
}
