import { NextRequest, NextResponse } from 'next/server';
import { retellClient } from '@/lib/retell-client';

// GET /api/calls/[id] - Get a specific call
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const result = await retellClient.getCall(id);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error getting call:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get call' },
      { status: 500 }
    );
  }
}

// DELETE /api/calls/[id] - Delete a call
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await retellClient.deleteCall(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting call:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete call' },
      { status: 500 }
    );
  }
}
