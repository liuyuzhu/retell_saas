import { NextRequest, NextResponse } from 'next/server';
import { retellClient } from '@/lib/retell-client';
import { CreatePhoneNumberRequest } from '@/lib/retell-types';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/phone-numbers - List phone numbers (with data isolation)
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    // Not authenticated - return empty list
    if (!currentUser) {
      return NextResponse.json({ data: [], has_more: false });
    }

    const client = getSupabaseClient();

    // Admin can see all phone numbers
    if (currentUser.role === 'admin') {
      const searchParams = request.nextUrl.searchParams;
      const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
      const cursor = searchParams.get('cursor') || undefined;

      const result = await retellClient.listPhoneNumbers({ limit, cursor });
      return NextResponse.json(result);
    }

    // Regular user - only see assigned phone numbers
    const { data: userPhoneNumbers } = await client
      .from('user_phone_numbers')
      .select('phone_number')
      .eq('user_id', currentUser.userId);

    if (!userPhoneNumbers || userPhoneNumbers.length === 0) {
      return NextResponse.json({ data: [], has_more: false });
    }

    // Get all phone numbers from Retell API
    const result = await retellClient.listPhoneNumbers({});
    
    // Filter to only show assigned phone numbers
    const assignedNumbers = new Set(userPhoneNumbers.map(upn => upn.phone_number));
    const filteredNumbers = result.data?.filter(pn => assignedNumbers.has(pn.phone_number)) || [];

    return NextResponse.json({
      data: filteredNumbers,
      has_more: false,
    });
  } catch (error) {
    console.error('Error listing phone numbers:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list phone numbers' },
      { status: 500 }
    );
  }
}

// POST /api/phone-numbers - Create a new phone number (admin only)
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    // Only admin can create phone numbers
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Only administrators can create phone numbers.' },
        { status: 403 }
      );
    }

    const body: CreatePhoneNumberRequest = await request.json();
    
    if (!body.phone_number) {
      return NextResponse.json(
        { error: 'phone_number is required' },
        { status: 400 }
      );
    }

    const result = await retellClient.createPhoneNumber(body);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating phone number:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create phone number' },
      { status: 500 }
    );
  }
}
