import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getCurrentUser, hashPassword } from '@/lib/auth';

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

// Update user (admin only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, phone, role, is_active, password, agentIds, phoneNumbers } = body;

    const client = getSupabaseClient();

    // Build update object
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (is_active !== undefined) updateData.is_active = is_active;
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

    // Update agent assignments if provided
    if (agentIds !== undefined) {
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

    // Update phone number assignments if provided
    if (phoneNumbers !== undefined) {
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

// Delete user (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
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
      .select('id, role')
      .eq('id', id)
      .single();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent deleting other admins
    if (user.role === 'admin') {
      return NextResponse.json(
        { error: 'Cannot delete admin users' },
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
