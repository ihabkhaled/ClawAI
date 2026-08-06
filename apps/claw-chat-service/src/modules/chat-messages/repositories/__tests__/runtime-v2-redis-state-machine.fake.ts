import { RuntimeV2RedisOperation } from '../../../../infrastructure/redis/enums/runtime-v2-redis-operation.enum';
import type {
  RuntimeV2RedisCommand,
  RuntimeV2RedisPort,
} from '../../../../infrastructure/redis/types/redis-client.types';

interface ReplayRecord {
  readonly fingerprint: string;
  readonly acknowledgement: string;
}

interface FakeRuntimeState {
  binding: Readonly<Record<string, unknown>>;
  providerPinned: boolean;
  readonly keys: Set<string>;
  readonly events: Record<string, unknown>[];
  readonly replays: Map<string, ReplayRecord>;
  readonly invocations: Set<string>;
  readonly results: Map<string, ReplayRecord>;
  readonly steering: Map<string, ReplayRecord>;
  lifecycle: string;
  sequence: number;
  nextSteeringSequence: number;
  expiresAt: number;
  claimId: string | undefined;
  claimFingerprint: string | undefined;
  terminalFingerprint: string | undefined;
  providerDispatched: boolean;
  toolCalls: number;
  toolResultBytes: number;
}

export interface FakeRuntimeV2RedisSnapshot {
  readonly keyCount: number;
  readonly sequence: number;
  readonly eventCount: number;
  readonly expiresAt: number;
  readonly lifecycle: string;
  readonly toolCalls: number;
  readonly toolResultBytes: number;
}

export class RuntimeV2RedisStateMachine implements RuntimeV2RedisPort {
  private readonly requests = new Map<string, ReplayRecord>();
  private readonly clientRequests = new Map<string, ReplayRecord>();
  private readonly states = new Map<string, FakeRuntimeState>();
  private readonly messages = new Map<string, string>();
  private now = 1_000;
  private unavailable = false;

  setUnavailable(value: boolean): void {
    this.unavailable = value;
  }

  advance(milliseconds: number): void {
    this.now += milliseconds;
  }

  loseAllState(): void {
    this.requests.clear();
    this.clientRequests.clear();
    this.states.clear();
    this.messages.clear();
  }

  snapshot(stateKey: string): FakeRuntimeV2RedisSnapshot | undefined {
    const state = this.states.get(stateKey);
    if (state === undefined) return undefined;
    return {
      keyCount: state.keys.size,
      sequence: state.sequence,
      eventCount: state.events.length,
      expiresAt: state.expiresAt,
      lifecycle: state.lifecycle,
      toolCalls: state.toolCalls,
      toolResultBytes: state.toolResultBytes,
    };
  }

  async executeRuntimeV2(command: RuntimeV2RedisCommand): Promise<unknown> {
    if (this.unavailable) throw new Error('redis unavailable');
    if (command.operation === RuntimeV2RedisOperation.START) return this.start(command);
    if (command.operation === RuntimeV2RedisOperation.READ_BINDING)
      return this.readBinding(command);
    if (command.operation === RuntimeV2RedisOperation.READ_MESSAGE_BINDING)
      return this.readMessageBinding(command);
    const state = this.boundState(command);
    if (Array.isArray(state)) return state;
    switch (command.operation) {
      case RuntimeV2RedisOperation.ADMIT_INVOCATION:
        return this.invocation(command, state);
      case RuntimeV2RedisOperation.RESULT:
        return this.result(command, state);
      case RuntimeV2RedisOperation.STEERING:
        return this.steering(command, state);
      case RuntimeV2RedisOperation.CANCEL:
        return this.cancel(command, state);
      case RuntimeV2RedisOperation.CLAIM_ROUTED:
        return this.claim(command, state);
      case RuntimeV2RedisOperation.TERMINAL:
        return this.terminal(command, state);
      case RuntimeV2RedisOperation.MARK_DISPATCHED:
        return this.dispatch(command, state);
      case RuntimeV2RedisOperation.READ_EVENTS:
        return this.read(command, state);
      default:
        return ['DENIED', 'UNKNOWN_OPERATION'];
    }
  }

