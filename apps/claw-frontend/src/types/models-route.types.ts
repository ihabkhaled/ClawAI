/** Next.js route params for `/models/[provider]`. Params are a promise in App Router. */
export type ModelProviderRouteProps = {
  params: Promise<{ provider: string }>;
};
