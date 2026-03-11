import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hashPassword } from '@/lib/auth';

// Initialize admin account - should be called once during setup
export async function POST() {
  try {
    const client = getSupabaseClient();

    // Check if admin already exists
    const { data: existingAdmin } = await client
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .single();

    if (existingAdmin) {
      return NextResponse.json({
        message: 'Admin account already exists',
        adminExists: true,
      });
    }

    // Create default admin account
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@migeai.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';
    const adminName = process.env.ADMIN_NAME || 'Administrator';

    const passwordHash = await hashPassword(adminPassword);

    const { data: admin, error } = await client
      .from('users')
      .insert({
        email: adminEmail.toLowerCase(),
        password_hash: passwordHash,
        name: adminName,
        role: 'admin',
        is_active: true,
      })
      .select('id, email, name, role')
      .single();

    if (error) {
      console.error('Error creating admin:', error);
      return NextResponse.json(
        { error: 'Failed to create admin account' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Admin account created successfully',
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
      defaultCredentials: {
        email: adminEmail,
        password: adminPassword,
        note: 'Please change the default password immediately after first login',
      },
    });
  } catch (error) {
    console.error('Init admin error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Check if admin exists
export async function GET() {
  try {
    const client = getSupabaseClient();

    const { data: admin } = await client
      .from('users')
      .select('id, email, name, role')
      .eq('role', 'admin')
      .single();

    return NextResponse.json({
      adminExists: !!admin,
      admin: admin || null,
    });
  } catch (error) {
    console.error('Check admin error:', error);
    return NextResponse.json(
      { adminExists: false, admin: null },
      { status: 200 }
    );
  }
}
