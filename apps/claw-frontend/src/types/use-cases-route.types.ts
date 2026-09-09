/** Next.js route params for `/use-cases/[task]`. Params are a promise in App Router. */
export type UseCaseTaskRouteProps = {
  params: Promise<{ task: string }>;
};
