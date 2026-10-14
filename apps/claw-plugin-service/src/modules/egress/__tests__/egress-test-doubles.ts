import { HostResolver } from '../resolvers/host-resolver';
import { EgressTransport } from '../transports/egress.transport';
import { SafeEgressManager } from '../managers/safe-egress.manager';
import { type EgressSendInput, type EgressSendResult } from '../types/egress.types';

/** Answers from a function of (host, how many times this host was asked), so a test can script rebinding. */
export class ScriptedResolver extends HostResolver {
  readonly asked: string[] = [];

  constructor(private readonly answer: (host: string, nth: number) => string[]) {
    super();
  }

  resolveAll(host: string): Promise<string[]> {
    const nth = this.asked.filter((entry) => entry === host).length;
    this.asked.push(host);
    return Promise.resolve(this.answer(host, nth));
  }
}

/** Records every request that reached the wire and replies from a queue (the last reply repeats). */
export class RecordingTransport extends EgressTransport {
  readonly sent: EgressSendInput[] = [];

  constructor(private readonly replies: EgressSendResult[] = [okReply('{}')]) {
    super();
  }

  send(input: EgressSendInput): Promise<EgressSendResult> {
    this.sent.push(input);
    const reply = this.replies[Math.min(this.sent.length - 1, this.replies.length - 1)];
    return Promise.resolve(reply ?? okReply(''));
  }
}

export function okReply(body: string, headers: Record<string, string> = {}): EgressSendResult {
  return {
    status: 200,
    headers: { 'content-type': 'application/json', ...headers },
    body,
    truncated: false,
  };
}

export function redirectReply(location: string, status = 302): EgressSendResult {
  return { status, headers: { location }, body: '', truncated: false };
}

export const PUBLIC_ADDRESS = '93.184.216.34';

/** Every name resolves to one public address. */
export function publicResolver(): ScriptedResolver {
  return new ScriptedResolver(() => [PUBLIC_ADDRESS]);
}

export function buildEgress(
  resolver: HostResolver = publicResolver(),
  transport: RecordingTransport = new RecordingTransport(),
): { egress: SafeEgressManager; resolver: HostResolver; transport: RecordingTransport } {
  return { egress: new SafeEgressManager(resolver, transport), resolver, transport };
}
