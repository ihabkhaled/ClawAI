/**
 * Constants used by the GPU/runtime detection utilities (DRI, nvidia-smi,
 * rocm-smi). Extracted out of the utility files to comply with the
 * `no-restricted-syntax` "no top-level const" rule.
 */

export const DRI_DIR = '/dev/dri';

export const NVIDIA_SMI_QUERY = [
  '--query-gpu=name,memory.total,driver_version',
  '--format=csv,noheader,nounits',
];

export const ROCM_SMI_QUERY = ['--showproductname', '--showmeminfo', 'vram', '--csv'];
