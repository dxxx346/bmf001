import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { email, password, action } = await request.json();
    const supabase = createServerClient();

    let result;

    switch (action) {
      case 'signup':
        result = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: 'buyer',
            },
          },
        });
        break;

      case 'signin':
        result = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        break;

      case 'signout':
        result = await supabase.auth.signOut();
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (result.error) {
      logError(result.error as Error, { action, email });
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }

    logger.info('Auth action completed', { action, email });
    return NextResponse.json({ data: result });
  } catch (error) {
    logError(error as Error, { action: 'auth' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
