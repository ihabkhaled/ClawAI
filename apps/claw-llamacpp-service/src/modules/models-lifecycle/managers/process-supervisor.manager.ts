import { type ChildProcess } from 'node:child_process';
import { Injectable, Logger } from '@nestjs/common';
import { type SupervisedInstance } from '../types/supervisor.types';

@Injectable()
export class ProcessSupervisorManager {
  private readonly logger = new Logger(ProcessSupervisorManager.name);
  private current: SupervisedInstance | null = null;

  attach(payload: {
    modelId: string;
    pid: number;
    port: number;
    child: ChildProcess;
    onCrash: (info: { code: number | null; signal: NodeJS.Signals | null }) => Promise<void>;
  }): void {
    this.logger.log(`attach: model=${payload.modelId} pid=${payload.pid} port=${payload.port}`);
    this.detach();
    const instance: SupervisedInstance = {
      modelId: payload.modelId,
      pid: payload.pid,
      port: payload.port,
      child: payload.child,
      readyAt: Date.now(),
      restartCount: 0,
      gracefulUnload: false,
    };
    this.current = instance;
    payload.child.on('exit', (code, signal) => {
      this.logger.warn(`exit: model=${payload.modelId} code=${String(code)} signal=${String(signal)}`);
      void payload.onCrash({ code, signal });
    });
  }

  markGracefulUnload(): void {
    if (this.current) {
      this.current.gracefulUnload = true;
    }
  }

  detach(): void {
    if (!this.current) {
      return;
    }
    this.logger.debug(`detach: pid=${this.current.pid}`);
    this.current.child.removeAllListeners('exit');
    this.current = null;
  }

  getCurrent(): SupervisedInstance | null {
    return this.current;
  }
}
