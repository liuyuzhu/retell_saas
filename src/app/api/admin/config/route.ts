import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getCurrentUser } from '@/lib/auth';

// GET /api/admin/config - Get all configurations (admin only)
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const client = getSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');

    let query = client
      .from('system_configs')
      .select('*')
      .order('category')
      .order('config_key');

    if (category) {
      query = query.eq('category', category);
    }

    const { data: configs, error } = await query;

    if (error) {
      console.error('Error fetching configs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch configurations' },
        { status: 500 }
      );
    }

    // Group by category
    const groupedConfigs = configs?.reduce((acc, config) => {
      if (!acc[config.category]) {
        acc[config.category] = [];
      }
      acc[config.category].push(config);
      return acc;
    }, {} as Record<string, typeof configs>);

    return NextResponse.json({
      success: true,
      data: configs,
      grouped: groupedConfigs,
    });
  } catch (error) {
    console.error('Get configs error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/config - Update configurations (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { configs } = body; // Array of { config_key, config_value }

    if (!configs || !Array.isArray(configs)) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected { configs: [...] }' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    const results = [];

    for (const config of configs) {
      const { config_key, config_value } = config;
      
      if (!config_key) continue;

      const { data, error } = await client
        .from('system_configs')
        .update({ config_value, updated_at: new Date().toISOString() })
        .eq('config_key', config_key)
        .select()
        .single();

      if (!error && data) {
        results.push(data);
      }
    }

    return NextResponse.json({
      success: true,
      updated: results.length,
      data: results,
    });
  } catch (error) {
    console.error('Update configs error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/config - Create new configuration (admin only)
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { config_key, config_value, description, category, is_public } = body;

    if (!config_key) {
      return NextResponse.json(
        { error: 'config_key is required' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    const { data, error } = await client
      .from('system_configs')
      .insert({
        config_key,
        config_value: config_value || '',
        description: description || '',
        category: category || 'general',
        is_public: is_public || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating config:', error);
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Configuration key already exists' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to create configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Create config error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
