import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getCurrentUser, hashPassword } from '@/lib/auth';

// Get all users (admin only)
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const client = getSupabaseClient();

    // Get all users with their assigned agents and phone numbers
    const { data: users, error } = await client
      .from('users')
      .select(`
        id,
        email,
        name,
        role,
        phone,
        is_active,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    // Get user agents mapping
    const { data: userAgents } = await client
      .from('user_agents')
      .select('user_id, agent_id');

    // Get user phone numbers mapping
    const { data: userPhoneNumbers } = await client
      .from('user_phone_numbers')
      .select('user_id, phone_number');

    // Combine data
    const usersWithAssignments = users.map(user => ({
      ...user,
      agents: userAgents?.filter(ua => ua.user_id === user.id).map(ua => ua.agent_id) || [],
      phoneNumbers: userPhoneNumbers?.filter(upn => upn.user_id === user.id).map(upn => upn.phone_number) || [],
    }));

    return NextResponse.json({
      success: true,
      data: usersWithAssignments,
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create new user (admin only)
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
    const { email, password, name, phone, role, agentIds, phoneNumbers } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // Check if user already exists
    const { data: existingUser } = await client
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const { data: newUser, error: createError } = await client
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        name: name || email.split('@')[0],
        phone: phone || null,
        role: role || 'user',
        is_active: true,
      })
      .select()
      .single();

    if (createError || !newUser) {
      console.error('Error creating user:', createError);
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Assign agents if provided
    if (agentIds && agentIds.length > 0) {
      const agentAssignments = agentIds.map((agentId: string) => ({
        user_id: newUser.id,
        agent_id: agentId,
      }));
      await client.from('user_agents').insert(agentAssignments);
    }

    // Assign phone numbers if provided
    if (phoneNumbers && phoneNumbers.length > 0) {
      const phoneAssignments = phoneNumbers.map((phoneNumber: string) => ({
        user_id: newUser.id,
        phone_number: phoneNumber,
      }));
      await client.from('user_phone_numbers').insert(phoneAssignments);
    }

    // Return user info (without password hash)
    const { password_hash: _, ...userWithoutPassword } = newUser;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
