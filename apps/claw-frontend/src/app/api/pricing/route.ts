import { NextResponse } from 'next/server';

import { fetchPublicPricingCatalog } from '@/lib/pricing/public-pricing-api';

export async function GET(): Promise<NextResponse> {
  const plans = await fetchPublicPricingCatalog();
  if (plans === null) {
    return NextResponse.json({ message: 'Pricing is temporarily unavailable.' }, { status: 503 });
  }
  return NextResponse.json(plans, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
