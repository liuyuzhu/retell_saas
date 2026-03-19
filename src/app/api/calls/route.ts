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
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
    const cursor = searchParams.get('cursor') || undefined;
    const before = searchParams.get('before') ? parseInt(searchParams.get('before')!) : undefined;
    const after = searchParams.get('after') ? parseInt(searchParams.get('after')!) : undefined;
    const filterCriteria = searchParams.get('filter_criteria');
    const useLocal = searchParams.get('local') !== 'false'; // Default to local DB

    const client = getSupabaseClient();

    // Admin can see all calls (optionally from Retell API or local DB)
    if (currentUser.role === 'admin') {
      if (useLocal) {
        // Query from local database
        let query = client
          .from('user_calls')
          .select('*')
          .order('start_timestamp', { ascending: false })
          .limit(limit);
        
        if (before) {
          query = query.lt('start_timestamp', before);
        }
        if (after) {
          query = query.gt('start_timestamp', after);
        }
        
        const { data: localCalls, error } = await query;
        
        if (error) {
          console.error('[Calls] Local DB query error:', error);
          // Fallback to Retell API
          const result = await retellClient.listCalls({
            limit,
            cursor,
            before,
            after,
            filter_criteria: filterCriteria ? JSON.parse(filterCriteria) : undefined,
          });
          return NextResponse.json(result);
        }
        
        // Transform local DB records to match Retell API format
        const calls = localCalls?.map(call => ({
          call_id: call.call_id,
          call_type: call.call_type,
          agent_id: call.agent_id,
          from_number: call.from_number,
          to_number: call.to_number,
          call_status: call.call_status,
          start_timestamp: call.start_timestamp,
          end_timestamp: call.end_timestamp,
          duration_ms: call.duration_ms,
          call_cost_usd: call.call_cost_usd,
          recording_url: call.recording_url,
          transcript_url: call.transcript_url,
          sentiment: call.sentiment,
          metadata: call.metadata,
        })) || [];
        
        return NextResponse.json({ data: calls, has_more: false });
      } else {
        // Use Retell API directly
        const result = await retellClient.listCalls({
          limit,
          cursor,
          before,
          after,
          filter_criteria: filterCriteria ? JSON.parse(filterCriteria) : undefined,
        });
        return NextResponse.json(result);
      }
    }

    // Regular user - only see their own calls from local database
    let query = client
      .from('user_calls')
      .select('*')
      .eq('user_id', currentUser.userId)
      .order('start_timestamp', { ascending: false })
      .limit(limit);
    
    if (before) {
      query = query.lt('start_timestamp', before);
    }
    if (after) {
      query = query.gt('start_timestamp', after);
    }
    
    const { data: localCalls, error } = await query;
    
    if (error) {
      console.error('[Calls] Local DB query error for user:', error);
      // Fallback to filtered Retell API
      const { data: userAgents } = await client
        .from('user_agents')
        .select('agent_id')
        .eq('user_id', currentUser.userId);
      
      const { data: userPhoneNumbers } = await client
        .from('user_phone_numbers')
        .select('phone_number')
        .eq('user_id', currentUser.userId);

      const agentIds = new Set(userAgents?.map(ua => ua.agent_id) || []);
      const phoneNumbers = new Set(userPhoneNumbers?.map(upn => upn.phone_number) || []);

      if (agentIds.size === 0 && phoneNumbers.size === 0) {
        return NextResponse.json({ data: [], has_more: false });
      }

      const result = await retellClient.listCalls({
        limit,
        cursor,
        before,
        after,
        filter_criteria: filterCriteria ? JSON.parse(filterCriteria) : undefined,
      });
      
      const filteredCalls = result.data?.filter(call => {
        if (call.agent_id && agentIds.has(call.agent_id)) return true;
        if (call.from_number && phoneNumbers.has(call.from_number)) return true;
        if (call.to_number && phoneNumbers.has(call.to_number)) return true;
        return false;
      }) || [];

      return NextResponse.json({ data: filteredCalls, has_more: false });
    }
    
    // Transform local DB records to match Retell API format
    const calls = localCalls?.map(call => ({
      call_id: call.call_id,
      call_type: call.call_type,
      agent_id: call.agent_id,
      from_number: call.from_number,
      to_number: call.to_number,
      call_status: call.call_status,
      start_timestamp: call.start_timestamp,
      end_timestamp: call.end_timestamp,
      duration_ms: call.duration_ms,
      call_cost_usd: call.call_cost_usd,
      recording_url: call.recording_url,
      transcript_url: call.transcript_url,
      sentiment: call.sentiment,
      metadata: call.metadata,
    })) || [];

    return NextResponse.json({ data: calls, has_more: false });
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
    
    let result: unknown;
    let callType: 'web_call' | 'phone_call' = 'phone_call';
    
    // Check if it's a web call (has agent_id but no phone numbers)
    if (body.call_type === 'web_call' || (!body.from_number && !body.to_number)) {
      callType = 'web_call';
      
      // Prepare dynamic variables for language support
      const dynamicVariables: Record<string, unknown> = {
        ...body.retell_llm_dynamic_variables,
      };
      
      // Add language configuration if provided
      if (body.language) {
        dynamicVariables.user_language = body.language;
        dynamicVariables.language_code = body.language;
      }
      
      const webCallData: CreateWebCallRequest = {
        agent_id: body.agent_id,
        metadata: {
          ...body.metadata,
          language: body.language || 'zh',
          user_id: currentUser.userId, // Track user in metadata
        },
        retell_llm_dynamic_variables: Object.keys(dynamicVariables).length > 0 ? dynamicVariables : undefined,
      };
      
      result = await retellClient.createWebCall(webCallData);
    } else {
      // Phone call
      const phoneCallData: CreatePhoneCallRequest = {
        from_number: body.from_number,
        to_number: body.to_number,
        agent_id: body.agent_id,
        metadata: {
          ...body.metadata,
          user_id: currentUser.userId, // Track user in metadata
        },
        retell_llm_dynamic_variables: body.retell_llm_dynamic_variables,
      };
      
      result = await retellClient.createPhoneCall(phoneCallData);
    }
    
    // Save call record to local database for data isolation
    try {
      const callResult = result as { call_id?: string; call_sid?: string };
      const callId = callResult.call_id || callResult.call_sid;
      
      if (callId) {
        await client.from('user_calls').insert({
          user_id: currentUser.userId,
          call_id: callId,
          call_type: callType,
          agent_id: body.agent_id,
          from_number: body.from_number || null,
          to_number: body.to_number || null,
          call_status: 'ongoing',
          start_timestamp: Date.now(),
          metadata: {
            language: body.language,
            created_by: currentUser.email,
          },
        });
        console.log(`[Calls] Call record saved: ${callId} for user ${currentUser.userId}`);
      }
    } catch (dbError) {
      // Log but don't fail the request if DB insert fails
      console.error('[Calls] Failed to save call record to database:', dbError);
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating call:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create call' },
      { status: 500 }
    );
  }
}
