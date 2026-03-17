import { NextRequest, NextResponse } from 'next/server';
import { retellClient } from '@/lib/retell-client';
import { UpdateAgentRequest, AgentLanguage } from '@/lib/retell-types';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Helper function to check if user has access to agent
async function hasAgentAccess(userId: string, agentId: string, isAdmin: boolean): Promise<boolean> {
  if (isAdmin) return true;
  
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
    
    // Check access
    const hasAccess = await hasAgentAccess(currentUser.userId, id, currentUser.role === 'admin');
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Agent not found or access denied' },
        { status: 404 }
      );
    }
    
    const result = await retellClient.getAgent(id);
    
    // Merge with local agent info
    const client = getSupabaseClient();
    const { data: agentInfo } = await client
      .from('agent_info')
      .select('*')
      .eq('agent_id', id)
      .single();
    
    if (agentInfo) {
      return NextResponse.json({
        ...result,
        language: agentInfo.language as AgentLanguage,
        voice_name: agentInfo.voice_name || undefined,
        voice_gender: agentInfo.voice_gender as 'male' | 'female' | undefined,
        style: agentInfo.style || undefined,
        conversation_flow: {
          ...result.conversation_flow,
          start_msg: agentInfo.start_message || result.conversation_flow?.start_msg,
        },
      });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error getting agent:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get agent' },
      { status: 500 }
    );
  }
}

// PATCH /api/agents/[id] - Update an agent (admin only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await getCurrentUser();
    
    // Only admin can update agents
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Only administrators can update agents.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body: UpdateAgentRequest & {
      language?: AgentLanguage;
      voice_name?: string;
      voice_gender?: 'male' | 'female';
      style?: string;
      start_message?: string;
    } = await request.json();
    
    // Extract local fields
    const { language, voice_name, voice_gender, style, start_message, ...retellBody } = body;
    
    // Update start_msg in Retell if provided
    if (start_message) {
      retellBody.conversation_flow = {
        ...retellBody.conversation_flow,
        start_msg: start_message,
      };
    }
    
    // Update agent in Retell
    const result = await retellClient.updateAgent(id, retellBody);
    
    // Update extended info in local database
    const client = getSupabaseClient();
    
    // Check if agent_info exists
    const { data: existingInfo } = await client
      .from('agent_info')
      .select('id')
      .eq('agent_id', id)
      .single();
    
    if (existingInfo) {
      // Update existing record
      await client
        .from('agent_info')
        .update({
          ...(language && { language }),
          ...(voice_name !== undefined && { voice_name }),
          ...(voice_gender && { voice_gender }),
          ...(style !== undefined && { style }),
          ...(start_message !== undefined && { start_message }),
          updated_at: new Date().toISOString(),
        })
        .eq('agent_id', id);
    } else {
      // Insert new record
      await client
        .from('agent_info')
        .insert({
          agent_id: id,
          language: language || 'zh-CN',
          voice_name: voice_name || null,
          voice_gender: voice_gender || null,
          style: style || null,
          start_message: start_message || null,
        });
    }
    
    // Return merged result
    return NextResponse.json({
      ...result,
      language: language,
      voice_name,
      voice_gender,
      style,
      conversation_flow: {
        ...result.conversation_flow,
        start_msg: start_message || result.conversation_flow?.start_msg,
      },
    });
  } catch (error) {
    console.error('Error updating agent:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update agent' },
      { status: 500 }
    );
  }
}

// DELETE /api/agents/[id] - Delete an agent (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await getCurrentUser();
    
    // Only admin can delete agents
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Only administrators can delete agents.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const client = getSupabaseClient();
    
    // Delete agent from Retell
    await retellClient.deleteAgent(id);
    
    // Remove agent assignments from users
    await client.from('user_agents').delete().eq('agent_id', id);
    
    // Remove agent info from local database
    await client.from('agent_info').delete().eq('agent_id', id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting agent:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete agent' },
      { status: 500 }
    );
  }
}
