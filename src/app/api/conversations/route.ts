import { NextRequest, NextResponse } from 'next/server';
import { retellClient } from '@/lib/retell-client';

// GET /api/conversations - List all conversations
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const cursor = searchParams.get('cursor') || undefined;
    const before = searchParams.get('before') ? parseInt(searchParams.get('before')!) : undefined;
    const after = searchParams.get('after') ? parseInt(searchParams.get('after')!) : undefined;
    const filterCriteria = searchParams.get('filter_criteria');

    const result = await retellClient.listConversations({
      limit,
      cursor,
      before,
      after,
      filter_criteria: filterCriteria ? JSON.parse(filterCriteria) : undefined,
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error listing conversations:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list conversations' },
      { status: 500 }
    );
  }
}
