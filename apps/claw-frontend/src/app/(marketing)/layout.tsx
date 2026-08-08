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
      {/* AdSense script lives ONLY here in the marketing layout — it can
       * never appear in the (portal) or (auth) trees. It self-gates on
       * configuration + eligibility + review/serving flags. */}
      <SkipToContent />
      <MarketingHeader />
      <main id="main-content" tabIndex={-1} className="flex-1 focus-visible:outline-none">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
