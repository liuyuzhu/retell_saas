import { NextRequest, NextResponse } from 'next/server';
import { retellClient } from '@/lib/retell-client';
import { CreateAgentRequest, Agent, AgentLanguage } from '@/lib/retell-types';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// Helper function to merge agent info from local database
async function mergeAgentInfo(agents: Agent[]): Promise<Agent[]> {
  const client = getSupabaseClient();
  
  // Get all agent IDs
  const agentIds = agents.map(a => a.agent_id);
  
  // Fetch agent info from local database
  const { data: agentInfoList } = await client
    .from('agent_info')
    .select('*')
    .in('agent_id', agentIds);
  
  // Create a map for quick lookup
  const agentInfoMap = new Map(
    (agentInfoList || []).map(info => [info.agent_id, info])
  );
  
  // Merge agent info into agent data
  return agents.map(agent => {
    const info = agentInfoMap.get(agent.agent_id);
    if (info) {
      return {
        ...agent,
        language: info.language as AgentLanguage,
        voice_name: info.voice_name || undefined,
        voice_gender: info.voice_gender as 'male' | 'female' | undefined,
        style: info.style || undefined,
        conversation_flow: {
          ...agent.conversation_flow,
          start_msg: info.start_message || agent.conversation_flow?.start_msg,
        },
      };
    }
    return agent;
  });
}

// GET /api/agents - List agents (with data isolation)
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    // Not authenticated - return empty list
    if (!currentUser) {
      return NextResponse.json({ data: [], has_more: false });
    }

    const client = getSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const language = searchParams.get('language') as AgentLanguage | null;

    // Admin can see all agents
    if (currentUser.role === 'admin') {
      const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
      const cursor = searchParams.get('cursor') || undefined;
      const before = searchParams.get('before') ? parseInt(searchParams.get('before')!) : undefined;
      const after = searchParams.get('after') ? parseInt(searchParams.get('after')!) : undefined;

      const result = await retellClient.listAgents({ limit, cursor, before, after });
      
      // Merge agent info from local database
      let agents = await mergeAgentInfo(result.data || []);
      
      // Filter by language if specified
      if (language) {
        agents = agents.filter(a => a.language === language);
      }
      
      return NextResponse.json({ data: agents, has_more: result.has_more });
    }

    // Regular user - only see assigned agents
    const { data: userAgents } = await client
      .from('user_agents')
      .select('agent_id')
      .eq('user_id', currentUser.userId);

    if (!userAgents || userAgents.length === 0) {
      return NextResponse.json({ data: [], has_more: false });
    }

    // Get all agents from Retell API
    const result = await retellClient.listAgents({});
    
    // Filter to only show assigned agents
    const assignedAgentIds = new Set(userAgents.map(ua => ua.agent_id));
    let agents = result.data?.filter(agent => assignedAgentIds.has(agent.agent_id)) || [];
    
    // Merge agent info from local database
    agents = await mergeAgentInfo(agents);
    
    // Filter by language if specified
    if (language) {
      agents = agents.filter(a => a.language === language);
    }

    return NextResponse.json({
      data: agents,
      has_more: false,
    });
  } catch (error) {
    console.error('Error listing agents:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list agents' },
      { status: 500 }
    );
  }
}

// POST /api/agents - Create a new agent (admin only)
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    // Only admin can create agents
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Only administrators can create agents.' },
        { status: 403 }
      );
    }

    const body: CreateAgentRequest & {
      language?: AgentLanguage;
      voice_name?: string;
      voice_gender?: 'male' | 'female';
      style?: string;
      start_message?: string;
    } = await request.json();
    
    // Extract local fields
    const { language, voice_name, voice_gender, style, start_message, ...retellBody } = body;
    
    // Set conversation_flow.start_msg for Retell API
    if (start_message && !retellBody.conversation_flow?.start_msg) {
      retellBody.conversation_flow = {
        ...retellBody.conversation_flow,
        start_msg: start_message,
      };
    }
    
    // Create agent in Retell
    const result = await retellClient.createAgent(retellBody);
    
    // Store extended info in local database
    const client = getSupabaseClient();
    await client
      .from('agent_info')
      .insert({
        agent_id: result.agent_id,
        language: language || 'zh-CN',
        voice_name: voice_name || null,
        voice_gender: voice_gender || null,
        style: style || null,
        start_message: start_message || null,
      });
    
    // Return merged result
    return NextResponse.json({
      ...result,
      language: language || 'zh-CN',
      voice_name,
      voice_gender,
      style,
      conversation_flow: {
        ...result.conversation_flow,
        start_msg: start_message || result.conversation_flow?.start_msg,
      },
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create agent' },
      { status: 500 }
    );
  }
}