  private start(command: RuntimeV2RedisCommand): readonly string[] {
    const [requestKey, stateKey, eventsKey, messageKey] = command.keys;
    const clientRequestKey = command.keys[9];
    const fingerprint = command.arguments[0] ?? '';
    if (
      requestKey === undefined ||
      stateKey === undefined ||
      eventsKey === undefined ||
      messageKey === undefined ||
      clientRequestKey === undefined
    )
      return ['DENIED', 'BAD_KEYS'];
    const replay = this.requests.get(requestKey);
    const clientReplay = this.clientRequests.get(clientRequestKey);
    if (replay !== undefined) {
      if (replay.fingerprint !== fingerprint) return ['CONFLICT', 'START_REPLAY_CONFLICT'];
      const stored = this.object(replay.acknowledgement);
      const proposed = this.object(command.arguments[1]);
      if (
        this.text(stored.runId) !== this.text(proposed.runId) ||
        this.text(stored.generation) !== this.text(proposed.generation)
      )
        return ['REDIRECT', replay.acknowledgement];
      if (clientReplay === undefined) return ['MISSING', 'STALE_RUN'];
      if (
        clientReplay.fingerprint !== fingerprint ||
        clientReplay.acknowledgement !== replay.acknowledgement
      )
        return ['CONFLICT', 'START_REPLAY_CONFLICT'];
      return ['REPLAY', replay.acknowledgement];
    }
    if (clientReplay !== undefined)
      return clientReplay.fingerprint === fingerprint
        ? ['MISSING', 'STALE_RUN']
        : ['CONFLICT', 'START_REPLAY_CONFLICT'];
    if (this.states.has(stateKey) || this.messages.has(messageKey))
      return ['CONFLICT', 'IDENTITY_COLLISION'];
    const proposed = this.object(command.arguments[1]);
    const snapshot = this.object(command.arguments[2]);
    const acknowledgement = command.arguments[5] ?? '';
    const event = this.object(command.arguments[3]);
    const ttl = this.integer(command.arguments[6]);
    const binding = {
      ownerId: this.text(snapshot.ownerId),
      threadId: this.text(snapshot.threadId),
      messageId: this.text(snapshot.messageId),
      clientRequestId: this.text(snapshot.clientRequestId),
      startIdempotencyKey: this.text(snapshot.idempotencyKey),
      generation: this.text(proposed.generation),
      epochs: this.text(snapshot.epochs),
      runId: this.text(proposed.runId),
      manifestHash: this.text(snapshot.manifestHash),
      toolCatalogHash: this.text(snapshot.toolCatalogHash),
      toolDefinitions: snapshot.toolDefinitions,
      provider: this.text(snapshot.provider),
      model: this.text(snapshot.model),
    };
    const state: FakeRuntimeState = {
      binding,
      providerPinned: this.text(snapshot.providerPinned) !== '0',
      keys: new Set(command.keys),
      events: [{ ...event, sequence: 0 }],
      replays: new Map(),
      invocations: new Set(),
      results: new Map(),
      steering: new Map(),
      lifecycle: 'active',
      sequence: 0,
      nextSteeringSequence: 0,
      expiresAt: this.now + ttl,
      claimId: undefined,
      claimFingerprint: undefined,
      terminalFingerprint: undefined,
      providerDispatched: false,
      toolCalls: 0,
      toolResultBytes: 0,
    };
    this.states.set(stateKey, state);
    this.messages.set(messageKey, command.arguments[4] ?? '');
    const record = { fingerprint, acknowledgement };
    this.requests.set(requestKey, record);
    this.clientRequests.set(clientRequestKey, record);
    return ['OK', acknowledgement];
  }

