'use client';

import { Cpu, HardDrive, MemoryStick, Power, RefreshCw, Server } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { HardwarePanelLabels } from '@/types/local-frontier-ui.types';
import type {
  HardwareSnapshot,
  LoadedModel,
  RuntimeInfo,
} from '@/types/local-frontier.types';

import { HardwareStat } from './hardware-stat';

interface HardwarePanelProps {
  hardware: HardwareSnapshot | undefined;
  runtime: RuntimeInfo | undefined;
  loaded: LoadedModel | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  onUnloadCurrent: () => void;
  labels: HardwarePanelLabels;
}

export function HardwarePanel({
  hardware,
  runtime,
  loaded,
  isRefreshing,
  onRefresh,
  onUnloadCurrent,
  labels,
}: HardwarePanelProps): React.ReactElement {
  const ramValue = hardware ? `${hardware.freeRamGb}/${hardware.totalRamGb} GB` : '—';
  const diskValue = hardware ? `${hardware.freeDiskGb}/${hardware.totalDiskGb} GB` : '—';
  const cpuValue = hardware ? `${hardware.cpuCores} ${labels.cores}` : '—';
  const firstGpu = hardware && hardware.gpus.length > 0 ? hardware.gpus[0] : null;
  const gpuValue = firstGpu ? `${firstGpu.model} (${firstGpu.vramGb} GB)` : labels.noGpu;
  const binaryValue = runtime?.binaryVersion
    ? `${runtime.binaryVersion} (${runtime.gpuBackend})`
    : labels.notInstalled;

  return (
    <section
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm"
      aria-label={labels.title}
    >
      <header className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{labels.title}</h2>
          <p className="text-xs text-muted-foreground">{labels.subtitle}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label={labels.refresh}
        >
          <RefreshCw
            className={`size-3 ${isRefreshing ? 'animate-spin' : ''}`}
            aria-hidden
          />
          {labels.refresh}
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <HardwareStat icon={MemoryStick} label={labels.ram} value={ramValue} />
        <HardwareStat icon={HardDrive} label={labels.disk} value={diskValue} />
        <HardwareStat icon={Cpu} label={labels.cpu} value={cpuValue} />
        <HardwareStat icon={Server} label={labels.gpu} value={gpuValue} />
        <HardwareStat icon={Server} label={labels.binary} value={binaryValue} />
      </div>

      <div className="flex items-center justify-between gap-3 rounded-md border border-dashed border-border bg-background/50 p-3">
        <div className="flex items-center gap-2">
          <Power
            className={`size-4 ${loaded ? 'text-emerald-500' : 'text-muted-foreground'}`}
            aria-hidden
          />
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {labels.loadedModel}
            </span>
            <span className="text-sm font-medium text-foreground">
              {loaded ? `${loaded.name}:${loaded.tag}` : labels.noLoadedModel}
            </span>
          </div>
        </div>
        {loaded ? (
          <Button size="sm" variant="outline" onClick={onUnloadCurrent}>
            <Power className="size-3" aria-hidden />
            {labels.unload}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
