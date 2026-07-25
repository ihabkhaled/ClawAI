import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { ContactResponseCode } from '@/enums/contact-response-code.enum';
import { processContactSubmission } from '@/lib/contact/process-submission';

// The contact route touches nodemailer + process.env secrets, so it must run
// on the Node runtime (never Edge) and never be statically cached.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function readJsonBody(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await readJsonBody(request);
  const result = await processContactSubmission(body, request.headers);

  const response = NextResponse.json(
    { ok: result.httpStatus < 400, code: result.code },
    { status: result.httpStatus },
  );

  if (result.code === ContactResponseCode.RATE_LIMITED) {
    response.headers.set('Retry-After', String(result.retryAfterSeconds));
  }
  return response;
}
