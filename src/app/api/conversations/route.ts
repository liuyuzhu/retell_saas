import { NextRequest, NextResponse } from 'next/server';
import { retellClient } from '@/lib/retell-client';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/conversations - List conversations (with data isolation)
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    // Not authenticated - return empty list
    if (!currentUser) {
      return NextResponse.json({ data: [], has_more: false });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const cursor = searchParams.get('cursor') || undefined;
    const before = searchParams.get('before') ? parseInt(searchParams.get('before')!) : undefined;
    const after = searchParams.get('after') ? parseInt(searchParams.get('after')!) : undefined;
    const filterCriteria = searchParams.get('filter_criteria');

    // Admin can see all conversations
    if (currentUser.role === 'admin') {
      const result = await retellClient.listConversations({
        limit,
        cursor,
        before,
        after,
        filter_criteria: filterCriteria ? JSON.parse(filterCriteria) : undefined,
      });
      return NextResponse.json(result);
    }

    // Regular user - only see conversations related to their assigned agents
    const client = getSupabaseClient();

    // Get user's assigned agents
    const { data: userAgents } = await client
      .from('user_agents')
      .select('agent_id')
      .eq('user_id', currentUser.userId);

    const agentIds = new Set(userAgents?.map(ua => ua.agent_id) || []);

    if (agentIds.size === 0) {
      return NextResponse.json({ data: [], has_more: false });
    }

    // Get all conversations from Retell API
    const result = await retellClient.listConversations({
      limit,
      cursor,
      before,
      after,
      filter_criteria: filterCriteria ? JSON.parse(filterCriteria) : undefined,
    });
    
    // Filter conversations based on assigned agents
    const filteredConversations = result.data?.filter(conv => {
      return conv.agent_id && agentIds.has(conv.agent_id);
    }) || [];

    return NextResponse.json({
      data: filteredConversations,
      has_more: false,
    });
  } catch (error) {
    console.error('Error listing conversations:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list conversations' },
      { status: 500 }
    );
  }
}
