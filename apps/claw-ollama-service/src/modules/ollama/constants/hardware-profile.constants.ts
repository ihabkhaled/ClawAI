import { HardwareProfile } from '../../../common/enums/hardware-profile.enum';

export type HardwareProfileRange = {
  profile: HardwareProfile;
  minBytes: bigint;
  maxBytes: bigint;
  label: string;
};

const ONE_GIB = 1_073_741_824n;

export const HARDWARE_PROFILE_RANGES: HardwareProfileRange[] = [
  {
    profile: HardwareProfile.CPU_ONLY,
    minBytes: 0n,
    maxBytes: 3n * ONE_GIB,
    label: 'CPU only (no GPU)',
  },
  {
    profile: HardwareProfile.VRAM_8GB,
    minBytes: 0n,
    maxBytes: 6n * ONE_GIB,
    label: '8GB VRAM',
  },
  {
    profile: HardwareProfile.VRAM_12GB,
    minBytes: 0n,
    maxBytes: 9n * ONE_GIB,
    label: '12GB VRAM',
  },
  {
    profile: HardwareProfile.VRAM_16GB,
    minBytes: 0n,
    maxBytes: 13n * ONE_GIB,
    label: '16GB VRAM',
  },
  {
    profile: HardwareProfile.VRAM_24GB,
    minBytes: 0n,
    maxBytes: 20n * ONE_GIB,
    label: '24GB VRAM',
  },
  {
    profile: HardwareProfile.VRAM_48GB_PLUS,
    minBytes: 0n,
    maxBytes: 80n * ONE_GIB,
    label: '48GB+ VRAM workstation',
  },
];

export const DEFAULT_HARDWARE_PROFILE_SIZE_UPPER_BOUND = 80n * ONE_GIB;
