import { FileText } from 'lucide-react';

// The neutral tile an attachment shows while it is being identified, and for
// anything that is not an image.
export function AttachmentPlaceholder(): React.ReactElement {
  return (
    <div className="border-border bg-muted flex h-20 w-20 items-center justify-center rounded-lg border">
      <FileText className="text-muted-foreground h-6 w-6" aria-hidden="true" />
    </div>
  );
}
