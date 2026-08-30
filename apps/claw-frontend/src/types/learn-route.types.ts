/** Next.js route params for `/learn/[topic]`. Params are a promise in App Router. */
export type LearnTopicRouteProps = {
  params: Promise<{ topic: string }>;
};
