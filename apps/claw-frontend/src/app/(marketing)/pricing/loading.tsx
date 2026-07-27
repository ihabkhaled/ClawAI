export default function PricingLoading(): React.ReactElement {
  return (
    <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8" aria-busy="true">
      <div className="bg-muted mx-auto h-9 w-64 animate-pulse rounded" />
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {['one', 'two', 'three'].map((key) => (
          <div key={key} className="border-border h-72 animate-pulse rounded-lg border" />
        ))}
      </div>
    </main>
  );
}
