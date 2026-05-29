import { redirect } from 'next/navigation';

import { ROUTES } from '@/constants';

export default function HomePage() {
  // Default authenticated landing. /dashboard is permission-gated
  // (VIEW_DASHBOARD), so a normal USER would be blocked there. /chat is open to
  // every authenticated user; admins can still navigate to /dashboard directly.
  redirect(ROUTES.CHAT);
}
