import { readdirSync } from 'node:fs';
import * as net from 'node:net';
import * as path from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { resolveSafePath, spawnDetached } from '../../../common/utilities';
import { AppConfig } from '../../../app/config/app.config';
import { type CatalogEntry } from '../../catalog/types/catalog.types';
import { BinaryService } from '../../binary/services/binary.service';
import {
  ALLOWED_CUSTOM_ARGS,
  CATALOG_TOOLS_CAPABILITY,
  FORBIDDEN_ARG_TOKENS,
  LLAMA_JINJA_ARG,
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

    // status.path can be relative (e.g. `data/llamacpp/bin/llama-server`); Node
    // child_process.spawn does NOT resolve relative paths via $PATH or cwd
    // reliably across all kernels — pass an absolute path.
    const binaryAbsPath = path.isAbsolute(status.path)
      ? status.path
      : path.resolve(process.cwd(), status.path);
    this.logger.log(`spawn: argv=${args.join(' ')} port=${port} bin=${binaryAbsPath}`);
    const child = spawnDetached(binaryAbsPath, args, {
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
    if (this.shouldEnableJinja(model, appConfig.LLAMACPP_ENABLE_JINJA)) {
      args.push(LLAMA_JINJA_ARG);
      this.logger.log(
        `buildArgs: ${LLAMA_JINJA_ARG} enabled for ${model.name}:${model.tag} — tool-call parsing active`,
      );
    }
    if (config.customArgs) {
      const safe = this.parseCustomArgs(config.customArgs);
      args.push(...safe);
    }
    return args;
  }

  // Per-entry gate, deliberately not a global switch. `--jinja` is what makes
  // llama-server parse an emitted tool call into `message.tool_calls`; without
  // it a tool-capable model emits the call as raw text and it is invisible
  // downstream. But a GGUF whose embedded template is not tool-aware can fail
  // to start under `--jinja`, so only entries advertising the capability get
  // it. LLAMACPP_ENABLE_JINJA is the kill switch if a release regresses.
  private shouldEnableJinja(model: CatalogEntry, enabled: boolean): boolean {
    if (!enabled) {
      return false;
    }
    return model.capabilities.includes(CATALOG_TOOLS_CAPABILITY);
  }

  private firstGgufPath(dir: string): string {
    // child_process.spawn does NOT expand glob patterns (no shell). Resolve
    // the actual first .gguf file in `dir` and return its absolute path.
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch (error) {
      this.logger.error(
        `firstGgufPath: could not read model dir ${dir} — ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      throw new Error(`No .gguf file found in ${dir}: directory unreadable`, { cause: error });
    }
    const ggufs = entries.filter((f) => f.toLowerCase().endsWith('.gguf')).sort();
    const first = ggufs[0];
    if (first === undefined) {
      throw new Error(`No .gguf file found in ${dir}`);
    }
    return path.join(dir, first);
  }

  private parseCustomArgs(raw: string): string[] {
    if (FORBIDDEN_ARG_TOKENS.some((token) => raw.includes(token))) {
      this.logger.error(`parseCustomArgs: forbidden token found in customArgs`);
      throw new Error('customArgs contain forbidden shell tokens');
    }
    const tokens = raw.split(/\s+/).filter((token) => token.length > 0);
    const safe: string[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens.at(i);
      if (!token?.startsWith('--')) {
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
