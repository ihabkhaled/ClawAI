/**
 * Where the channel service reads its master key and public origin. Abstract
 * so the service never reads configuration directly and tests stay hermetic.
 */
export abstract class ChannelKeyring {
  abstract masterKey(): string;
  abstract publicOrigin(): string;
}
