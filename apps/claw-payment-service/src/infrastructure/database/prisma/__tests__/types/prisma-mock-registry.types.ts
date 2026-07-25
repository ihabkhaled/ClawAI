// Shape of the spies a jest.mock factory re-exports alongside its mocked class.
// Declared here rather than inline so the spec file stays free of type aliases.
export type PrismaMockRegistry = {
  __connect?: jest.Mock;
  __disconnect?: jest.Mock;
  __construct?: jest.Mock;
};
