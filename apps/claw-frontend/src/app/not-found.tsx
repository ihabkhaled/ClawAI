import type { Metadata } from 'next';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button-variants';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import { getTranslation } from '@/lib/i18n/translations';

// Root not-found.tsx renders outside every route group layout when no route
// segment matches at all, so it cannot read the client-only saved locale —
// it renders in DEFAULT_LOCALE via the same typed translation resolver
// everything else uses, rather than hardcoding English strings inline.
//
// Imports the specific submodules directly rather than the `@/lib/i18n`
// barrel: that barrel also re-exports the 'use client' LocaleProvider/
// LocaleContext, and a server component importing ANY name through a
// barrel that contains a 'use client' file can pull React's createContext
// into the server bundle and crash at build time ("e.createContext is not
// a function"). getTranslation/DEFAULT_LOCALE themselves have no client
// dependencies, so importing them directly avoids the barrel entirely.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function NotFound(): React.ReactElement {
  const title = getTranslation(DEFAULT_LOCALE, 'marketing.notFound.title');
  const description = getTranslation(DEFAULT_LOCALE, 'marketing.notFound.description');
  const backHome = getTranslation(DEFAULT_LOCALE, 'marketing.notFound.backHome');

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-foreground text-3xl font-bold">{title}</h1>
      <p className="text-muted-foreground max-w-md">{description}</p>
      {/* Real Server Component — see hero-section.tsx for why buttonVariants()
       * is used instead of <Button asChild>. */}
      <Link href="/" className={buttonVariants({})}>
        {backHome}
      </Link>
    </div>
  );
}
