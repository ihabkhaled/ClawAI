import { randomInt } from 'node:crypto';
import { USER_CODE_ALPHABET, USER_CODE_GROUP_LENGTH } from '../constants/auth.constants';

function pickCharacter(): string {
  const index = randomInt(0, USER_CODE_ALPHABET.length);
  return USER_CODE_ALPHABET.charAt(index);
}

function pickGroup(): string {
  let group = '';
  for (let index = 0; index < USER_CODE_GROUP_LENGTH; index += 1) {
    group += pickCharacter();
  }
  return group;
}

export function generateUserCode(): string {
  return `${pickGroup()}-${pickGroup()}`;
}
