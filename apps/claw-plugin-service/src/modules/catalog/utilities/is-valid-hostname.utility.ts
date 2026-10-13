import {
  HOSTNAME_LABEL_PATTERN,
  HOSTNAME_MAX_LENGTH,
  HOSTNAME_TLD_PATTERN,
} from '../constants/catalog.constants';

/**
 * A lowercase DNS name with at least two labels and an alphabetic TLD. A single
 * leading "*." wildcard is accepted. IP literals, ports, paths and
 * single-label names are rejected.
 */
export function isValidHostname(value: string): boolean {
  const name = value.startsWith('*.') ? value.slice(2) : value;
  if (name.length === 0 || name.length > HOSTNAME_MAX_LENGTH) return false;
  const labels = name.split('.');
  if (labels.length < 2) return false;
  const tld = labels.at(-1) ?? '';
  return (
    HOSTNAME_TLD_PATTERN.test(tld) &&
    labels.every(
      (label) =>
        HOSTNAME_LABEL_PATTERN.test(label) && !label.startsWith('-') && !label.endsWith('-'),
    )
  );
}
