import { INTEGRATION_HIGHLIGHTS } from '@/constants';

export function IntegrationsSection(): React.ReactElement {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          Connected to where your work already happens
        </h2>
        <p className="text-muted-foreground mt-4">
          ClawAI reaches beyond the chat window into the tools you already use, and can act on your
          behalf under explicit human approval.
        </p>
      </div>
      <dl className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2">
        {INTEGRATION_HIGHLIGHTS.map((highlight) => (
          <div key={highlight.name}>
            <dt className="text-foreground font-medium">{highlight.name}</dt>
            <dd className="text-muted-foreground mt-1.5 text-sm">{highlight.description}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
