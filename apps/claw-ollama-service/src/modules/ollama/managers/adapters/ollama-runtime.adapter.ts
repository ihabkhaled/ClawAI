import { type AxiosInstance, createHttpClient } from '@common/utilities';
import { AppConfig } from '../../../../app/config/app.config';
import { PullJobPhase } from '../../../../common/enums';
import {
  OLLAMA_API_CHAT,
  OLLAMA_API_DELETE,
  OLLAMA_API_GENERATE,
  OLLAMA_API_PULL,
  OLLAMA_API_TAGS,
} from '../../ollama.constants';
import type {
  ChatRequest,
  ChatResponse,
  OllamaNativeChatResponse,
} from '../../types/ollama-chat.types';
import type {
  GenerateRequest,
  GenerateResponse,
  LocalModelInfo,
  PullJobInfo,
  RuntimeAdapter,
  RuntimeHealth,
} from '../../types/ollama.types';
import type {
  OllamaGenerateResponse,
  OllamaModelDetail,
  OllamaPullResponse,
  OllamaTagsResponse,
} from '../../types/ollama-adapters.types';
import type { PullProgressCallback } from '../../types/pull-progress.types';
import { INSTALL_PHASE_STATUS_KEYWORDS } from '../../constants/pull-resilience.constants';

export class OllamaRuntimeAdapter implements RuntimeAdapter {
  private readonly client: AxiosInstance;
  private readonly generateTimeout: number;
  private readonly chatTimeout: number;

  constructor() {
    const config = AppConfig.get();
    this.client = createHttpClient({
      baseURL: config.OLLAMA_BASE_URL,
      timeout: 120_000,
      // A signed-in local Ollama proxies to Cloud models, which need the key.
      // Omitted entirely when unset so a plain local install is unaffected.
      ...(config.OLLAMA_API_KEY
        ? { headers: { Authorization: `Bearer ${config.OLLAMA_API_KEY}` } }
        : {}),
    });
    this.generateTimeout = config.OLLAMA_GENERATE_TIMEOUT_MS;
    this.chatTimeout = config.OLLAMA_CHAT_TIMEOUT_MS;
  }

  async listModels(): Promise<LocalModelInfo[]> {
    const response = await this.client.get<OllamaTagsResponse>(OLLAMA_API_TAGS);
    return response.data.models.map((m) => this.mapModel(m));
  }

  async pullModel(name: string): Promise<PullJobInfo> {
    const response = await this.client.post<OllamaPullResponse>(OLLAMA_API_PULL, {
      name,
      stream: false,
    });
    return response.data;
  }

  async healthCheck(): Promise<RuntimeHealth> {
    const start = Date.now();
    try {
      await this.client.get<OllamaTagsResponse>(OLLAMA_API_TAGS, { timeout: 5000 });
      return {
        runtime: 'OLLAMA',
        healthy: true,
        latencyMs: Date.now() - start,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        runtime: 'OLLAMA',
        healthy: false,
        latencyMs: Date.now() - start,
        errorMessage: message,
      };
    }
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const body: Record<string, unknown> = {
      model: request.model,
      prompt: request.prompt,
      stream: request.stream ?? false,
      options: request.options,
    };
    if (typeof request.think === 'boolean') {
      body['think'] = request.think;
    }
    if (request.images && request.images.length > 0) {
      body['images'] = request.images;
    }
    if (request.keepAlive) {
      // Normalize bare "-1" (no unit) to "-1m" — Go's time.ParseDuration requires a unit
      body['keep_alive'] = request.keepAlive === '-1' ? '-1m' : request.keepAlive;
    }
    const response = await this.client.post<OllamaGenerateResponse>(OLLAMA_API_GENERATE, body, {
      timeout: this.generateTimeout,
    });
    const data = response.data;
    return {
      model: data.model,
      createdAt: data.created_at,
      response: data.response,
      thinking: data.thinking,
      done: data.done,
      totalDuration: data.total_duration,
      loadDuration: data.load_duration,
      promptEvalCount: data.prompt_eval_count,
      evalCount: data.eval_count,
      evalDuration: data.eval_duration,
    };
  }

