import { HardwareProfile } from '../../../../common/enums/hardware-profile.enum';
import { assignHardwareProfiles, modelFitsProfile } from '../hardware-profile.utility';

describe('assignHardwareProfiles', () => {
  it('assigns CPU_ONLY to models under 3GB', () => {
    const profiles = assignHardwareProfiles(2_000_000_000n);
    expect(profiles).toContain(HardwareProfile.CPU_ONLY);
  });

  it('assigns VRAM_8GB to 5GB model', () => {
    const profiles = assignHardwareProfiles(5_368_709_120n);
    expect(profiles).toContain(HardwareProfile.VRAM_8GB);
  });

  it('assigns VRAM_12GB to 8GB model', () => {
    const profiles = assignHardwareProfiles(8_589_934_592n);
    expect(profiles).toContain(HardwareProfile.VRAM_12GB);
  });

  it('assigns VRAM_24GB to 18GB model', () => {
    const profiles = assignHardwareProfiles(19_327_352_832n);
    expect(profiles).toContain(HardwareProfile.VRAM_24GB);
  });

  it('assigns VRAM_48GB_PLUS to 70GB model', () => {
    const profiles = assignHardwareProfiles(75_161_927_680n);
    expect(profiles).toContain(HardwareProfile.VRAM_48GB_PLUS);
  });

  it('returns empty for null size', () => {
    const profiles = assignHardwareProfiles(null);
    expect(profiles).toEqual([]);
  });

  it('excludes CPU_ONLY from 5GB model', () => {
    const profiles = assignHardwareProfiles(5_368_709_120n);
    expect(profiles).not.toContain(HardwareProfile.CPU_ONLY);
  });

  it('stacks multiple profiles — 5GB model fits 8GB, 12GB, 16GB, 24GB, 48GB+', () => {
    const profiles = assignHardwareProfiles(5_368_709_120n);
    expect(profiles).toEqual(
      expect.arrayContaining([
        HardwareProfile.VRAM_8GB,
        HardwareProfile.VRAM_12GB,
        HardwareProfile.VRAM_16GB,
        HardwareProfile.VRAM_24GB,
        HardwareProfile.VRAM_48GB_PLUS,
      ]),
    );
  });
});

describe('modelFitsProfile', () => {
  it('returns true for 5GB model on 8GB profile', () => {
    expect(modelFitsProfile(5_368_709_120n, HardwareProfile.VRAM_8GB)).toBe(true);
  });

  it('returns false for 20GB model on 8GB profile', () => {
    expect(modelFitsProfile(21_474_836_480n, HardwareProfile.VRAM_8GB)).toBe(false);
  });

  it('returns false for null size', () => {
    expect(modelFitsProfile(null, HardwareProfile.VRAM_8GB)).toBe(false);
  });
});
