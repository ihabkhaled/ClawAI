import { Check, Copy, ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PublicShareUrlFieldProps } from '@/types';

/**
 * The generated URL, read-only, with copy and open-in-new-tab.
 *
 * Read-only because the identifier is server-minted: an editable field would
 * invite someone to type a "nicer" URL that resolves to nothing.
 *
 * The link carries `rel="noopener noreferrer"` even though it points at our own
 * origin — the owner may be opening it while signed in, and there is no reason
 * for the new tab to keep a handle on this one.
 */
export function PublicShareUrlField({
  label,
  url,
  copyLabel,
  copiedLabel,
  openLabel,
  isCopied,
  onCopy,
}: PublicShareUrlFieldProps): React.ReactElement {
  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <Input value={url} readOnly aria-label={label} className="font-mono text-xs" />
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={onCopy}
          aria-label={isCopied ? copiedLabel : copyLabel}
          title={isCopied ? copiedLabel : copyLabel}
        >
          {isCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          asChild
          aria-label={openLabel}
          title={openLabel}
        >
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}
