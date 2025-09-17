import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const redirectTo = requestUrl.searchParams.get('redirectTo') || '/dashboard';

  if (code) {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Auth callback error:', error);
        return NextResponse.redirect(new URL('/auth/login?error=callback_failed', requestUrl.origin));
      }

      if (data.session) {
        // Check if user profile exists in database
        const { data: existingProfile } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.session.user.id)
          .single();

        // Create user profile if it doesn't exist
        if (!existingProfile) {
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: data.session.user.id,
              email: data.session.user.email!,
              name: data.session.user.user_metadata?.full_name || 
                    data.session.user.user_metadata?.name || 
                    data.session.user.email?.split('@')[0] || 
                    null,
              avatar_url: data.session.user.user_metadata?.avatar_url || null,
              role: 'buyer', // Default role
            });

          if (insertError) {
            console.error('Error creating user profile:', insertError);
            // Continue anyway - the user can still use the app
          }
        }

        // Successful authentication, redirect to intended destination
        return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
      }
    } catch (error) {
      console.error('Unexpected auth callback error:', error);
    }
  }

  // If we get here, something went wrong
  return NextResponse.redirect(new URL('/auth/login?error=callback_failed', requestUrl.origin));
}
