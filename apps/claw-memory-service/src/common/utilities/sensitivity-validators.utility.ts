/** Luhn checksum over the digits of a candidate card number. */
export function isLuhnValid(candidate: string): boolean {
  const digits = candidate.replaceAll(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let value = Number(digits[index]);
    if (double) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
    double = !double;
  }
  return sum % 10 === 0;
}

/**
 * A generated secret mixes upper case, lower case and digits. A URL path or a
 * long identifier in prose almost never does all three, and a path has slashes
 * between words rather than scattered through random text.
 */
export function looksLikeSecretToken(candidate: string): boolean {
  const hasUpper = /[A-Z]/.test(candidate);
  const hasLower = /[a-z]/.test(candidate);
  const hasDigit = /\d/.test(candidate);
  const slashCount = candidate.split('/').length - 1;
  return hasUpper && hasLower && hasDigit && slashCount <= 2;
}
