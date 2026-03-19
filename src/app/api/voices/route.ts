import { NextRequest, NextResponse } from 'next/server';
import { getRetellClient } from '@/lib/retell-client';

// GET /api/voices - List all voices
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const cursor = searchParams.get('cursor') || undefined;

    const retellClient = getRetellClient();
    const result = await retellClient.listVoices({ limit, cursor });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error listing voices:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list voices' },
      { status: 500 }
    );
  }
}
