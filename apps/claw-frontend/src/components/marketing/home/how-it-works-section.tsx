import { MESSAGE_FLOW_STEPS } from '@/constants';

export function HowItWorksSection(): React.ReactElement {
  return (
    <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          What happens when you send a message
        </h2>
        <ol className="mt-6 space-y-4">
          {MESSAGE_FLOW_STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span
                className="bg-primary/10 text-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <p className="text-muted-foreground text-sm">
                <span className="text-foreground font-medium">{step.title}</span> {step.description}
              </p>
            </li>
          ))}
        </ol>
        <p className="text-muted-foreground mt-6">
          Memory and context are opt-in per thread. Facts, preferences, and instructions are
          classified by sensitivity, can be scoped to a user, thread, project, or workspace, and
          every memory used in a response is recorded in a context receipt so you can see exactly
          what informed a given answer. Context packs let you bundle reusable text, files, URLs, and
          memory references into a named collection you attach to any thread. Uploaded files are
          chunked and retrieved the same way, so ClawAI can answer questions grounded in your own
          documents rather than the model&apos;s training data alone.
        </p>
      </div>
    </section>
  );
}
