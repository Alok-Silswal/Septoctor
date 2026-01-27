'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

/**
 * Wrapper component to handle role-based redirects after login
 * Usage: Wrap this around your main app content or add to your login flow
 */
export function AuthRedirectWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { userProfile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    
    if (userProfile) {
      // User is logged in, redirect to their role-specific dashboard
      const roleRoutes = {
        'SUPER_ADMIN': '/dashboard/national',
        'STATE_ADMIN': '/dashboard/state',
        'HOSPITAL_ADMIN': '/dashboard/hospital',
        'CLINICIAN': '/dashboard/clinician'
      };
      
      const route = roleRoutes[userProfile.role as keyof typeof roleRoutes];
      if (route && typeof window !== 'undefined' && !window.location.pathname.startsWith('/dashboard')) {
        router.push(route);
      }
    }
  }, [userProfile, loading, router]);

  return <>{children}</>;
}
