import { NextRequest, NextResponse } from 'next/server';
import { getRetellClient } from '@/lib/retell-client';

// GET /api/voices/[id] - Get a specific voice
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const retellClient = getRetellClient();
    const result = await retellClient.getVoice(id);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error getting voice:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get voice' },
      { status: 500 }
    );
  }
}
