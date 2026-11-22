import type { ChildProcess } from 'node:child_process';

/** One running fixture broadcaster (an ffmpeg looping a file into a local HLS window). */
export interface FixtureBroadcast {
  name: string;
  directory: string;
  process: ChildProcess;
  lastUsedAt: number;
}
