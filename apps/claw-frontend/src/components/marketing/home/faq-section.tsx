import { FAQ_ENTRIES } from '@/constants';

export function FaqSection(): React.ReactElement {
  return (
    <section id="faq" className="border-border bg-surface-shell border-t">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          Frequently asked questions
        </h2>
        <dl className="mt-8 space-y-8">
          {FAQ_ENTRIES.map((entry) => (
            <div key={entry.question}>
              <dt className="text-foreground font-medium">{entry.question}</dt>
              <dd className="text-muted-foreground mt-1.5 text-sm">{entry.answer}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
