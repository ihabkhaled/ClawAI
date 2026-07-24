import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button-variants';
import { MARKETING_GITHUB_URL, ROUTES } from '@/constants';
import type { HomeHeroProps } from '@/types';

export function HeroSection({ lastReviewed }: HomeHeroProps): React.ReactElement {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
      <h1 className="text-foreground text-4xl font-bold tracking-tight sm:text-5xl">
        Local-first AI orchestration, without giving up cloud models
      </h1>
      <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg">
        ClawAI is a self-hosted platform that runs local AI models alongside cloud providers such as
        OpenAI, Anthropic, Gemini, AWS Bedrock, DeepSeek, and Grok, and routes each request to the
        model best suited for it. It exists for teams and individuals who want the convenience of a
        modern AI assistant &mdash; chat, memory, file understanding, workspace integrations, image
        and document generation &mdash; while keeping sensitive data and model choice under their
        own control instead of a single vendor&apos;s.
      </p>
      {/* This section has no 'use client' directive — it is a real Server
       * Component, so it renders with buttonVariants() (a plain className
       * function) rather than the <Button asChild> component, whose Radix
       * Slot dependency is not safe to import into a Server Component. */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href={ROUTES.CHAT} className={buttonVariants({ size: 'lg' })}>
          Open Claw
        </Link>
        <Link href={ROUTES.LOGIN} className={buttonVariants({ size: 'lg', variant: 'outline' })}>
          Log in
        </Link>
        <a
          href={MARKETING_GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ size: 'lg', variant: 'ghost' })}
        >
          View on GitHub
        </a>
      </div>
      <p className="text-muted-foreground mt-10 text-xs">Last reviewed {lastReviewed}</p>
    </section>
  );
}
