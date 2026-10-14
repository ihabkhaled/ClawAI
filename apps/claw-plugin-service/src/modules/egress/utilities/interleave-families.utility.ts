import { type PinnedAddress } from '../types/egress.types';

/** IPv4 first, then alternating families (Happy Eyeballs order), so one dead family cannot starve the other. */
export function interleaveFamilies(addresses: readonly string[]): PinnedAddress[] {
  const v4 = addresses.filter((address) => !address.includes(':'));
  const v6 = addresses.filter((address) => address.includes(':'));
  const ordered: PinnedAddress[] = [];
  for (let index = 0; index < Math.max(v4.length, v6.length); index += 1) {
    const four = v4.at(index);
    const six = v6.at(index);
    if (four !== undefined) ordered.push({ address: four, family: 4 });
    if (six !== undefined) ordered.push({ address: six, family: 6 });
  }
  return ordered;
}
