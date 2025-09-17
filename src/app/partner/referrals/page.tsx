import { Suspense } from 'react';
import { createServiceClient } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import ReferralDashboard from '@/components/referrals/ReferralDashboard';

export default async function PartnerReferralsPage() {
  const supabase = createServiceClient();
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/auth/login?redirectTo=/partner/referrals');
  }

  // Check if user has partner role
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || (userProfile?.role !== 'partner' && userProfile?.role !== 'admin')) {
    redirect('/unauthorized');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense 
        fallback={
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
              ))}
            </div>
            <div className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
        }
      >
        <ReferralDashboard userId={user.id} />
      </Suspense>
    </div>
  );
}
