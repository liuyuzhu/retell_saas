import { NextRequest, NextResponse } from 'next/server';
import { retellClient } from '@/lib/retell-client';
import { CreatePhoneCallRequest, CreateWebCallRequest } from '@/lib/retell-types';

// GET /api/calls - List all calls
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const cursor = searchParams.get('cursor') || undefined;
    const before = searchParams.get('before') ? parseInt(searchParams.get('before')!) : undefined;
    const after = searchParams.get('after') ? parseInt(searchParams.get('after')!) : undefined;
    const filterCriteria = searchParams.get('filter_criteria');

    const result = await retellClient.listCalls({
      limit,
      cursor,
      before,
      after,
      filter_criteria: filterCriteria ? JSON.parse(filterCriteria) : undefined,
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error listing calls:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list calls' },
      { status: 500 }
    );
  }
}

// POST /api/calls - Create a phone call or web call
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
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
