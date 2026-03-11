import { NextRequest, NextResponse } from 'next/server';
import { retellClient } from '@/lib/retell-client';
import { CreatePhoneCallRequest, CreateWebCallRequest } from '@/lib/retell-types';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/calls - List calls (with data isolation)
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

    // Admin can see all calls
    if (currentUser.role === 'admin') {
      const result = await retellClient.listCalls({
        limit,
        cursor,
        before,
        after,
        filter_criteria: filterCriteria ? JSON.parse(filterCriteria) : undefined,
      });
      return NextResponse.json(result);
    }

    // Regular user - only see calls related to their assigned agents and phone numbers
    const client = getSupabaseClient();

    // Get user's assigned agents
    const { data: userAgents } = await client
      .from('user_agents')
      .select('agent_id')
      .eq('user_id', currentUser.userId);

    // Get user's assigned phone numbers
    const { data: userPhoneNumbers } = await client
      .from('user_phone_numbers')
      .select('phone_number')
      .eq('user_id', currentUser.userId);

    const agentIds = new Set(userAgents?.map(ua => ua.agent_id) || []);
    const phoneNumbers = new Set(userPhoneNumbers?.map(upn => upn.phone_number) || []);

    if (agentIds.size === 0 && phoneNumbers.size === 0) {
      return NextResponse.json({ data: [], has_more: false });
    }

    // Get all calls from Retell API
    const result = await retellClient.listCalls({
      limit,
      cursor,
      before,
      after,
      filter_criteria: filterCriteria ? JSON.parse(filterCriteria) : undefined,
    });
    
    // Filter calls based on assigned agents and phone numbers
    const filteredCalls = result.data?.filter(call => {
      // Check if call is related to assigned agent
      if (call.agent_id && agentIds.has(call.agent_id)) return true;
      
      // Check if call is related to assigned phone number
      if (call.from_number && phoneNumbers.has(call.from_number)) return true;
      if (call.to_number && phoneNumbers.has(call.to_number)) return true;
      
      return false;
    }) || [];

    return NextResponse.json({
      data: filteredCalls,
      has_more: false,
    });
  } catch (error) {
    console.error('Error listing calls:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list calls' },
      { status: 500 }
    );
  }
}

// POST /api/calls - Create a phone call or web call (with access control)
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const client = getSupabaseClient();

    // For regular users, verify access to the agent and phone number
    if (currentUser.role !== 'admin') {
      // Check agent access
      const { data: agentAccess } = await client
        .from('user_agents')
        .select('id')
        .eq('user_id', currentUser.userId)
        .eq('agent_id', body.agent_id)
        .single();

      if (!agentAccess) {
        return NextResponse.json(
          { error: 'Access denied to this agent' },
          { status: 403 }
        );
      }

      // For phone calls, check phone number access
      if (body.from_number || body.to_number) {
        const { data: phoneAccess } = await client
          .from('user_phone_numbers')
          .select('id')
          .eq('user_id', currentUser.userId)
          .or(`phone_number.eq.${body.from_number},phone_number.eq.${body.to_number}`)
          .single();

        if (!phoneAccess) {
          return NextResponse.json(
            { error: 'Access denied to phone number' },
            { status: 403 }
          );
        }
      }
    }
    
    // Check if it's a web call (has agent_id but no phone numbers)
    if (body.call_type === 'web_call' || (!body.from_number && !body.to_number)) {
      const webCallData: CreateWebCallRequest = {
        agent_id: body.agent_id,
        metadata: body.metadata,
        retell_llm_dynamic_variables: body.retell_llm_dynamic_variables,
      };
      
      const result = await retellClient.createWebCall(webCallData);
      return NextResponse.json(result);
    } else {
      // Phone call
      const phoneCallData: CreatePhoneCallRequest = {
        from_number: body.from_number,
        to_number: body.to_number,
        agent_id: body.agent_id,
        metadata: body.metadata,
        retell_llm_dynamic_variables: body.retell_llm_dynamic_variables,
      };
      
      const result = await retellClient.createPhoneCall(phoneCallData);
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('Error creating call:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create call' },
      { status: 500 }
    );
  }
}
