import { AdSenseHead } from '@/components/adsense/adsense-head';
import { SkipToContent } from '@/components/layout/skip-to-content';
import { MarketingFooter } from '@/components/marketing/marketing-footer';
import { MarketingHeader } from '@/components/marketing/marketing-header';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
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
  );
}
