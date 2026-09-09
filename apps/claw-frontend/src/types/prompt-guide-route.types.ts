/** Next.js route params for `/prompts/[topic]`. Params are a promise in App Router. */
export type PromptGuideTopicRouteProps = {
  params: Promise<{ topic: string }>;
};
