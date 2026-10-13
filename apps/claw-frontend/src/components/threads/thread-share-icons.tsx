import type { ReactElement } from 'react';

import type { ThreadShareIconProps } from '@/types/thread-export.types';

// lucide-react 1.x ships no brand logos, and a share row without them is unreadable. These are
// small single-colour marks drawn on a 24px grid. They take `currentColor`, so they follow the
// theme, and they are decorative: the link around them carries the accessible name.

export function FacebookIcon({ className }: ThreadShareIconProps): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M13.5 22v-8.2h2.8l.5-3.3h-3.3V8.4c0-.95.4-1.7 1.8-1.7h1.6V3.8c-.3 0-1.3-.2-2.5-.2-2.5 0-4.2 1.5-4.2 4.3v2.6H7.4v3.3h2.8V22z" />
    </svg>
  );
}

export function LinkedInIcon({ className }: ThreadShareIconProps): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M6.94 5a2 2 0 1 1-4-.002A2 2 0 0 1 6.94 5zM7 8.48H3V21h4V8.48zm6.32 0H9.34V21h3.96v-6.57c0-3.62 4.6-3.92 4.6 0V21H22v-7.93c0-6.17-7.06-5.94-8.72-2.91l.04-1.68z" />
    </svg>
  );
}

export function XIcon({ className }: ThreadShareIconProps): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M18.9 2h3.4l-7.4 8.5L23.6 22h-6.8l-5.3-7-6.1 7H2l7.9-9.1L1.6 2h7l4.8 6.4L18.9 2zm-1.2 18h1.9L6.5 3.9H4.5L17.7 20z" />
    </svg>
  );
}

export function RedditIcon({ className }: ThreadShareIconProps): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path
        fillRule="evenodd"
        d="M12 7c-4.7 0-8.5 2.7-8.5 6s3.8 6 8.5 6 8.5-2.7 8.5-6-3.8-6-8.5-6zM8.6 11.5a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8zm6.8 0a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8zM9 16.1c.9.7 1.9 1 3 1s2.1-.3 3-1l-.6-.8c-.7.5-1.5.8-2.4.8s-1.7-.3-2.4-.8L9 16.1z"
      />
      <circle cx="19.2" cy="5.2" r="1.7" />
      <path d="M12.6 7.2l.9-3.9 4.9 1.1-.3 1.3-3.8-.9-.6 2.5z" />
    </svg>
  );
}
