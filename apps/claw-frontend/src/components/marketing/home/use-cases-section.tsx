import { USE_CASE_ENTRIES } from '@/constants';

export function UseCasesSection(): React.ReactElement {
  return (
    <section id="use-cases" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          Who ClawAI is for
        </h2>
      </div>
      <dl className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2">
        {USE_CASE_ENTRIES.map((useCase) => (
          <div key={useCase.name}>
            <dt className="text-foreground font-medium">{useCase.name}</dt>
            <dd className="text-muted-foreground mt-1.5 text-sm">{useCase.description}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
