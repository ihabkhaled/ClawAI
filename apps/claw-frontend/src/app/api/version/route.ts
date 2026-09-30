import { NextResponse } from 'next/server';

import { APP_VERSION } from '@/constants';

// The version the server is running NOW. An open page compares it with the
// version it was built as; `APP_VERSION` inside the page is frozen at build
// time, this answer is not.
export const dynamic = 'force-dynamic';

export function GET(): NextResponse {
  return NextResponse.json({ version: APP_VERSION }, { headers: { 'Cache-Control': 'no-store' } });
}
