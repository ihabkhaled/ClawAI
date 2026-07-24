import { ROUTING_MODES } from '@/constants';

export function RoutingSection(): React.ReactElement {
  return (
    <section className="border-border bg-surface-shell border-t">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            Routing that adapts to the request, not the other way around
          </h2>
          <p className="text-muted-foreground mt-4">
            Every message can be classified into one of several dozen capability categories &mdash;
            coding, data analysis, creative writing, security, legal, medical, and more &mdash; and
            routed accordingly. Seven routing modes cover the range from fully automatic to fully
            manual:
          </p>
          <ul className="mt-6 space-y-3">
            {ROUTING_MODES.map((mode) => (
              <li key={mode.name} className="text-muted-foreground text-sm">
                <span className="text-foreground font-medium">{mode.name}.</span> {mode.description}
                .
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground mt-6">
            Connectors are health-checked continuously, and routing decisions record a confidence
            score, the reasoning tags behind the choice, and a fallback chain so a failing provider
            does not stall a conversation. A Routing Replay Lab lets you re-run historical routing
            decisions against the current configuration to see what would change before you adopt a
            new policy.
          </p>
        </div>
      </div>
    </section>
  );
}
