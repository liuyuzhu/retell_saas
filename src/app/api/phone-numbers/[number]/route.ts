import { NextRequest, NextResponse } from 'next/server';
import { retellClient } from '@/lib/retell-client';
import { UpdatePhoneNumberRequest } from '@/lib/retell-types';
import { getCurrentUser, isPrimaryAccount } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

interface RouteParams {
  params: Promise<{ number: string }>;
}

// Helper function to check if user has access to phone number
async function hasPhoneAccess(userId: string, phoneNumber: string, isPrimary: boolean): Promise<boolean> {
  if (isPrimary) return true;
  
  const client = getSupabaseClient();
  const { data } = await client
    .from('user_phone_numbers')
    .select('id')
    .eq('user_id', userId)
    .eq('phone_number', phoneNumber)
    .single();
  
  return !!data;
}

// GET /api/phone-numbers/[number] - Get a specific phone number (with access control)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { number } = await params;
    const decodedNumber = decodeURIComponent(number);
    const isPrimary = isPrimaryAccount(currentUser.email);
    
    // Check access
    const hasAccess = await hasPhoneAccess(currentUser.userId, decodedNumber, isPrimary || currentUser.role === 'admin');
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Phone number not found or access denied' },
        { status: 404 }
      );
    }
    
    const result = await retellClient.getPhoneNumber(decodedNumber);
    
    // Add management permission flag
    return NextResponse.json({
      ...result,
      canManage: isPrimary, // Only primary account can modify
    });
  } catch (error) {
    console.error('Error getting phone number:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get phone number' },
      { status: 500 }
    );
  }
}

// PATCH /api/phone-numbers/[number] - Update a phone number (PRIMARY ACCOUNT ONLY)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await getCurrentUser();
    
    // Only primary account can update phone numbers
    if (!currentUser || !isPrimaryAccount(currentUser.email)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only the primary account owner can update phone numbers.' },
        { status: 403 }
      );
    }

    const { number } = await params;
    const decodedNumber = decodeURIComponent(number);
    const body: UpdatePhoneNumberRequest = await request.json();
    
    const result = await retellClient.updatePhoneNumber(decodedNumber, body);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating phone number:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update phone number' },
      { status: 500 }
    );
  }
}

// DELETE /api/phone-numbers/[number] - Delete a phone number (PRIMARY ACCOUNT ONLY)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await getCurrentUser();
    
    // Only primary account can delete phone numbers
    if (!currentUser || !isPrimaryAccount(currentUser.email)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only the primary account owner can delete phone numbers.' },
        { status: 403 }
      );
    }

    const { number } = await params;
    const decodedNumber = decodeURIComponent(number);
    const client = getSupabaseClient();
    
    // Delete phone number from Retell
    await retellClient.deletePhoneNumber(decodedNumber);
    
    // Remove phone number assignments from users
    await client.from('user_phone_numbers').delete().eq('phone_number', decodedNumber);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting phone number:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete phone number' },
      { status: 500 }
    );
  }
}
