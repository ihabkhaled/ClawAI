import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button-variants';
import { MARKETING_GITHUB_URL, ROUTES } from '@/constants';

export function CtaSection(): React.ReactElement {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
      <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
        Try ClawAI on your own terms
      </h2>
      <p className="text-muted-foreground mx-auto mt-4 max-w-xl">
        Log in to an existing deployment, or clone the repository and run the setup script to stand
        up your own.
      </p>
      {/* Real Server Component — see hero-section.tsx for why buttonVariants()
       * is used instead of <Button asChild>. */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href={ROUTES.CHAT} className={buttonVariants({ size: 'lg' })}>
          Open Claw
        </Link>
        <a
          href={MARKETING_GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ size: 'lg', variant: 'outline' })}
        >
          Get the source on GitHub
        </a>
      </div>
    </section>
  );
}
