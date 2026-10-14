import { type EgressSendInput, type EgressSendResult } from '../types/egress.types';

/** Sends one request to an already-validated, already-pinned address. Tests supply a fake. */
export abstract class EgressTransport {
  abstract send(input: EgressSendInput): Promise<EgressSendResult>;
}
