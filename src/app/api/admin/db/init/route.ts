import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getCurrentUser } from '@/lib/auth';

// Initialize database tables for data isolation
// This endpoint creates necessary tables if they don't exist

export async function POST() {
  try {
    const currentUser = await getCurrentUser();
    
    // Only admin can initialize database
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const client = getSupabaseClient();
    const results: Record<string, { success: boolean; message: string }> = {};

    // 1. Check/create user_calls table for call records isolation
    try {
      // Try to query the table to check if it exists
      const { error: checkError } = await client
        .from('user_calls')
        .select('id')
        .limit(1);
      
      if (checkError?.code === '42P01') {
        // Table doesn't exist, need to create via SQL
        // Note: Supabase client cannot create tables directly
        // We need to use RPC or direct SQL
        results.user_calls = {
          success: false,
          message: 'Table does not exist. Please create it in Supabase dashboard using the SQL below.',
        };
      } else {
        results.user_calls = {
          success: true,
          message: 'Table already exists',
        };
      }
    } catch (e) {
      results.user_calls = {
        success: false,
        message: `Error checking table: ${e instanceof Error ? e.message : 'Unknown error'}`,
      };
    }

    // 2. Check/create user_agents table (should already exist)
    try {
      const { error: checkError } = await client
        .from('user_agents')
        .select('id')
        .limit(1);
      
      results.user_agents = {
        success: !checkError || checkError.code !== '42P01',
        message: checkError?.code === '42P01' ? 'Table does not exist' : 'Table exists',
      };
    } catch (e) {
      results.user_agents = {
        success: false,
        message: `Error: ${e instanceof Error ? e.message : 'Unknown error'}`,
      };
    }

    // 3. Check/create user_phone_numbers table (should already exist)
    try {
      const { error: checkError } = await client
        .from('user_phone_numbers')
        .select('id')
        .limit(1);
      
      results.user_phone_numbers = {
        success: !checkError || checkError.code !== '42P01',
        message: checkError?.code === '42P01' ? 'Table does not exist' : 'Table exists',
      };
    } catch (e) {
      results.user_phone_numbers = {
        success: false,
        message: `Error: ${e instanceof Error ? e.message : 'Unknown error'}`,
      };
    }

    // Return SQL for creating missing tables
    const sqlForMissingTables = `
-- SQL to create missing tables (run in Supabase SQL Editor)

-- User-Calls table: Stores call records with user association
CREATE TABLE IF NOT EXISTS user_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  call_id VARCHAR(255) UNIQUE NOT NULL,
  call_type VARCHAR(50) NOT NULL DEFAULT 'phone_call',
  agent_id VARCHAR(255),
  from_number VARCHAR(50),
  to_number VARCHAR(50),
  call_status VARCHAR(50),
  start_timestamp BIGINT,
  end_timestamp BIGINT,
  duration_ms BIGINT,
  call_cost_usd DECIMAL(10, 6),
  recording_url TEXT,
  transcript_url TEXT,
  sentiment TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_calls_user_id ON user_calls(user_id);
CREATE INDEX IF NOT EXISTS idx_user_calls_call_id ON user_calls(call_id);
CREATE INDEX IF NOT EXISTS idx_user_calls_agent_id ON user_calls(agent_id);
CREATE INDEX IF NOT EXISTS idx_user_calls_start_timestamp ON user_calls(start_timestamp DESC);

-- User-Agents table: Associates users with agents
CREATE TABLE IF NOT EXISTS user_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_user_agents_user_id ON user_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_agents_agent_id ON user_agents(agent_id);

-- User-Phone-Numbers table: Associates users with phone numbers
CREATE TABLE IF NOT EXISTS user_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_number VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, phone_number)
);

CREATE INDEX IF NOT EXISTS idx_user_phone_numbers_user_id ON user_phone_numbers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_phone_numbers_phone_number ON user_phone_numbers(phone_number);
`;

    return NextResponse.json({
      success: true,
      tables: results,
      sql: sqlForMissingTables,
      instructions: 'If any tables are missing, run the provided SQL in your Supabase SQL Editor.',
    });
  } catch (error) {
    console.error('Database init error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Check database status
export async function GET() {
  try {
    const client = getSupabaseClient();
    const tables: Record<string, boolean> = {};

    // Check each table
    const tableNames = ['users', 'user_calls', 'user_agents', 'user_phone_numbers'];
    
    for (const tableName of tableNames) {
      try {
        const { error } = await client
          .from(tableName)
          .select('id')
          .limit(1);
        
        tables[tableName] = !error || error.code !== '42P01';
      } catch {
        tables[tableName] = false;
      }
    }

    return NextResponse.json({
      tables,
      allTablesExist: Object.values(tables).every(v => v),
    });
  } catch (error) {
    console.error('Database status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
