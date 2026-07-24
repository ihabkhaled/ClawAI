export function SelfHostingSection(): React.ReactElement {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          Run it yourself
        </h2>
        <p className="text-muted-foreground mt-4">
          ClawAI is designed to be self-hosted from the start. A single setup script provisions
          every database, service, and the reverse proxy through Docker Compose, with automatic GPU
          detection for NVIDIA, AMD ROCm, and Intel/Vulkan hosts. Local HTTPS is configured out of
          the box so every hop between the browser, the proxy, and each backend service is
          encrypted, even in local development. The full source is available on GitHub for anyone
          who wants to inspect, self-host, or extend it.
        </p>
      </div>
    </section>
  );
}
