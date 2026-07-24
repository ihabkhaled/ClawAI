export function ArchitectureSection(): React.ReactElement {
  return (
    <section id="architecture" className="border-border bg-surface-shell border-t">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            Built as independent services, not one monolith
          </h2>
          <p className="text-muted-foreground mt-4">
            ClawAI is a set of focused backend services &mdash; authentication, chat, connectors,
            routing, memory, files, image and file generation, workspace, the desktop agent runtime,
            research, and a local model runtime among them &mdash; each owning its own database and
            communicating over an internal event bus and HTTP, behind a single reverse proxy. A
            Next.js frontend talks to all of them through one API surface. This separation means a
            failure or slowdown in one area, such as image generation, does not take down chat or
            routing.
          </p>
          <p className="text-muted-foreground mt-4">
            Every account has a role with a specific permission set, enforced on both the frontend
            and every backend endpoint. Logins, connector changes, routing decisions, memory
            actions, generated content, and agent actions are all written to an audit log. An
            observability view aggregates health checks across every service so operational problems
            are visible in one place instead of buried in individual logs.
          </p>
        </div>
      </div>
    </section>
  );
}
