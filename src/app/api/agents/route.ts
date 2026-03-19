import { NextRequest, NextResponse } from 'next/server';
import { retellClient } from '@/lib/retell-client';
import { CreateAgentRequest } from '@/lib/retell-types';
import { getCurrentUser, isPrimaryAccount, PRIMARY_ACCOUNT_EMAIL } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/agents - List agents (with data isolation)
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    // Not authenticated - return empty list
    if (!currentUser) {
      return NextResponse.json({ data: [], has_more: false });
    }

    const client = getSupabaseClient();
    const isPrimary = isPrimaryAccount(currentUser.email);

    // Primary account or admin can see all agents
    if (isPrimary || currentUser.role === 'admin') {
      const searchParams = request.nextUrl.searchParams;
      const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
      const cursor = searchParams.get('cursor') || undefined;
      const before = searchParams.get('before') ? parseInt(searchParams.get('before')!) : undefined;
      const after = searchParams.get('after') ? parseInt(searchParams.get('after')!) : undefined;

      const result = await retellClient.listAgents({ limit, cursor, before, after });
      
      // Add flag to indicate if user can manage (create/delete) agents
      return NextResponse.json({
        ...result,
        canManage: isPrimary,
        primaryAccountEmail: PRIMARY_ACCOUNT_EMAIL,
      });
    }

    // Regular user - only see assigned agents
    const { data: userAgents } = await client
      .from('user_agents')
      .select('agent_id')
      .eq('user_id', currentUser.userId);

    if (!userAgents || userAgents.length === 0) {
      return NextResponse.json({ data: [], has_more: false, canManage: false });
    }

    // Get all agents from Retell API
    const result = await retellClient.listAgents({});
    
    // Filter to only show assigned agents
    const assignedAgentIds = new Set(userAgents.map(ua => ua.agent_id));
    const filteredAgents = result.data?.filter(agent => assignedAgentIds.has(agent.agent_id)) || [];

    return NextResponse.json({
      data: filteredAgents,
      has_more: false,
      canManage: false, // Regular users cannot create/delete agents
    });
  } catch (error) {
    console.error('Error listing agents:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list agents' },
      { status: 500 }
    );
  }
}

// POST /api/agents - Create a new agent (PRIMARY ACCOUNT ONLY)
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    // Only primary account can create agents
    if (!currentUser || !isPrimaryAccount(currentUser.email)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only the primary account owner can create agents.' },
        { status: 403 }
      );
    }

    const body: CreateAgentRequest = await request.json();
    
    const result = await retellClient.createAgent(body);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create agent' },
      { status: 500 }
    );
  }
}
