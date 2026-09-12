import { headers } from 'next/headers';

import { AdSenseHead } from '@/components/adsense/adsense-head';
import { SkipToContent } from '@/components/layout/skip-to-content';
import { MarketingFooter } from '@/components/marketing/marketing-footer';
import { MarketingHeader } from '@/components/marketing/marketing-header';
import { DisplayCurrencyProvider } from '@/lib/display-currency/display-currency-context';
import { fetchDisplayCurrencyContext } from '@/lib/display-currency/fetch-display-currency-context';

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  // Resolved on the SERVER so the first paint already carries the right
  // currency. Doing it after hydration is what produces the "$10 -> EGP 515"
  // flash, and a null result simply renders canonical USD.
  const displayCurrency = await fetchDisplayCurrencyContext(await headers());

  return (
    <DisplayCurrencyProvider initialContext={displayCurrency}>
      <div className="flex min-h-dvh flex-col">
        {/* AdSense is mounted ONLY here — it can never appear in the (portal),
         * (auth) or (payment) trees, because they render through the root
         * layout without this component at all. Even inside this tree the
         * verification meta tag is the only thing unconditional: the loader
         * script additionally self-gates per-pathname (AdSenseScriptLoader),
         * because this group also contains non-eligible pages such as
         * /share/chat, /terms and /privacy. Both elements are hoisted to the
         * real document <head> by React even though this layout renders inside
         * <body> — see rules/38-adsense-eligibility-and-low-value-content.md. */}
        <AdSenseHead />
        <SkipToContent />
        <MarketingHeader />
        <main id="main-content" tabIndex={-1} className="flex-1 focus-visible:outline-none">
          {children}
        </main>
        <MarketingFooter />
      </div>
    </DisplayCurrencyProvider>
  );
}
