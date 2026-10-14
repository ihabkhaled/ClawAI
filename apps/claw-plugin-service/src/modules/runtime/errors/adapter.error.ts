import { type AdapterFailureKind } from '../../../common/enums/adapter-failure-kind.enum';

/**
 * A built-in adapter refused or failed. `message` is written by us and is shown to the model as
 * the tool's answer, so it must never carry an address, a header or anything from the network.
 */
export class AdapterError extends Error {
  constructor(
    readonly kind: AdapterFailureKind,
    message: string,
  ) {
    super(message);
    this.name = 'AdapterError';
  }
}
