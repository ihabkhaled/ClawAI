import { type ChildProcess } from 'node:child_process';

export interface SpawnedLlamaServer {
  pid: number;
  port: number;
  child: ChildProcess;
}

export interface RuntimeConfig {
  modelId: string;
  nGpuLayers: number | null;
  ctxSize: number;
  cpuMoe: boolean;
  threads: number | null;
  customArgs: string | null;
}

export interface LoadedModelSnapshot {
  id: string;
  name: string;
  tag: string;
  loadStatus: string;
  port: number | null;
  pid: number | null;
}

export interface UpdateRuntimeConfigPayload {
  nGpuLayers?: number | null;
  ctxSize?: number;
  cpuMoe?: boolean;
  threads?: number | null;
  customArgs?: string | null;
}
