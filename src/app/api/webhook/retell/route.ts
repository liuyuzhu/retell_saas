import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// Retell AI Webhook Event Types
interface RetellWebhookEvent {
  event: string;
  call_id?: string;
  agent_id?: string;
  phone_number_id?: string;
  from_number?: string;
  to_number?: string;
  call_status?: 'registered' | 'ongoing' | 'ended' | 'error';
  duration?: number;
  transcript?: string;
  recording_url?: string;
  metadata?: Record<string, unknown>;
}

// POST /api/webhook/retell - Handle Retell AI webhook events
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as RetellWebhookEvent;
    const { event, call_id, call_status, duration, recording_url, transcript, metadata } = body;

    console.log(`[Webhook] Received event: ${event}`, { call_id, call_status });

    // Ignore non-call events for now
    if (!call_id) {
      return NextResponse.json({ received: true });
    }

    const client = getSupabaseClient();

    switch (event) {
      case 'call_started':
      case 'call.registered':
        // Update or create call record with 'ongoing' status
        await client.from('user_calls').upsert({
          call_id,
          call_status: 'ongoing',
          agent_id: body.agent_id || null,
          from_number: body.from_number || null,
          to_number: body.to_number || null,
          phone_number_id: body.phone_number_id || null,
          start_timestamp: Date.now(),
          metadata: metadata || null,
        }, {
          onConflict: 'call_id',
        });
        break;

      case 'call_ended':
      case 'call.ended':
        // Update call record with 'ended' status and additional data
        await client.from('user_calls').update({
          call_status: 'ended',
          end_timestamp: Date.now(),
          duration: duration || null,
          recording_url: recording_url || null,
          transcript: transcript || null,
          metadata: {
            ...(metadata || {}),
            ended_at: new Date().toISOString(),
          },
        }).eq('call_id', call_id);
        break;

      case 'call.updated':
      case 'call.updated':
        // Update call status
        if (call_status) {
          const updateData: Record<string, unknown> = { call_status };
          
          if (call_status === 'error') {
            updateData.metadata = {
              ...(metadata || {}),
              error_at: new Date().toISOString(),
            };
          }
          
          await client.from('user_calls').update(updateData).eq('call_id', call_id);
        }
        break;

      case 'transcript':
        // Store transcript segment (optional - could be stored separately)
        console.log(`[Webhook] Transcript received for call ${call_id}`);
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${event}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

// GET /api/webhook/retell - Health check
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'retell-webhook' });
}
