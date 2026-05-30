import { Injectable, Logger, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { buildRuntimeProgressEvent, httpGet, httpPost } from '@claw/shared-utilities';
import {
  type ClawRuntimeProgressEvent,
  RuntimeModality,
  RuntimeProgressConfidence,
  RuntimeProgressEventType,
  RuntimeProgressStage,
  RuntimeProvider,
  StreamingErrorType,
} from '@claw/shared-types';

import {
  COMFYUI_COMPLETION_POLL_MS,
  COMFYUI_HISTORY_GET_TIMEOUT_MS,
  COMFYUI_INTERRUPT_TIMEOUT_MS,
  COMFYUI_MAX_EXECUTION_MS,
  COMFYUI_PROMPT_POST_TIMEOUT_MS,
  COMFYUI_VIEW_GET_TIMEOUT_MS,
  COMFYUI_WS_EVENT_EXECUTED,
  COMFYUI_WS_EVENT_EXECUTING,
  COMFYUI_WS_EVENT_EXECUTION_CACHED,
  COMFYUI_WS_EVENT_EXECUTION_ERROR,
  COMFYUI_WS_EVENT_EXECUTION_START,
  COMFYUI_WS_EVENT_PROGRESS,
  COMFYUI_WS_EVENT_STATUS,
  COMFYUI_WS_OPEN_TIMEOUT_MS,
  COMFYUI_WS_RECONNECT_BACKOFF_MS,
  COMFYUI_WS_RECONNECT_MAX_ATTEMPTS,
} from '../constants/comfyui.constants';
import type {
  ComfyUIAttachWsHandlersArgs,
  ComfyUIBaseMetrics,
  ComfyUIEmitCtx,
  ComfyUIEmitCtxWithState,
  ComfyUIEmitExecutingCtx,
  ComfyUIEmitProgressCtx,
  ComfyUIErrorEventArgs,
  ComfyUIGenerationResult,
  ComfyUIHandleWsMessageArgs,
  ComfyUIHistoryEntry,
  ComfyUIHistoryImage,
  ComfyUIHttpGetFn,
  ComfyUIHttpPostFn,
  ComfyUINodeDescriptor,
  ComfyUINodeTiming,
  ComfyUIProbeResult,
  ComfyUIProgressAdapterDeps,
  ComfyUIPromptResponse,
  ComfyUIStreamGenerateOptions,
  ComfyUIStreamState,
  ComfyUIWebSocketFactory,
  ComfyUIWebSocketLike,
  ComfyUIWorkflowPayload,
} from '../types/comfyui.types';
import { buildNodeDescriptors, findDescriptor } from '../workflows/comfyui-workflow-node.mapper';

// ComfyUI runtime progress adapter. Owns the full request lifecycle:
//   1. Open WS to <base>/ws?clientId=<id> (with one reconnect).
//   2. POST workflow + client_id to <base>/prompt; capture prompt_id.
//   3. Consume WS messages, normalize each to a ClawRuntimeProgressEvent,
//      forward via onEvent.
//   4. On executing.node === null: GET <base>/history/<promptId> to
//      discover saved filenames, then GET <base>/view?... to fetch image
//      bytes (returned as base64 in the result).
//   5. Always emit a final LIFECYCLE/DONE or ERROR event before resolving
//      so receivers can teardown deterministically.
//
// The adapter is stateless across calls — every streamGenerate opens its
// own WS and tracks its own counters, safe for parallel generations.
@Injectable()
export class ComfyUIProgressAdapter {
  private readonly logger = new Logger(ComfyUIProgressAdapter.name);
  private readonly webSocketFactory: ComfyUIWebSocketFactory;
  private readonly httpGetImpl: ComfyUIHttpGetFn;
  private readonly httpPostImpl: ComfyUIHttpPostFn;

  constructor(@Optional() deps: ComfyUIProgressAdapterDeps = {}) {
    this.webSocketFactory =
      deps.webSocketFactory ?? ((url: string) => this.createDefaultWebSocket(url));
    this.httpGetImpl = deps.httpGet ?? (httpGet as ComfyUIHttpGetFn);
    this.httpPostImpl = deps.httpPost ?? (httpPost as ComfyUIHttpPostFn);
  }

  async probe(baseUrl: string): Promise<ComfyUIProbeResult> {
    const startedAt = Date.now();
    const normalized = this.normalizeBase(baseUrl);
    this.logger.debug(`probe: GET ${normalized}/system_stats`);
    try {
      await this.httpGetImpl<unknown>(`${normalized}/system_stats`, { timeout: 5_000 });
      const latencyMs = Date.now() - startedAt;
      this.logger.log(`probe: comfyui reachable url=${normalized} latencyMs=${String(latencyMs)}`);
      return { reachable: true, latencyMs };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`probe: comfyui unreachable url=${normalized} error=${message}`);
      return { reachable: false, latencyMs: Date.now() - startedAt, errorMessage: message };
    }
  }

  async cancel(baseUrl: string): Promise<boolean> {
    const normalized = this.normalizeBase(baseUrl);
    this.logger.log(`cancel: POST ${normalized}/interrupt`);
    try {
      await this.httpPostImpl<unknown>(
        `${normalized}/interrupt`,
        {},
        { timeout: COMFYUI_INTERRUPT_TIMEOUT_MS },
      );
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`cancel: comfyui interrupt failed — ${message}`);
      return false;
    }
  }

  async streamGenerate(
    options: ComfyUIStreamGenerateOptions,
  ): Promise<ComfyUIGenerationResult> {
    const { runId, baseUrl, workflow, onEvent, signal } = options;
    const normalized = this.normalizeBase(baseUrl);
    const clientId = workflow.client_id;
    const startedAtMs = Date.now();
    let sequence = 0;
    const nextSeq = (): number => {
      sequence += 1;
      return sequence;
    };

    this.logger.log(
      `streamGenerate: starting — runId=${runId} baseUrl=${normalized} clientId=${clientId}`,
    );
    const descriptors = buildNodeDescriptors(workflow);
    const totalNodes = descriptors.length;
    this.logger.debug(`streamGenerate: workflow has ${String(totalNodes)} nodes`);

    const wsUrl = this.buildWsUrl(normalized, clientId);
    const state: ComfyUIStreamState = this.createStreamState(startedAtMs);

    let ws: ComfyUIWebSocketLike;
    try {
      ws = await this.openWebSocketWithReconnect(wsUrl, runId, onEvent, nextSeq, normalized);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'WebSocket open failed';
      onEvent(
        this.buildErrorEvent({
          runId,
          sequence: nextSeq(),
          baseUrl: wsUrl,
          type: StreamingErrorType.RUNTIME_UNREACHABLE,
          message,
          startedAtMs,
        }),
      );
      throw new Error(`ComfyUI WebSocket open failed: ${message}`);
    }

    this.attachWsHandlers({
      ws,
      runId,
      baseUrl: normalized,
      descriptors,
      totalNodes,
      state,
      nextSeq,
      startedAtMs,
      onEvent,
    });

    let promptId: string;
    try {
      promptId = await this.postPrompt(normalized, workflow);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'POST /prompt failed';
      onEvent(
        this.buildErrorEvent({
          runId,
          sequence: nextSeq(),
          baseUrl: normalized,
          type: StreamingErrorType.WORKFLOW_INVALID,
          message,
          startedAtMs,
        }),
      );
      this.safeCloseWs(ws);
      throw new Error(`ComfyUI POST /prompt failed: ${message}`);
    }
    state.promptId = promptId;
    this.logger.log(`streamGenerate: prompt accepted — promptId=${promptId}`);

    try {
      await this.waitForCompletion(state, signal);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'wait failed';
      const errorType =
        message === 'aborted'
          ? StreamingErrorType.USER_CANCELLED
          : StreamingErrorType.NETWORK_TIMEOUT;
      onEvent(
        this.buildErrorEvent({
          runId,
          sequence: nextSeq(),
          baseUrl: normalized,
          type: errorType,
          message,
          startedAtMs,
        }),
      );
      this.safeCloseWs(ws);
      throw new Error(`ComfyUI generation ${message}`);
    }

    this.safeCloseWs(ws);

    if (state.errorMessage !== undefined) {
      throw new Error(`ComfyUI execution error: ${state.errorMessage}`);
    }

    const historyEntry = await this.fetchHistory(normalized, promptId);
    const firstImage = this.pickFirstImage(historyEntry);
    if (!firstImage) {
      throw new Error('ComfyUI history returned no images');
    }
    const imageBase64 = await this.fetchViewBase64(
      normalized,
      firstImage.filename,
      firstImage.subfolder,
      firstImage.type,
    );

    const artifactId = randomUUID();
    onEvent(
      buildRuntimeProgressEvent({
        runId,
        provider: RuntimeProvider.COMFYUI,
        modality: RuntimeModality.IMAGE,
        eventType: RuntimeProgressEventType.ARTIFACT_SAVED,
        stage: RuntimeProgressStage.SAVING,
        sequence: nextSeq(),
        runtimeUrl: normalized,
        artifactId,
        rawProviderEventType: 'history',
        metrics: this.buildBaseMetrics(startedAtMs, RuntimeProgressConfidence.EXACT),
      }),
    );
    onEvent(
      buildRuntimeProgressEvent({
        runId,
        provider: RuntimeProvider.COMFYUI,
        modality: RuntimeModality.IMAGE,
        eventType: RuntimeProgressEventType.LIFECYCLE,
        stage: RuntimeProgressStage.DONE,
        sequence: nextSeq(),
        runtimeUrl: normalized,
        metrics: this.buildBaseMetrics(startedAtMs, RuntimeProgressConfidence.EXACT),
      }),
    );

    const totalMs = Date.now() - startedAtMs;
    this.logger.log(
      `streamGenerate: completed — promptId=${promptId} nodes=${String(state.nodesExecuted.size)} cached=${String(state.cachedNodes.size)} totalMs=${String(totalMs)}`,
    );
    return {
      promptId,
      imageBase64,
      mimeType: 'image/png',
      filename: firstImage.filename,
      subfolder: firstImage.subfolder ?? '',
      nodeTimings: this.materializeNodeTimings(state, descriptors),
    };
  }

  private createStreamState(startedAtMs: number): ComfyUIStreamState {
    return {
      promptId: undefined,
      done: false,
      errorMessage: undefined,
      nodesExecuted: new Set<string>(),
      cachedNodes: new Set<string>(),
      nodeStartTimes: new Map<string, number>(),
      nodeEndTimes: new Map<string, number>(),
      nodeClassTypes: new Map<string, string>(),
      startedAtMs,
    };
  }

  private buildWsUrl(baseUrl: string, clientId: string): string {
    const wsScheme = baseUrl.startsWith('https://') ? 'wss://' : 'ws://';
    const hostPath = baseUrl.replace(/^https?:\/\//, '');
    return `${wsScheme}${hostPath}/ws?clientId=${encodeURIComponent(clientId)}`;
  }

  private normalizeBase(url: string): string {
    return url.replace(/\/$/, '');
  }

  private safeCloseWs(ws: ComfyUIWebSocketLike | undefined): void {
    if (!ws) {
      return;
    }
    try {
      ws.close();
    } catch {
      // best-effort
    }
  }

  private createDefaultWebSocket(url: string): ComfyUIWebSocketLike {
    const globalWs = (globalThis as { WebSocket?: new (u: string) => ComfyUIWebSocketLike })
      .WebSocket;
    if (typeof globalWs !== 'function') {
      throw new Error(
        'No WebSocket implementation available. Node 22+ ships globalThis.WebSocket — verify runtime version.',
      );
    }
    return new globalWs(url);
  }

  private async openWebSocketWithReconnect(
    wsUrl: string,
    runId: string,
    onEvent: (e: ClawRuntimeProgressEvent) => void,
    nextSeq: () => number,
    runtimeUrl: string,
  ): Promise<ComfyUIWebSocketLike> {
    let lastError: unknown;
    for (let attempt = 0; attempt < COMFYUI_WS_RECONNECT_MAX_ATTEMPTS; attempt += 1) {
      try {
        const ws = this.webSocketFactory(wsUrl);
        await this.awaitWsOpen(ws);
        onEvent(
          buildRuntimeProgressEvent({
            runId,
            provider: RuntimeProvider.COMFYUI,
            modality: RuntimeModality.IMAGE,
            eventType: RuntimeProgressEventType.LIFECYCLE,
            stage: RuntimeProgressStage.CONNECTING,
            sequence: nextSeq(),
            runtimeUrl,
            metrics: this.buildBaseMetrics(Date.now(), RuntimeProgressConfidence.STAGE_ESTIMATED),
          }),
        );
        if (attempt > 0) {
          this.logger.warn(
            `openWebSocketWithReconnect: reconnected after ${String(attempt)} attempt(s)`,
          );
        }
        return ws;
      } catch (error: unknown) {
        lastError = error;
        const message = error instanceof Error ? error.message : 'unknown';
        this.logger.warn(
          `openWebSocketWithReconnect: attempt ${String(attempt + 1)} failed — ${message}`,
        );
        if (attempt < COMFYUI_WS_RECONNECT_MAX_ATTEMPTS - 1) {
          await new Promise((r) => setTimeout(r, COMFYUI_WS_RECONNECT_BACKOFF_MS));
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error('WebSocket open failed');
  }

  private awaitWsOpen(ws: ComfyUIWebSocketLike): Promise<void> {
    return new Promise((resolve, reject) => {
      if (ws.readyState === 1) {
        resolve();
        return;
      }
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket open timeout'));
      }, COMFYUI_WS_OPEN_TIMEOUT_MS);
      const onOpen = (): void => {
        clearTimeout(timeout);
        resolve();
      };
      const onError = (event: { error?: unknown }): void => {
        clearTimeout(timeout);
        const err = event?.error instanceof Error ? event.error : new Error('WebSocket error');
        reject(err);
      };
      ws.addEventListener('open', onOpen, { once: true });
      ws.addEventListener('error', onError, { once: true });
    });
  }

  private attachWsHandlers(args: ComfyUIAttachWsHandlersArgs): void {
    const {
      ws,
      runId,
      baseUrl,
      descriptors,
      totalNodes,
      state,
      nextSeq,
      startedAtMs,
      onEvent,
    } = args;
    ws.addEventListener('message', (event) => {
      try {
        this.handleWsMessage({
          rawData: event?.data,
          runId,
          baseUrl,
          descriptors,
          totalNodes,
          state,
          nextSeq,
          startedAtMs,
          onEvent,
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'handler failed';
        this.logger.error(`attachWsHandlers: message handler error — ${message}`);
      }
    });
    ws.addEventListener('close', () => {
      this.logger.debug('attachWsHandlers: WebSocket closed');
    });
    ws.addEventListener('error', (event) => {
      const err = event?.error instanceof Error ? event.error.message : 'WebSocket error';
      this.logger.warn(`attachWsHandlers: WebSocket error event — ${err}`);
    });
  }

  private handleWsMessage(args: ComfyUIHandleWsMessageArgs): void {
    const {
      rawData,
      runId,
      baseUrl,
      descriptors,
      totalNodes,
      state,
      nextSeq,
      startedAtMs,
      onEvent,
    } = args;
    if (typeof rawData !== 'string') {
      return;
    }
    let parsed: { type?: string; data?: Record<string, unknown> };
    try {
      parsed = JSON.parse(rawData) as { type?: string; data?: Record<string, unknown> };
    } catch {
      this.logger.debug('handleWsMessage: non-JSON text frame, ignoring');
      return;
    }
    const type = parsed.type;
    const data = parsed.data ?? {};
    if (type === COMFYUI_WS_EVENT_STATUS) {
      this.emitStatus(data, { runId, baseUrl, nextSeq, startedAtMs, onEvent });
      return;
    }
    if (type === COMFYUI_WS_EVENT_EXECUTION_START) {
      this.emitExecutionStart({ runId, baseUrl, nextSeq, startedAtMs, onEvent });
      return;
    }
    if (type === COMFYUI_WS_EVENT_EXECUTION_CACHED) {
      this.emitExecutionCached(data, { runId, baseUrl, state, nextSeq, startedAtMs, onEvent });
      return;
    }
    if (type === COMFYUI_WS_EVENT_EXECUTING) {
      this.emitExecuting(data, {
        runId,
        baseUrl,
        descriptors,
        totalNodes,
        state,
        nextSeq,
        startedAtMs,
        onEvent,
      });
      return;
    }
    if (type === COMFYUI_WS_EVENT_PROGRESS) {
      this.emitProgress(data, {
        runId,
        baseUrl,
        descriptors,
        state,
        nextSeq,
        startedAtMs,
        onEvent,
      });
      return;
    }
    if (type === COMFYUI_WS_EVENT_EXECUTED) {
      this.emitExecuted(data, {
        runId,
        baseUrl,
        descriptors,
        state,
        nextSeq,
        startedAtMs,
        onEvent,
      });
      return;
    }
    if (type === COMFYUI_WS_EVENT_EXECUTION_ERROR) {
      this.emitExecutionError(data, { runId, baseUrl, state, nextSeq, startedAtMs, onEvent });
    }
  }

  private emitStatus(data: Record<string, unknown>, ctx: ComfyUIEmitCtx): void {
    const status =
      (data['status'] as { exec_info?: { queue_remaining?: number } } | undefined) ?? {};
    const queueRemaining = status.exec_info?.queue_remaining ?? 0;
    ctx.onEvent(
      buildRuntimeProgressEvent({
        runId: ctx.runId,
        provider: RuntimeProvider.COMFYUI,
        modality: RuntimeModality.IMAGE,
        eventType: RuntimeProgressEventType.METRICS,
        stage: queueRemaining > 0 ? RuntimeProgressStage.QUEUED : RuntimeProgressStage.IDLE,
        sequence: ctx.nextSeq(),
        runtimeUrl: ctx.baseUrl,
        rawProviderEventType: COMFYUI_WS_EVENT_STATUS,
        metrics: {
          ...this.buildBaseMetrics(ctx.startedAtMs, RuntimeProgressConfidence.RUNTIME_REPORTED),
          queuePosition: queueRemaining,
        },
      }),
    );
  }

  private emitExecutionStart(ctx: ComfyUIEmitCtx): void {
    ctx.onEvent(
      buildRuntimeProgressEvent({
        runId: ctx.runId,
        provider: RuntimeProvider.COMFYUI,
        modality: RuntimeModality.IMAGE,
        eventType: RuntimeProgressEventType.LIFECYCLE,
        stage: RuntimeProgressStage.MODEL_LOADING,
        sequence: ctx.nextSeq(),
        runtimeUrl: ctx.baseUrl,
        rawProviderEventType: COMFYUI_WS_EVENT_EXECUTION_START,
        metrics: this.buildBaseMetrics(ctx.startedAtMs, RuntimeProgressConfidence.RUNTIME_REPORTED),
      }),
    );
  }

  private emitExecutionCached(
    data: Record<string, unknown>,
    ctx: ComfyUIEmitCtxWithState,
  ): void {
    const nodes = Array.isArray(data['nodes']) ? (data['nodes'] as Array<string | number>) : [];
    for (const n of nodes) {
      ctx.state.cachedNodes.add(String(n));
    }
    ctx.onEvent(
      buildRuntimeProgressEvent({
        runId: ctx.runId,
        provider: RuntimeProvider.COMFYUI,
        modality: RuntimeModality.IMAGE,
        eventType: RuntimeProgressEventType.LIFECYCLE,
        stage: RuntimeProgressStage.MODEL_WARMING_UP,
        sequence: ctx.nextSeq(),
        runtimeUrl: ctx.baseUrl,
        rawProviderEventType: COMFYUI_WS_EVENT_EXECUTION_CACHED,
        metrics: this.buildBaseMetrics(ctx.startedAtMs, RuntimeProgressConfidence.RUNTIME_REPORTED),
      }),
    );
  }

  private emitExecuting(data: Record<string, unknown>, ctx: ComfyUIEmitExecutingCtx): void {
    const nodeRaw = data['node'];
    if (nodeRaw === null || nodeRaw === undefined) {
      ctx.state.done = true;
      ctx.onEvent(
        buildRuntimeProgressEvent({
          runId: ctx.runId,
          provider: RuntimeProvider.COMFYUI,
          modality: RuntimeModality.IMAGE,
          eventType: RuntimeProgressEventType.LIFECYCLE,
          stage: RuntimeProgressStage.FINALIZING,
          sequence: ctx.nextSeq(),
          runtimeUrl: ctx.baseUrl,
          rawProviderEventType: 'executing.null',
          metrics: this.buildBaseMetrics(
            ctx.startedAtMs,
            RuntimeProgressConfidence.RUNTIME_REPORTED,
          ),
        }),
      );
      return;
    }
    const nodeId = String(nodeRaw);
    ctx.state.nodesExecuted.add(nodeId);
    ctx.state.nodeStartTimes.set(nodeId, Date.now());
    const descriptor = findDescriptor(ctx.descriptors, nodeId);
    if (descriptor) {
      ctx.state.nodeClassTypes.set(nodeId, descriptor.classType);
    }
    ctx.onEvent(
      buildRuntimeProgressEvent({
        runId: ctx.runId,
        provider: RuntimeProvider.COMFYUI,
        modality: RuntimeModality.IMAGE,
        eventType: RuntimeProgressEventType.NODE_PROGRESS,
        stage: RuntimeProgressStage.EXECUTING_NODE,
        sequence: ctx.nextSeq(),
        runtimeUrl: ctx.baseUrl,
        nodeId,
        nodeName: descriptor?.humanLabel ?? nodeId,
        rawProviderEventType: COMFYUI_WS_EVENT_EXECUTING,
        metrics: {
          ...this.buildBaseMetrics(ctx.startedAtMs, RuntimeProgressConfidence.RUNTIME_REPORTED),
          currentStep:
            descriptor !== undefined && ctx.totalNodes > 0 ? descriptor.nodeIndex + 1 : undefined,
          totalSteps: ctx.totalNodes > 0 ? ctx.totalNodes : undefined,
        },
      }),
    );
  }

  private emitProgress(data: Record<string, unknown>, ctx: ComfyUIEmitProgressCtx): void {
    const value = typeof data['value'] === 'number' ? (data['value'] as number) : undefined;
    const max = typeof data['max'] === 'number' ? (data['max'] as number) : undefined;
    const nodeRaw = data['node'];
    const nodeId = nodeRaw !== undefined && nodeRaw !== null ? String(nodeRaw) : undefined;
    const descriptor = nodeId !== undefined ? findDescriptor(ctx.descriptors, nodeId) : undefined;
    ctx.onEvent(
      buildRuntimeProgressEvent({
        runId: ctx.runId,
        provider: RuntimeProvider.COMFYUI,
        modality: RuntimeModality.IMAGE,
        eventType: RuntimeProgressEventType.NODE_PROGRESS,
        stage: RuntimeProgressStage.EXECUTING_NODE,
        sequence: ctx.nextSeq(),
        runtimeUrl: ctx.baseUrl,
        nodeId,
        nodeName: descriptor?.humanLabel,
        rawProviderEventType: COMFYUI_WS_EVENT_PROGRESS,
        metrics: {
          ...this.buildBaseMetrics(ctx.startedAtMs, RuntimeProgressConfidence.RUNTIME_REPORTED),
          currentStep: value,
          totalSteps: max,
          progressPercent:
            value !== undefined && max !== undefined && max > 0 ? (value / max) * 100 : undefined,
        },
      }),
    );
  }

  private emitExecuted(data: Record<string, unknown>, ctx: ComfyUIEmitProgressCtx): void {
    const nodeRaw = data['node'];
    if (nodeRaw === undefined || nodeRaw === null) {
      return;
    }
    const nodeId = String(nodeRaw);
    const startTime = ctx.state.nodeStartTimes.get(nodeId);
    if (startTime !== undefined) {
      ctx.state.nodeEndTimes.set(nodeId, Date.now());
    }
    const descriptor = findDescriptor(ctx.descriptors, nodeId);
    ctx.onEvent(
      buildRuntimeProgressEvent({
        runId: ctx.runId,
        provider: RuntimeProvider.COMFYUI,
        modality: RuntimeModality.IMAGE,
        eventType: RuntimeProgressEventType.NODE_PROGRESS,
        stage: RuntimeProgressStage.NODE_COMPLETED,
        sequence: ctx.nextSeq(),
        runtimeUrl: ctx.baseUrl,
        nodeId,
        nodeName: descriptor?.humanLabel ?? nodeId,
        rawProviderEventType: COMFYUI_WS_EVENT_EXECUTED,
        metrics: this.buildBaseMetrics(ctx.startedAtMs, RuntimeProgressConfidence.RUNTIME_REPORTED),
      }),
    );
  }

  private emitExecutionError(
    data: Record<string, unknown>,
    ctx: ComfyUIEmitCtxWithState,
  ): void {
    const message =
      (data['exception_message'] as string | undefined) ??
      (data['error'] as string | undefined) ??
      'execution_error';
    ctx.state.errorMessage = String(message).slice(0, 500);
    ctx.state.done = true;
    ctx.onEvent(
      buildRuntimeProgressEvent({
        runId: ctx.runId,
        provider: RuntimeProvider.COMFYUI,
        modality: RuntimeModality.IMAGE,
        eventType: RuntimeProgressEventType.ERROR,
        stage: RuntimeProgressStage.ERROR,
        sequence: ctx.nextSeq(),
        runtimeUrl: ctx.baseUrl,
        rawProviderEventType: COMFYUI_WS_EVENT_EXECUTION_ERROR,
        errorType: StreamingErrorType.DECODER_ERROR,
        errorMessage: ctx.state.errorMessage,
      }),
    );
  }

  private async postPrompt(baseUrl: string, workflow: ComfyUIWorkflowPayload): Promise<string> {
    const response = await this.httpPostImpl<ComfyUIPromptResponse>(
      `${baseUrl}/prompt`,
      workflow,
      { timeout: COMFYUI_PROMPT_POST_TIMEOUT_MS },
    );
    if (response?.node_errors && Object.keys(response.node_errors).length > 0) {
      throw new Error(
        `Workflow validation failed: ${JSON.stringify(response.node_errors).slice(0, 300)}`,
      );
    }
    const promptId = response?.prompt_id;
    if (typeof promptId !== 'string' || promptId.length === 0) {
      throw new Error('POST /prompt did not return prompt_id');
    }
    return promptId;
  }

  private async waitForCompletion(
    state: ComfyUIStreamState,
    signal?: AbortSignal,
  ): Promise<void> {
    const deadline = Date.now() + COMFYUI_MAX_EXECUTION_MS;
    while (!state.done && Date.now() < deadline) {
      if (signal?.aborted) {
        throw new Error('aborted');
      }
      await new Promise((r) => setTimeout(r, COMFYUI_COMPLETION_POLL_MS));
    }
    if (!state.done) {
      throw new Error('timeout');
    }
  }

  private async fetchHistory(baseUrl: string, promptId: string): Promise<ComfyUIHistoryEntry> {
    const url = `${baseUrl}/history/${encodeURIComponent(promptId)}`;
    const raw = await this.httpGetImpl<Record<string, ComfyUIHistoryEntry>>(url, {
      timeout: COMFYUI_HISTORY_GET_TIMEOUT_MS,
    });
    const entry = raw?.[promptId];
    if (!entry) {
      throw new Error(`GET /history/${promptId} returned no entry`);
    }
    return entry;
  }

  private pickFirstImage(entry: ComfyUIHistoryEntry): ComfyUIHistoryImage | null {
    const outputs = entry.outputs ?? {};
    for (const key of Object.keys(outputs)) {
      const out = outputs[key];
      const first = out?.images?.[0];
      if (first?.filename) {
        return first;
      }
    }
    return null;
  }

  private async fetchViewBase64(
    baseUrl: string,
    filename: string,
    subfolder: string | undefined,
    type: string | undefined,
  ): Promise<string> {
    const params = new URLSearchParams();
    params.set('filename', filename);
    if (subfolder !== undefined && subfolder.length > 0) {
      params.set('subfolder', subfolder);
    }
    if (type !== undefined && type.length > 0) {
      params.set('type', type);
    }
    const url = `${baseUrl}/view?${params.toString()}`;
    const buf = await this.httpGetImpl<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      timeout: COMFYUI_VIEW_GET_TIMEOUT_MS,
    });
    return Buffer.from(buf).toString('base64');
  }

  private buildBaseMetrics(
    startedAtMs: number,
    confidence: RuntimeProgressConfidence,
  ): ComfyUIBaseMetrics {
    return {
      startedAtMs,
      elapsedMs: Date.now() - startedAtMs,
      progressConfidence: confidence,
    };
  }

  private buildErrorEvent(args: ComfyUIErrorEventArgs): ClawRuntimeProgressEvent {
    return buildRuntimeProgressEvent({
      runId: args.runId,
      provider: RuntimeProvider.COMFYUI,
      modality: RuntimeModality.IMAGE,
      eventType: RuntimeProgressEventType.ERROR,
      stage: RuntimeProgressStage.ERROR,
      sequence: args.sequence,
      runtimeUrl: args.baseUrl,
      errorType: args.type,
      errorMessage: args.message.slice(0, 500),
      metrics: this.buildBaseMetrics(args.startedAtMs, RuntimeProgressConfidence.STAGE_ESTIMATED),
    });
  }

  private materializeNodeTimings(
    state: ComfyUIStreamState,
    descriptors: ReadonlyArray<ComfyUINodeDescriptor>,
  ): ComfyUINodeTiming[] {
    const out: ComfyUINodeTiming[] = [];
    for (const d of descriptors) {
      const start = state.nodeStartTimes.get(d.nodeId);
      const end = state.nodeEndTimes.get(d.nodeId);
      const cached = state.cachedNodes.has(d.nodeId);
      if (start === undefined && !cached) {
        continue;
      }
      const timing: ComfyUINodeTiming = {
        nodeId: d.nodeId,
        classType: d.classType,
        humanLabel: d.humanLabel,
        startMs: start ?? state.startedAtMs,
        cached,
      };
      if (end !== undefined && start !== undefined) {
        timing.endMs = end;
        timing.durationMs = end - start;
      }
      out.push(timing);
    }
    return out;
  }
}
