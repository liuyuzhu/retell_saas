import { NextRequest, NextResponse } from 'next/server';
import { retellClient } from '@/lib/retell-client';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST /api/admin/sync-calls - Sync call records from Retell API to local database
// This is an admin-only endpoint to import historical call records

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    // Only admin can sync calls
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { userId, agentId, limit = 100, syncAll = false } = body;

    const client = getSupabaseClient();
    
    // Get calls from Retell API
    const result = await retellClient.listCalls({
      limit: syncAll ? undefined : limit,
    });

    if (!result.data || result.data.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No calls to sync',
        syncedCount: 0,
      });
    }

    let callsToSync = result.data;
    
    // Filter by userId if specified (get calls for user's agents/phone numbers)
    if (userId) {
      const { data: userAgents } = await client
        .from('user_agents')
        .select('agent_id')
        .eq('user_id', userId);

      const { data: userPhoneNumbers } = await client
        .from('user_phone_numbers')
        .select('phone_number')
        .eq('user_id', userId);

      const userAgentIds = new Set(userAgents?.map(ua => ua.agent_id) || []);
      const userPhones = new Set(userPhoneNumbers?.map(upn => upn.phone_number) || []);

      callsToSync = callsToSync.filter(call => {
        if (call.agent_id && userAgentIds.has(call.agent_id)) return true;
        if (call.from_number && userPhones.has(call.from_number)) return true;
        if (call.to_number && userPhones.has(call.to_number)) return true;
        return false;
      });
    }
    
    // Filter by agentId if specified
    if (agentId) {
      callsToSync = callsToSync.filter(call => call.agent_id === agentId);
    }

    // Prepare records for insertion
    const records = callsToSync.map(call => ({
      user_id: userId || null, // Admin sync may not have specific user
      call_id: call.call_id,
      call_type: call.call_type || 'phone_call',
      agent_id: call.agent_id || null,
      from_number: call.from_number || null,
      to_number: call.to_number || null,
      call_status: call.call_status || 'completed',
      start_timestamp: call.started_at || null,
      end_timestamp: call.ended_at || null,
      duration_ms: call.duration_ms || null,
      call_cost_usd: call.cost || null,
      recording_url: call.recording_url || null,
      transcript_url: null, // transcript is an array, not a URL
      sentiment: call.call_analysis?.user_sentiment || null,
      metadata: {
        call_direction: call.call_direction,
        disconnection_reason: call.disconnection_reason,
        call_successful: call.call_analysis?.call_successful,
      },
    }));

    // Upsert records (insert new, ignore duplicates)
    let syncedCount = 0;
    let errorCount = 0;

    for (const record of records) {
      try {
        const { error } = await client
          .from('user_calls')
          .upsert(record, { onConflict: 'call_id' });
        
        if (error) {
          console.error(`[Sync] Error upserting call ${record.call_id}:`, error);
          errorCount++;
        } else {
          syncedCount++;
        }
      } catch (e) {
        console.error(`[Sync] Exception for call ${record.call_id}:`, e);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${syncedCount} calls, ${errorCount} errors`,
      syncedCount,
      errorCount,
      totalFetched: result.data.length,
      filtered: callsToSync.length,
    });
  } catch (error) {
    console.error('Sync calls error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync calls' },
      { status: 500 }
    );
  }
}

// GET /api/admin/sync-calls - Get sync status
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const client = getSupabaseClient();

    // Get local call count
    const { count: localCount, error } = await client
      .from('user_calls')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return NextResponse.json({
        error: 'Failed to get local call count',
        details: error.message,
      }, { status: 500 });
    }

    // Get Retell API call count
    const retellResult = await retellClient.listCalls({ limit: 1 });

    return NextResponse.json({
      localCalls: localCount || 0,
      retellCalls: retellResult.data?.length || 0,
      message: localCount === 0 
        ? 'No local calls found. Use POST to sync from Retell API.'
        : `${localCount} calls stored locally.`,
    });
  } catch (error) {
    console.error('Get sync status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
