import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getCurrentUser, hashPassword, isPrimaryAccount, PRIMARY_ACCOUNT_EMAIL } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Get single user (admin only)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const client = getSupabaseClient();

    const { data: user, error } = await client
      .from('users')
      .select('id, email, name, role, phone, is_active, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user's agents
    const { data: userAgents } = await client
      .from('user_agents')
      .select('agent_id')
      .eq('user_id', id);

    // Get user's phone numbers
    const { data: userPhoneNumbers } = await client
      .from('user_phone_numbers')
      .select('phone_number')
      .eq('user_id', id);

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        isPrimary: isPrimaryAccount(user.email),
        agents: userAgents?.map(ua => ua.agent_id) || [],
        phoneNumbers: userPhoneNumbers?.map(upn => upn.phone_number) || [],
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update user (PRIMARY ACCOUNT ONLY for agent/phone configuration)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, phone, role, is_active, password, agentIds, phoneNumbers } = body;

    const client = getSupabaseClient();

    // Check if user exists and get their email
    const { data: targetUser } = await client
      .from('users')
      .select('id, email')
      .eq('id', id)
      .single();

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Permission checks
    const isPrimary = isPrimaryAccount(currentUser.email);
    const isTargetPrimary = isPrimaryAccount(targetUser.email);
    const isSelfUpdate = id === currentUser.userId;

    // Only primary account can modify agent/phone assignments
    if ((agentIds !== undefined || phoneNumbers !== undefined) && !isPrimary) {
      return NextResponse.json(
        { error: 'Unauthorized. Only the primary account owner can assign agents and phone numbers.' },
        { status: 403 }
      );
    }

    // Only primary account can modify role for other users
    if (role !== undefined && !isSelfUpdate && !isPrimary) {
      return NextResponse.json(
        { error: 'Unauthorized. Only the primary account owner can modify user roles.' },
        { status: 403 }
      );
    }

    // Prevent modifying primary account's role
    if (isTargetPrimary && role !== undefined) {
      return NextResponse.json(
        { error: 'Cannot modify primary account role.' },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined && !isTargetPrimary) updateData.role = role;
    if (is_active !== undefined && !isTargetPrimary) updateData.is_active = is_active;
    if (password) updateData.password_hash = await hashPassword(password);

    // Update user
    const { data: updatedUser, error: updateError } = await client
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, email, name, role, phone, is_active, created_at, updated_at')
      .single();

    if (updateError || !updatedUser) {
      console.error('Error updating user:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    // Update agent assignments (PRIMARY ACCOUNT ONLY)
    if (agentIds !== undefined && isPrimary) {
      // Remove existing assignments
      await client.from('user_agents').delete().eq('user_id', id);
      
      // Add new assignments
      if (agentIds.length > 0) {
        const agentAssignments = agentIds.map((agentId: string) => ({
          user_id: id,
          agent_id: agentId,
        }));
        await client.from('user_agents').insert(agentAssignments);
      }
    }

    // Update phone number assignments (PRIMARY ACCOUNT ONLY)
    if (phoneNumbers !== undefined && isPrimary) {
      // Remove existing assignments
      await client.from('user_phone_numbers').delete().eq('user_id', id);
      
      // Add new assignments
      if (phoneNumbers.length > 0) {
        const phoneAssignments = phoneNumbers.map((phoneNumber: string) => ({
          user_id: id,
          phone_number: phoneNumber,
        }));
        await client.from('user_phone_numbers').insert(phoneAssignments);
      }
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete user (PRIMARY ACCOUNT ONLY)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await getCurrentUser();
    
    // Only primary account can delete users
    if (!currentUser || !isPrimaryAccount(currentUser.email)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only the primary account owner can delete users.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Prevent deleting yourself
    if (id === currentUser.userId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // Check if user exists
    const { data: user } = await client
      .from('users')
      .select('id, email')
      .eq('id', id)
      .single();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent deleting primary account
    if (isPrimaryAccount(user.email)) {
      return NextResponse.json(
        { error: 'Cannot delete the primary account.' },
        { status: 400 }
      );
    }

    // Delete user (cascade will handle related records)
    const { error: deleteError } = await client
      .from('users')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
