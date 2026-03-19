import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { generateResetToken } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/email';
import { ok, Err } from '@/lib/api-helpers';
import { ForgotPasswordSchema } from '@/lib/validation';

// Always return a success-like response to prevent email enumeration
const SAFE_RESPONSE = { success: true, message: 'If that email exists, a reset link has been sent.' };

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try { body = await request.json(); } catch { return Err.badRequest('Request body is required.'); }

    const parsed = ForgotPasswordSchema.safeParse(body);
    if (!parsed.success) return Err.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input.');

    const { email } = parsed.data;
    const client = getSupabaseClient();

    const { data: user } = await client
      .from('users').select('id, email').eq('email', email).limit(1).single();

    if (!user) return ok(SAFE_RESPONSE); // silent

    const resetToken = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await client.from('password_reset_tokens').insert({
      user_id: user.id,
      token: resetToken,
      expires_at: expiresAt.toISOString(),
    });

    const locale = request.headers.get('accept-language')?.split(',')[0]?.split('-')[0] ?? 'en';
    await sendPasswordResetEmail(user.email, resetToken, locale);

    return ok(SAFE_RESPONSE);
  } catch (error) {
    console.error('[Forgot Password] Error:', error);
    return Err.internal();
  }
}
