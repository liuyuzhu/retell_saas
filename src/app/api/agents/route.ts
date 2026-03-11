import { NextRequest, NextResponse } from 'next/server';
import { retellClient } from '@/lib/retell-client';
import { CreateAgentRequest } from '@/lib/retell-types';

// GET /api/agents - List all agents
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const cursor = searchParams.get('cursor') || undefined;
    const before = searchParams.get('before') ? parseInt(searchParams.get('before')!) : undefined;
    const after = searchParams.get('after') ? parseInt(searchParams.get('after')!) : undefined;

    const result = await retellClient.listAgents({ limit, cursor, before, after });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error listing agents:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list agents' },
      { status: 500 }
    );
  }
}

// POST /api/agents - Create a new agent
export async function POST(request: NextRequest) {
  try {
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
