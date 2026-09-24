import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    success: true,
    service: "KarateTech Public Tournament API",
    version: "v1",
    status: "ok"
  });
}