  private readBinding(command: RuntimeV2RedisCommand): readonly string[] {
    const stateKey = command.keys[0];
    if (stateKey === undefined) return ['MISSING', 'STALE_RUN'];
    const state = this.states.get(stateKey);
    if (state === undefined || state.expiresAt <= this.now) return ['MISSING', 'STALE_RUN'];
    const [ownerId, threadId, runId, generation] = command.arguments;
    if (
      state.binding.ownerId !== ownerId ||
      state.binding.threadId !== threadId ||
      state.binding.runId !== runId ||
      state.binding.generation !== generation
    )
      return ['MISSING', 'STALE_RUN'];
    return [
      'OK',
      JSON.stringify({
        ...state.binding,
        epochs: this.object(state.binding.epochs),
        ...(state.claimId === undefined ? {} : { claimId: state.claimId }),
      }),
    ];
  }

  private readMessageBinding(command: RuntimeV2RedisCommand): readonly string[] {
    const messageKey = command.keys[0];
    if (messageKey === undefined) return ['MISSING', 'STALE_RUN'];
    const mapped = this.object(this.messages.get(messageKey));
    // Mirrors the Lua: a routed message is matched to its run by message and
    // thread only. The routed model may legitimately differ from the sentinel
    // the client sent when it asked the platform to route.
    const [messageId, threadId] = command.arguments;
    if (mapped.messageId !== messageId || mapped.threadId !== threadId)
      return ['MISSING', 'STALE_RUN'];
    return ['OK', JSON.stringify(mapped)];
  }

  private boundState(command: RuntimeV2RedisCommand): FakeRuntimeState | string[] {
    const stateKey = command.keys[0];
    if (stateKey === undefined) return ['MISSING', 'STALE_RUN'];
    const state = this.states.get(stateKey);
    if (state === undefined || state.expiresAt <= this.now) return ['MISSING', 'STALE_RUN'];
    const expected = this.object(command.arguments[0]);
    if (!this.mappingIdentityMatches(state.binding, expected)) return ['MISSING', 'STALE_RUN'];
    // The claim is the one operation allowed to write the pair, and only for a
    // run whose model the platform was asked to choose. Reads are authorised by
    // identity alone, because the SSE reader binds once and then polls across
    // the moment the claim pins the routed model.
    const modelIrrelevant =
      command.operation === RuntimeV2RedisOperation.READ_EVENTS ||
      (!state.providerPinned && command.operation === RuntimeV2RedisOperation.CLAIM_ROUTED);
    if (!modelIrrelevant && !this.mappingMatches(state.binding, expected))
      return ['MISSING', 'STALE_RUN'];
    return state;
  }

  private replay(
    state: FakeRuntimeState,
    key: string,
    fingerprint: string,
  ): readonly string[] | undefined {
    const prior = state.replays.get(key);
    if (prior === undefined) return undefined;
    return prior.fingerprint === fingerprint
      ? ['REPLAY', prior.acknowledgement]
      : ['CONFLICT', 'REPLAY_CONFLICT'];
  }

  private append(
    command: RuntimeV2RedisCommand,
    state: FakeRuntimeState,
    acknowledgementJson: unknown,
    eventJson: unknown,
  ): string {
    state.sequence += 1;
    const acknowledgement = this.object(acknowledgementJson);
    acknowledgement.sequence = state.sequence;
    const event = this.object(eventJson);
    event.sequence = state.sequence;
    state.events.push(event);
    if (state.events.length > 1_000) state.events.splice(0, state.events.length - 1_000);
    state.expiresAt = this.now + this.integer(command.arguments.at(-1));
    return JSON.stringify(acknowledgement);
  }

  private invocation(command: RuntimeV2RedisCommand, state: FakeRuntimeState): readonly string[] {
    const key = command.arguments[1] ?? '';
    const fingerprint = command.arguments[2] ?? '';
    const prior = this.replay(state, key, fingerprint);
    if (prior !== undefined) return prior;
    if (state.lifecycle !== 'active') return ['DENIED', 'RUN_TERMINAL'];
    const invocationId = command.arguments[3] ?? '';
    if (state.invocations.has(invocationId)) return ['CONFLICT', 'INVOCATION_CONFLICT'];
    state.invocations.add(invocationId);
    state.toolCalls += 1;
    this.append(command, state, command.arguments[5], command.arguments[6]);
    const acknowledgement = this.append(command, state, command.arguments[5], command.arguments[7]);
    state.replays.set(key, { fingerprint, acknowledgement });
    return ['OK', acknowledgement];
  }