  // Native `/api/chat`. Unlike generate(), this carries a message array and can
  // therefore carry `tools` — the only local-Ollama path an agent run can use.
  //
  // Deliberately a passthrough: the tool catalog is authored and validated by
  // chat-service, and rewriting it here would let the model be shown a schema
  // this service invented rather than the one the executor enforces.
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const body: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
      stream: request.stream ?? false,
      options: request.options,
    };
    if (typeof request.think === 'boolean') {
      body['think'] = request.think;
    }
    if (request.tools && request.tools.length > 0) {
      body['tools'] = request.tools;
    }
    if (request.format !== undefined) {
      body['format'] = request.format;
    }
    if (request.keepAlive) {
      // Normalize bare "-1" (no unit) to "-1m" — Go's time.ParseDuration
      // requires a unit. Same normalization generate() applies.
      body['keep_alive'] = request.keepAlive === '-1' ? '-1m' : request.keepAlive;
    }
    const response = await this.client.post<OllamaNativeChatResponse>(OLLAMA_API_CHAT, body, {
      timeout: this.chatTimeout,
    });
    return this.mapChatResponse(response.data);
  }

  private mapChatResponse(data: OllamaNativeChatResponse): ChatResponse {
    const message = data.message ?? {};
    return {
      model: data.model,
      createdAt: data.created_at ?? '',
      message: {
        role: message.role ?? 'assistant',
        // A tool-call turn legitimately has no content — the model is asking
        // for a tool, not answering. Never treat that as an error here.
        content: message.content ?? '',
        ...(message.thinking === undefined ? {} : { thinking: message.thinking }),
        ...(message.tool_calls === undefined ? {} : { tool_calls: message.tool_calls }),
      },
      done: data.done ?? true,
      ...(data.done_reason === undefined ? {} : { doneReason: data.done_reason }),
      ...(data.total_duration === undefined ? {} : { totalDuration: data.total_duration }),
      ...(data.load_duration === undefined ? {} : { loadDuration: data.load_duration }),
      ...(data.prompt_eval_count === undefined ? {} : { promptEvalCount: data.prompt_eval_count }),
      ...(data.eval_count === undefined ? {} : { evalCount: data.eval_count }),
      ...(data.eval_duration === undefined ? {} : { evalDuration: data.eval_duration }),
    };
  }

  async deleteModel(name: string): Promise<void> {
    await this.client.delete(OLLAMA_API_DELETE, { data: { name } });
  }

  async pullModelWithProgress(name: string, onProgress: PullProgressCallback): Promise<void> {
    const response = await this.client.post<NodeJS.ReadableStream>(
      OLLAMA_API_PULL,
      {
        name,
        stream: true,
      },
      {
        responseType: 'stream',
        timeout: 600_000,
      },
    );

    await this.parseStreamingProgress(response.data, onProgress);
  }

  private async parseStreamingProgress(
    stream: NodeJS.ReadableStream,
    onProgress: PullProgressCallback,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let buffer = '';
      let isSettled = false;

      const rejectOnce = (error: Error): void => {
        if (isSettled) {
          return;
        }

        isSettled = true;
        reject(error);
      };

      const resolveOnce = (): void => {
        if (isSettled) {
          return;
        }

        isSettled = true;
        resolve();
      };

      stream.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.trim().length === 0) {
            continue;
          }
          const errorMessage = this.processProgressLine(line, onProgress);
          if (errorMessage !== null) {
            rejectOnce(new Error(errorMessage));
            return;
          }
        }
      });

      stream.on('end', () => {
        if (isSettled) {
          return;
        }

        if (buffer.trim().length > 0) {
          const errorMessage = this.processProgressLine(buffer, onProgress);
          if (errorMessage !== null) {
            rejectOnce(new Error(errorMessage));
            return;
          }
        }
        resolveOnce();
      });

      stream.on('error', (error: Error) => {
        rejectOnce(error);
      });
    });
  }

  private processProgressLine(line: string, onProgress: PullProgressCallback): string | null {
    try {
      const data = JSON.parse(line) as OllamaPullResponse;
      if (typeof data.error === 'string' && data.error.length > 0) {
        return data.error;
      }

      const total = data.total ?? 0;
      const completed = data.completed ?? 0;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      const phase = this.classifyPhase(data.status);

      onProgress({
        status: data.status,
        digest: data.digest,
        total: data.total,
        completed: data.completed,
        percentage,
        phase,
        installStep: phase === PullJobPhase.INSTALLING ? data.status : undefined,
      });
    } catch {
      // Skip malformed JSON lines
    }

    return null;
  }

  private classifyPhase(status: string | undefined): PullJobPhase {
    if (!status) {
      return PullJobPhase.DOWNLOADING;
    }
    const lower = status.toLowerCase();
    if (lower === 'success') {
      return PullJobPhase.DONE;
    }
    if (INSTALL_PHASE_STATUS_KEYWORDS.some((keyword) => lower.startsWith(keyword))) {
      return PullJobPhase.INSTALLING;
    }
    if (lower.includes('pulling') || lower.includes('downloading')) {
      return PullJobPhase.DOWNLOADING;
    }
    return PullJobPhase.DOWNLOADING;
  }

  private mapModel(m: OllamaModelDetail): LocalModelInfo {
    const parts = m.name.split(':');
    const name = parts[0] ?? m.name;
    const tag = parts[1] ?? 'latest';
    return {
      name,
      tag,
      sizeBytes: BigInt(m.size),
      family: m.details.family,
      parameters: m.details.parameter_size,
      quantization: m.details.quantization_level,
    };
  }
}
