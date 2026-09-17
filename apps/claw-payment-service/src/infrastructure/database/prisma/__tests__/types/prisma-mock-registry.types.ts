import type { Mock } from 'vitest';
// Shape of the spies a vi.mock factory re-exports alongside its mocked class.
// Declared here rather than inline so the spec file stays free of type aliases.
export type PrismaMockRegistry = {
  __connect?: Mock;
  __disconnect?: Mock;
  __construct?: Mock;
};
