import { Mail, MessageCircle, Send, Share2 } from 'lucide-react';

import {
  FacebookIcon,
  LinkedInIcon,
  RedditIcon,
  XIcon,
} from '@/components/threads/thread-share-icons';
import type { ThreadShareAppearance } from '@/types/thread-export.types';

/** The icon and hover colour for each share network, by the id `buildThreadShareLinks` gives it. */
export const THREAD_SHARE_APPEARANCE: Readonly<Record<string, ThreadShareAppearance>> = {
  whatsapp: { Icon: MessageCircle, hoverClass: 'hover:text-[#128c4a] dark:hover:text-[#3ddc84]' },
  facebook: { Icon: FacebookIcon, hoverClass: 'hover:text-[#1877f2] dark:hover:text-[#6aa5f8]' },
  linkedin: { Icon: LinkedInIcon, hoverClass: 'hover:text-[#0a66c2] dark:hover:text-[#6cb4f0]' },
  x: { Icon: XIcon, hoverClass: 'hover:text-foreground' },
  telegram: { Icon: Send, hoverClass: 'hover:text-[#1c7fb0] dark:hover:text-[#5ec4f2]' },
  reddit: { Icon: RedditIcon, hoverClass: 'hover:text-[#d93a00] dark:hover:text-[#ff7a4d]' },
  email: { Icon: Mail, hoverClass: 'hover:text-foreground' },
};

/** Shown for a network this build has no mark for, so a new link never renders blank. */
export const THREAD_SHARE_FALLBACK_APPEARANCE: ThreadShareAppearance = {
  Icon: Share2,
  hoverClass: 'hover:text-foreground',
};
