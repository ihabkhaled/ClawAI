import type { ThreadSharePlatform } from '@/types/thread-export.types';

/**
 * Share links for the networks people use most. Each is a plain `https` or `mailto` address
 * with the page URL and title encoded into it, so nothing is sent anywhere until the person
 * clicks, and no third-party script or tracker is loaded on the page.
 */
export function buildThreadShareLinks(url: string, title: string): ThreadSharePlatform[] {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedBoth = encodeURIComponent(`${title} ${url}`);
  return [
    { id: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${encodedBoth}` },
    {
      id: 'facebook',
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      id: 'x',
      label: 'X',
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      id: 'telegram',
      label: 'Telegram',
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      id: 'reddit',
      label: 'Reddit',
      href: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
    },
    {
      id: 'email',
      label: 'Email',
      href: `mailto:?subject=${encodedTitle}&body=${encodedBoth}`,
    },
  ];
}
