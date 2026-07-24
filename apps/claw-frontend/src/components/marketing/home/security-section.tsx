export function SecuritySection(): React.ReactElement {
  return (
    <section className="border-border bg-surface-shell border-t">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            Privacy, data control, and honest limitations
          </h2>
          <p className="text-muted-foreground mt-4">
            Choosing a local-only or privacy-first routing mode keeps requests on infrastructure you
            control; choosing to connect a cloud provider means that provider&apos;s own terms and
            data handling apply to the requests you send it. ClawAI records which provider handled
            each message so that choice is always auditable after the fact, rather than asking you
            to simply trust that it happened. Connector credentials are encrypted at rest, and
            desktop agent actions above a configurable risk threshold require your explicit approval
            before they run.
          </p>
          <p className="text-muted-foreground mt-4">
            ClawAI does not eliminate the general risks of working with AI models: outputs can still
            be wrong, incomplete, or biased regardless of which provider generated them, and no
            orchestration layer can fully substitute for reviewing sensitive or high-stakes output
            yourself. Verification and judge/critic review reduce, but do not remove, the need for
            human judgment on anything consequential.
          </p>
        </div>
      </div>
    </section>
  );
}
