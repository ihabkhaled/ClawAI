/** Next.js route params for `/integrations/[topic]`. Params are a promise in App Router. */
export type IntegrationTopicRouteProps = {
  params: Promise<{ topic: string }>;
};
