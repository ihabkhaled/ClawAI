import { type HardwareProfile } from '../../../common/enums/hardware-profile.enum';
import { HARDWARE_PROFILE_RANGES } from '../constants/hardware-profile.constants';

export function assignHardwareProfiles(sizeBytes: bigint | null): HardwareProfile[] {
  if (sizeBytes === null || sizeBytes <= 0n) return [];

  const profiles: HardwareProfile[] = [];
  for (const range of HARDWARE_PROFILE_RANGES) {
    if (sizeBytes <= range.maxBytes) {
      profiles.push(range.profile);
    }
  }
  return profiles;
}

export function modelFitsProfile(sizeBytes: bigint | null, profile: HardwareProfile): boolean {
  if (sizeBytes === null || sizeBytes <= 0n) return false;
  const range = HARDWARE_PROFILE_RANGES.find((r) => r.profile === profile);
  if (range === undefined) return false;
  return sizeBytes <= range.maxBytes;
}
