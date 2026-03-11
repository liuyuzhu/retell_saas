import { NextRequest, NextResponse } from 'next/server';
import { retellClient } from '@/lib/retell-client';
import { UpdatePhoneNumberRequest } from '@/lib/retell-types';

// GET /api/phone-numbers/[number] - Get a specific phone number
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const { number } = await params;
    const decodedNumber = decodeURIComponent(number);
    
    const result = await retellClient.getPhoneNumber(decodedNumber);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error getting phone number:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get phone number' },
      { status: 500 }
    );
  }
}

// PATCH /api/phone-numbers/[number] - Update a phone number
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
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

// DELETE /api/phone-numbers/[number] - Delete a phone number
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const { number } = await params;
    const decodedNumber = decodeURIComponent(number);
    
    await retellClient.deletePhoneNumber(decodedNumber);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting phone number:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete phone number' },
      { status: 500 }
    );
  }
}
