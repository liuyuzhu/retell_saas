import { NextRequest, NextResponse } from 'next/server';
import { retellClient } from '@/lib/retell-client';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/calls/[id] - Get a specific call (with data isolation)
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
    const client = getSupabaseClient();

    // For regular users, check if they own this call
    if (currentUser.role !== 'admin') {
      const { data: userCall } = await client
        .from('user_calls')
        .select('id')
        .eq('call_id', id)
        .eq('user_id', currentUser.userId)
        .single();

      if (!userCall) {
        return NextResponse.json(
          { error: 'Call not found or access denied' },
          { status: 404 }
        );
      }
    }

    // Get call details from Retell API
    const result = await retellClient.getCall(id);
    
    // Update local database with latest status
    try {
      await client
        .from('user_calls')
        .upsert({
          call_id: id,
          call_type: result.call_type || 'phone_call',
          agent_id: result.agent_id || null,
          from_number: result.from_number || null,
          to_number: result.to_number || null,
          call_status: result.call_status || 'unknown',
          start_timestamp: result.started_at || null,
          end_timestamp: result.ended_at || null,
          duration_ms: result.duration_ms || null,
          call_cost_usd: result.cost || null,
          recording_url: result.recording_url || null,
          transcript_url: null,
          sentiment: result.call_analysis?.user_sentiment || null,
          metadata: {
            call_direction: result.call_direction,
            disconnection_reason: result.disconnection_reason,
            call_successful: result.call_analysis?.call_successful,
          },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'call_id' });
    } catch (dbError) {
      console.error('[Calls] Failed to update local record:', dbError);
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error getting call:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get call' },
      { status: 500 }
    );
  }
}

// DELETE /api/calls/[id] - Delete a call (with data isolation)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const client = getSupabaseClient();

    // For regular users, check if they own this call
    if (currentUser.role !== 'admin') {
      const { data: userCall } = await client
        .from('user_calls')
        .select('id')
        .eq('call_id', id)
        .eq('user_id', currentUser.userId)
        .single();

      if (!userCall) {
        return NextResponse.json(
          { error: 'Call not found or access denied' },
          { status: 404 }
        );
      }
    }

    // Delete from Retell API
    await retellClient.deleteCall(id);
    
    // Delete from local database
    await client
      .from('user_calls')
      .delete()
      .eq('call_id', id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting call:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete call' },
      { status: 500 }
    );
  }
}
