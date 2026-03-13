import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/config/public - Get public configurations (no auth required)
export async function GET() {
  try {
    const client = getSupabaseClient();

    const { data: configs, error } = await client
      .from('system_configs')
      .select('config_key, config_value')
      .eq('is_public', true);

    if (error) {
      console.error('Error fetching public configs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch configurations' },
        { status: 500 }
      );
    }

    // Convert to key-value object
    const publicConfig = configs?.reduce((acc, config) => {
      acc[config.config_key] = config.config_value;
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json({
      success: true,
      data: publicConfig,
    });
  } catch (error) {
    console.error('Get public configs error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
