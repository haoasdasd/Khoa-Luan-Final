/**
 * router/GuestRoute.tsx
 * Redirects already-authenticated users away from /auth.
 */
import type React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth }  from '@/context/AuthContext'
import { ROUTES }   from '@/config/routes.config'

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return null; // Đợi load xong hoàn toàn mới làm việc
  if (user) return <Navigate to={ROUTES.FEED} replace />;
  return <>{children}</>;
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-bg)' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) return <Navigate to={ROUTES.AUTH} replace />;
  return <>{children}</>;
}

