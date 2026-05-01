import * as net from 'node:net';
import * as path from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { resolveSafePath, spawnDetached } from '../../../common/utilities';
import { AppConfig } from '../../../app/config/app.config';
import { type CatalogEntry } from '../../catalog/types/catalog.types';
import { BinaryService } from '../../binary/services/binary.service';
import {
  ALLOWED_CUSTOM_ARGS,
  FORBIDDEN_ARG_TOKENS,
} from '../constants/launcher.constants';
import { type RuntimeConfig, type SpawnedLlamaServer } from '../types/process.types';

@Injectable()
export class LlamaServerLauncherManager {
  private readonly logger = new Logger(LlamaServerLauncherManager.name);

  constructor(private readonly binaryService: BinaryService) {}

  async spawn(model: CatalogEntry, config: RuntimeConfig): Promise<SpawnedLlamaServer> {
    this.logger.log(`spawn: model=${model.name}:${model.tag}`);
    const status = this.binaryService.snapshot();
    if (!status.installed || !status.path) {
      this.logger.error('spawn: binary not installed');
      throw new Error('llama-server binary not installed');
    }

    const dataPath = AppConfig.get().LLAMACPP_DATA_PATH;
    const modelDir = resolveSafePath(dataPath, path.join('models', model.name, model.tag));
    const args = await this.buildArgs(modelDir, model, config);
    const port = await this.allocatePort();
    args.push('--port', String(port));

    this.logger.log(`spawn: argv=${args.join(' ')} port=${port}`);
    const child = spawnDetached(status.path, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (!child.pid) {
      this.logger.error('spawn: child process has no PID');
      throw new Error('Failed to spawn llama-server (no PID)');
    }

    child.stderr?.on('data', (chunk: Buffer) => {
      const line = this.redactPath(chunk.toString('utf8'));
      this.logger.debug(`llama-stderr: ${line.trimEnd()}`);
    });

    return { pid: child.pid, port, child };
  }

  private async buildArgs(
    modelDir: string,
    model: CatalogEntry,
    config: RuntimeConfig,
  ): Promise<string[]> {
    const appConfig = AppConfig.get();
    const args: string[] = [
      '--model',
      this.firstGgufPath(modelDir),
      '--host',
      appConfig.LLAMACPP_BIND_HOST,
      '--ctx-size',
      String(config.ctxSize),
    ];
    if (config.nGpuLayers !== null) {
      args.push('--n-gpu-layers', String(config.nGpuLayers));
    }
    if (config.threads !== null) {
      args.push('--threads', String(config.threads));
    }
    if (config.cpuMoe) {
      args.push('--cpu-moe');
    }
    if (model.chatTemplate) {
      args.push('--chat-template', model.chatTemplate);
    }
    if (config.customArgs) {
      const safe = this.parseCustomArgs(config.customArgs);
      args.push(...safe);
    }
    return args;
  }

  private firstGgufPath(dir: string): string {
    return path.join(dir, '*.gguf');
  }

  private parseCustomArgs(raw: string): string[] {
    if (FORBIDDEN_ARG_TOKENS.some((token) => raw.includes(token))) {
      this.logger.error(`parseCustomArgs: forbidden token found in customArgs`);
      throw new Error('customArgs contain forbidden shell tokens');
    }
    const tokens = raw.split(/\s+/).filter((token) => token.length > 0);
    const safe: string[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (!token || !token.startsWith('--')) {
        if (token) {
          safe.push(token);
        }
        continue;
      }
      if (!ALLOWED_CUSTOM_ARGS.includes(token)) {
        this.logger.error(`parseCustomArgs: rejected non-allowlisted arg ${token}`);
        throw new Error(`customArgs contains disallowed flag: ${token}`);
      }
      safe.push(token);
    }
    return safe;
  }

  private redactPath(message: string): string {
    const dataPath = AppConfig.get().LLAMACPP_DATA_PATH;
    return message.split(dataPath).join('<DATA_PATH>');
  }

  private async allocatePort(): Promise<number> {
    const config = AppConfig.get();
    const min = config.LLAMACPP_PROCESS_PORT_MIN;
    const max = config.LLAMACPP_PROCESS_PORT_MAX;
    for (let attempt = 0; attempt < 50; attempt++) {
      const port = min + Math.floor(Math.random() * (max - min));
      // eslint-disable-next-line no-await-in-loop
      const free = await this.isPortFree(port);
      if (free) {
        return port;
      }
    }
    throw new Error('No free port available for llama-server in configured range');
  }

  private isPortFree(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const tester = net.createServer().once('error', () => resolve(false));
      tester.once('listening', () => {
        tester.close(() => resolve(true));
      });
      tester.listen({ port, host: '127.0.0.1' });
    });
  }
}
