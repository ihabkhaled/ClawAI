/** Next.js route params for `/features/[capability]`. Params are a promise in App Router. */
export type FeatureCapabilityRouteProps = {
  params: Promise<{ capability: string }>;
};
