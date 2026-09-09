/** Next.js route params for `/model-fit/[task]`. Params are a promise in App Router. */
export type ModelFitTaskRouteProps = {
  params: Promise<{ task: string }>;
};
