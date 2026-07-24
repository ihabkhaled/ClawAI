import { ORCHESTRATION_PRIMITIVES } from '@/constants';

export function FeaturesSection(): React.ReactElement {
  return (
    <section id="features" className="border-border bg-surface-shell border-t">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            Beyond a single chat window
          </h2>
          <p className="text-muted-foreground mt-4">
            When one model&apos;s answer isn&apos;t enough on its own, ClawAI offers several ways to
            combine, check, and improve on it.
          </p>
        </div>
        <dl className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {ORCHESTRATION_PRIMITIVES.map((primitive) => (
            <div key={primitive.name}>
              <dt className="text-foreground font-medium">{primitive.name}</dt>
              <dd className="text-muted-foreground mt-1.5 text-sm">{primitive.description}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
