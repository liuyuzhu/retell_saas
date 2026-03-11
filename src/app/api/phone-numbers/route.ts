import { NextRequest, NextResponse } from 'next/server';
import { retellClient } from '@/lib/retell-client';
import { CreatePhoneNumberRequest } from '@/lib/retell-types';

// GET /api/phone-numbers - List all phone numbers
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const cursor = searchParams.get('cursor') || undefined;

    const result = await retellClient.listPhoneNumbers({ limit, cursor });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error listing phone numbers:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list phone numbers' },
      { status: 500 }
    );
  }
}

// POST /api/phone-numbers - Create a new phone number
export async function POST(request: NextRequest) {
  try {
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
