import { BusinessException } from './business.exception';

/**
 * A provider refused a sampling parameter for this model ("`temperature` is
 * deprecated for this model", "Unsupported value: 'temperature' ..."). The
 * chokepoint resends once without it and remembers the model, so the user
 * never sees this unless the retry also fails. `parameter` is our canonical
 * name (`temperature`, `top_p`, ...); `message` is the same safe sentence any
 * other provider failure would carry.
 */
export class ProviderUnsupportedParameterException extends BusinessException {
  constructor(
    public readonly parameter: string,
    message: string,
    code: string,
  ) {
    super(message, code);
  }
}