  private result(command: RuntimeV2RedisCommand, state: FakeRuntimeState): readonly string[] {
    const key = command.arguments[1] ?? '';
    const fingerprint = command.arguments[2] ?? '';
    const prior = this.replay(state, key, fingerprint);
    if (prior !== undefined) return prior;
    if (state.lifecycle !== 'active') return ['DENIED', 'RUN_TERMINAL'];
    const invocationId = command.arguments[3] ?? '';
    if (!state.invocations.has(invocationId)) return ['MISSING', 'UNKNOWN_INVOCATION'];
    const priorResult = state.results.get(invocationId);
    if (priorResult !== undefined)
      return priorResult.fingerprint === fingerprint
        ? ['REPLAY', priorResult.acknowledgement]
        : ['CONFLICT', 'RESULT_CONFLICT'];
    const verification = this.object(command.arguments[4]);
    state.toolResultBytes += this.integer(verification.outputBytes);
    const acknowledgement = this.append(command, state, command.arguments[5], command.arguments[6]);
    const record = { fingerprint, acknowledgement };
    state.results.set(invocationId, record);
    state.replays.set(key, record);
    return ['OK', acknowledgement];
  }

  private steering(command: RuntimeV2RedisCommand, state: FakeRuntimeState): readonly string[] {
    const key = command.arguments[1] ?? '';
    const fingerprint = command.arguments[2] ?? '';
    const prior = this.replay(state, key, fingerprint);
    if (prior !== undefined) return prior;
    if (state.lifecycle !== 'active') return ['DENIED', 'RUN_TERMINAL'];
    const steering = this.object(command.arguments[4]);
    if (this.integer(steering.sequence) !== state.nextSteeringSequence)
      return ['CONFLICT', 'STEERING_GAP'];
    const steeringId = this.text(steering.steeringId);
    if (state.steering.has(steeringId)) return ['CONFLICT', 'STEERING_CONFLICT'];
    state.nextSteeringSequence += 1;
    const acknowledgement = this.append(command, state, command.arguments[5], command.arguments[6]);
    const record = { fingerprint, acknowledgement };
    state.steering.set(steeringId, record);
    state.replays.set(key, record);
    return ['OK', acknowledgement];
  }

  private cancel(command: RuntimeV2RedisCommand, state: FakeRuntimeState): readonly string[] {
    const key = command.arguments[1] ?? '';
    const fingerprint = command.arguments[2] ?? '';
    const prior = this.replay(state, key, fingerprint);
    if (prior !== undefined) return prior;
    if (state.lifecycle !== 'active') return ['DENIED', 'RUN_TERMINAL'];
    state.lifecycle = 'cancelled';
    const acknowledgement = this.append(command, state, command.arguments[4], command.arguments[5]);
    state.replays.set(key, { fingerprint, acknowledgement });
    return ['OK', acknowledgement];
  }

  private claim(command: RuntimeV2RedisCommand, state: FakeRuntimeState): readonly string[] {
    if (state.lifecycle !== 'active') return ['DENIED', 'RUN_TERMINAL'];
    const key = command.arguments[1] ?? '';
    const fingerprint = command.arguments[2] ?? '';
    const prior = this.replay(state, key, fingerprint);
    if (prior !== undefined) return prior;
    const storedMapping = this.object(this.messages.get(command.keys[7] ?? ''));
    const expectedMapping = this.object(command.arguments[3]);
    if (!this.mappingIdentityMatches(storedMapping, expectedMapping))
      return ['MISSING', 'STALE_RUN'];
    if (state.claimId !== undefined) return ['DENIED', 'ALREADY_CLAIMED'];
    const acknowledgement = this.append(command, state, command.arguments[4], command.arguments[5]);
    // The routed decision becomes the run's own pair, and is pinned from here.
    state.binding = {
      ...state.binding,
      provider: this.text(expectedMapping.provider),
      model: this.text(expectedMapping.model),
    };
    state.providerPinned = true;
    state.claimId = this.text(this.object(acknowledgement).claimId);
    state.claimFingerprint = fingerprint;
    state.replays.set(key, { fingerprint, acknowledgement });
    return ['CLAIMED', acknowledgement];
  }

