import { NextRequest, NextResponse } from 'next/server';
import { retellClient } from '@/lib/retell-client';
import { UpdateAgentRequest } from '@/lib/retell-types';
import { getCurrentUser, isPrimaryAccount } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Helper function to check if user has access to agent
async function hasAgentAccess(userId: string, agentId: string, isPrimary: boolean): Promise<boolean> {
  if (isPrimary) return true;
  
  const client = getSupabaseClient();
  const { data } = await client
    .from('user_agents')
    .select('id')
    .eq('user_id', userId)
    .eq('agent_id', agentId)
    .single();
  
  return !!data;
}

// GET /api/agents/[id] - Get a specific agent (with access control)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const isPrimary = isPrimaryAccount(currentUser.email);
    
    // Check access
    const hasAccess = await hasAgentAccess(currentUser.userId, id, isPrimary || currentUser.role === 'admin');
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Agent not found or access denied' },
        { status: 404 }
      );
    }
    
    const result = await retellClient.getAgent(id);
    
    // Add management permission flag
    return NextResponse.json({
      ...result,
      canManage: isPrimary, // Only primary account can modify
    });
  } catch (error) {
    console.error('Error getting agent:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get agent' },
      { status: 500 }
    );
  }
}

// PATCH /api/agents/[id] - Update an agent (PRIMARY ACCOUNT ONLY)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await getCurrentUser();
    
    // Only primary account can update agents
    if (!currentUser || !isPrimaryAccount(currentUser.email)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only the primary account owner can update agents.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body: UpdateAgentRequest = await request.json();
    
    const result = await retellClient.updateAgent(id, body);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating agent:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update agent' },
      { status: 500 }
    );
  }
}

// DELETE /api/agents/[id] - Delete an agent (PRIMARY ACCOUNT ONLY)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await getCurrentUser();
    
    // Only primary account can delete agents
    if (!currentUser || !isPrimaryAccount(currentUser.email)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only the primary account owner can delete agents.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const client = getSupabaseClient();
    
    // Delete agent from Retell
    await retellClient.deleteAgent(id);
    
    // Remove agent assignments from users
    await client.from('user_agents').delete().eq('agent_id', id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting agent:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete agent' },
      { status: 500 }
    );
  }
}
