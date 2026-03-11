import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hashPassword, generateToken, setAuthCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // Find valid reset token
    const { data: resetToken, error } = await client
      .from('password_reset_tokens')
      .select('*, users(*)')
      .eq('token', token)
      .eq('used', false)
      .single();

    if (error || !resetToken) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date(resetToken.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Reset token has expired' },
        { status: 400 }
      );
    }

    const user = resetToken.users as { id: string; email: string; role: string };

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update user password
    await client
      .from('users')
      .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    // Mark token as used
    await client
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('id', resetToken.id);

    // Generate new auth token and set cookie
    const authToken = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    await setAuthCookie(authToken);

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully',
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