  private terminal(command: RuntimeV2RedisCommand, state: FakeRuntimeState): readonly string[] {
    const key = command.arguments[1] ?? '';
    const fingerprint = command.arguments[2] ?? '';
    const prior = this.replay(state, key, fingerprint);
    if (prior !== undefined) return prior;
    if (state.lifecycle !== 'active') return ['DENIED', 'RUN_TERMINAL'];
    if (state.claimId !== command.arguments[3]) return ['MISSING', 'STALE_CLAIM'];
    const terminal = this.object(command.arguments[4]);
    state.lifecycle = this.text(terminal.status);
    const acknowledgement = this.append(command, state, command.arguments[5], command.arguments[6]);
    state.terminalFingerprint = fingerprint;
    state.replays.set(key, { fingerprint, acknowledgement });
    return ['OK', acknowledgement];
  }

  private dispatch(command: RuntimeV2RedisCommand, state: FakeRuntimeState): readonly string[] {
    const key = command.arguments[1] ?? '';
    const fingerprint = command.arguments[2] ?? '';
    const prior = this.replay(state, key, fingerprint);
    if (prior !== undefined) return prior;
    if (state.lifecycle !== 'active') return ['DENIED', 'RUN_TERMINAL'];
    if (state.claimId !== command.arguments[3]) return ['MISSING', 'STALE_CLAIM'];
    if (state.providerDispatched) return ['DENIED', 'PROVIDER_DISPATCH_AMBIGUOUS'];
    state.providerDispatched = true;
    const acknowledgement = this.append(command, state, command.arguments[4], command.arguments[5]);
    state.replays.set(key, { fingerprint, acknowledgement });
    return ['OK', acknowledgement];
  }

  private read(command: RuntimeV2RedisCommand, state: FakeRuntimeState): readonly string[] {
    const after = this.integer(command.arguments[1]);
    return [
      'OK',
      JSON.stringify({
        runId: state.binding.runId,
        terminal: state.lifecycle !== 'active',
        events: state.events.filter((event) => this.integer(event.sequence) > after),
      }),
    ];
  }

  private mappingIdentityMatches(
    stored: Readonly<Record<string, unknown>>,
    expected: Readonly<Record<string, unknown>>,
  ): boolean {
    return (
      this.text(stored.ownerId) === this.text(expected.ownerId) &&
      this.text(stored.threadId) === this.text(expected.threadId) &&
      this.text(stored.messageId) === this.text(expected.messageId) &&
      this.text(stored.clientRequestId) === this.text(expected.clientRequestId) &&
      this.text(stored.generation) === this.text(expected.generation) &&
      this.text(stored.epochs) === this.text(expected.epochs) &&
      this.text(stored.runId) === this.text(expected.runId) &&
      this.text(stored.manifestHash) === this.text(expected.manifestHash) &&
      this.text(stored.toolCatalogHash) === this.text(expected.toolCatalogHash)
      // Deliberately does NOT compare toolDefinitions, mirroring the real
      // `loadBinding` guard: the catalog's identity is carried by
      // toolCatalogHash, and the state hash stores the catalog as an opaque
      // string while the caller supplies it as an array. Comparing the two
      // shapes made this fake stricter than the Lua it stands in for.
    );
  }

  private mappingMatches(
    stored: Readonly<Record<string, unknown>>,
    expected: Readonly<Record<string, unknown>>,
  ): boolean {
    return (
      this.mappingIdentityMatches(stored, expected) &&
      this.text(stored.provider) === this.text(expected.provider) &&
      this.text(stored.model) === this.text(expected.model)
    );
  }

  private object(value: unknown): Record<string, unknown> {
    if (typeof value === 'string') {
      const parsed: unknown = JSON.parse(value);
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed))
        return { ...parsed };
    }
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) return { ...value };
    return {};
  }

  private text(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private integer(value: unknown): number {
    if (typeof value === 'number' && Number.isInteger(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isInteger(parsed)) return parsed;
    }
    return 0;
  }
}
