import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hashPassword, PRIMARY_ACCOUNT_EMAIL } from '@/lib/auth';

// Setup primary account - creates or updates the primary account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password, name } = body;

    // Use provided email or default primary account email
    const primaryEmail = email || PRIMARY_ACCOUNT_EMAIL;
    const primaryPassword = password || 'Admin@123456';
    const primaryName = name || 'Primary Administrator';

    const client = getSupabaseClient();

    // Check if user already exists
    const { data: existingUser } = await client
      .from('users')
      .select('id, email')
      .eq('email', primaryEmail.toLowerCase())
      .single();

    if (existingUser) {
      // Update existing user to be admin and update password
      const passwordHash = await hashPassword(primaryPassword);
      
      const { data: updatedUser, error: updateError } = await client
        .from('users')
        .update({
          password_hash: passwordHash,
          role: 'admin',
          is_active: true,
          name: primaryName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingUser.id)
        .select('id, email, name, role')
        .single();

      if (updateError) {
        console.error('Error updating primary account:', updateError);
        return NextResponse.json(
          { error: 'Failed to update primary account' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Primary account updated successfully',
        user: updatedUser,
        credentials: {
          email: primaryEmail,
          password: primaryPassword,
        },
      });
    }

    // Create new primary account
    const passwordHash = await hashPassword(primaryPassword);

    const { data: newUser, error: createError } = await client
      .from('users')
      .insert({
        email: primaryEmail.toLowerCase(),
        password_hash: passwordHash,
        name: primaryName,
        role: 'admin',
        is_active: true,
      })
      .select('id, email, name, role')
      .single();

    if (createError) {
      console.error('Error creating primary account:', createError);
      return NextResponse.json(
        { error: 'Failed to create primary account' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Primary account created successfully',
      user: newUser,
      credentials: {
        email: primaryEmail,
        password: primaryPassword,
      },
    });
  } catch (error) {
    console.error('Setup primary account error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get primary account status
export async function GET() {
  try {
    const client = getSupabaseClient();

    const { data: primaryUser, error } = await client
      .from('users')
      .select('id, email, name, role, is_active, created_at')
      .eq('email', PRIMARY_ACCOUNT_EMAIL.toLowerCase())
      .single();

    if (error || !primaryUser) {
      return NextResponse.json({
        exists: false,
        primaryAccountEmail: PRIMARY_ACCOUNT_EMAIL,
        message: 'Primary account not found. Use POST to create it.',
      });
    }

    return NextResponse.json({
      exists: true,
      primaryAccountEmail: PRIMARY_ACCOUNT_EMAIL,
      user: primaryUser,
    });
  } catch (error) {
    console.error('Get primary account error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
