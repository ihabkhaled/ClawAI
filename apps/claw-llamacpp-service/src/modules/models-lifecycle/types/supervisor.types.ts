import { type ChildProcess } from 'node:child_process';

export interface SupervisedInstance {
  modelId: string;
  pid: number;
  port: number;
  child: ChildProcess;
  readyAt: number;
  restartCount: number;
  gracefulUnload: boolean;
}
