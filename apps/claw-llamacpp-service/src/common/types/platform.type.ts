import { type GpuBackend } from '../enums';

export interface PlatformDescriptor {
  os: 'linux' | 'darwin' | 'win32';
  arch: 'x64' | 'arm64';
  gpuBackend: GpuBackend;
  key: string;
}

export interface GpuInfo {
  vendor: string;
  model: string;
  vramGb: number;
  driver: string;
}
