import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    message: 'Real-time collaboration now uses peer-to-peer Yjs + WebRTC. This endpoint is deprecated.',
  });
}

export async function POST() {
  return NextResponse.json(
    { error: 'Collaboration events are no longer handled by this endpoint.' },
    { status: 410 },
  );
}
