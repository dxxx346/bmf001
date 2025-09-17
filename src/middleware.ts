import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { Database, User, UserInsert } from '@/types/database';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  try {
    // Create Supabase client for middleware
    const supabase = createMiddlewareClient<Database>({ req: request, res: response });

    // Handle referral tracking
    if (request.nextUrl.searchParams.has('ref')) {
      const refCode = request.nextUrl.searchParams.get('ref');
      if (refCode) {
        response.cookies.set('ref_tracking', refCode, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30, // 30 days
        });
      }
    }

    // Get current session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Helper function to get user profile
    const getUserProfile = async (userId: string): Promise<User | null> => {
      const { data: profile, error } = await (supabase as any)
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error || !profile) {
        return null;
      }
      
      return profile as User;
    };

    // Protected routes configuration
    const protectedRoutes = {
      admin: ['/admin'],
      seller: ['/seller', '/dashboard/seller'],
      partner: ['/partner', '/dashboard/partner'],
      auth: ['/dashboard', '/profile', '/settings'],
    };

    const currentPath = request.nextUrl.pathname;

    // Check if current path requires authentication
    const requiresAuth = Object.values(protectedRoutes).some(routes =>
      routes.some(route => currentPath.startsWith(route))
    );

    // Redirect to login if authentication is required but user is not authenticated
    if (requiresAuth && !session) {
      const redirectUrl = new URL('/auth/login', request.url);
      redirectUrl.searchParams.set('redirectTo', currentPath);
      return NextResponse.redirect(redirectUrl);
    }

    // Role-based access control
    if (session?.user) {
      const profile = await getUserProfile(session.user.id);
      
      if (!profile) {
        // User exists in auth but not in database, redirect to profile setup
        if (currentPath !== '/auth/setup-profile') {
          return NextResponse.redirect(new URL('/auth/setup-profile', request.url));
        }
      } else {
        // Check admin routes
        if (protectedRoutes.admin.some(route => currentPath.startsWith(route))) {
          if (profile.role !== 'admin') {
            return NextResponse.redirect(new URL('/unauthorized', request.url));
          }
        }

        // Check seller routes
        if (protectedRoutes.seller.some(route => currentPath.startsWith(route))) {
          if (!['seller', 'admin'].includes(profile.role)) {
            return NextResponse.redirect(new URL('/unauthorized', request.url));
          }
        }

        // Check partner routes
        if (protectedRoutes.partner.some(route => currentPath.startsWith(route))) {
          if (!['partner', 'admin'].includes(profile.role)) {
            return NextResponse.redirect(new URL('/unauthorized', request.url));
          }
        }
      }
    }

    // Handle auth callback
    if (currentPath === '/auth/callback') {
      const code = request.nextUrl.searchParams.get('code');
      
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (!error && data.session) {
          // Check if user profile exists
          const profile = await getUserProfile(data.session.user.id);
          
          if (!profile) {
            // Create user profile
            const newUser: UserInsert = {
              id: data.session.user.id,
              email: data.session.user.email!,
              name: data.session.user.user_metadata?.name || null,
              avatar_url: data.session.user.user_metadata?.avatar_url || null,
              role: 'buyer', // default role
            };
            
            const { error: insertError } = await (supabase as any).from('users').insert(newUser);
            
            if (insertError) {
              console.error('Error creating user profile:', insertError);
            }
          }

          // Redirect to intended destination or dashboard
          const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/dashboard';
          return NextResponse.redirect(new URL(redirectTo, request.url));
        }
      }
    }

    // Redirect authenticated users away from auth pages
    if (session && ['/auth/login', '/auth/register', '/auth/forgot-password'].includes(currentPath)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};