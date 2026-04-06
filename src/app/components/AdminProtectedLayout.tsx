import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router';
import { verifyAdminSession } from '../utils/auth';
import { useAdminAuth } from '../contexts/AdminAuthContext';

export function AdminProtectedLayout() {
  const { refresh } = useAdminAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    verifyAdminSession().then(async (ok) => {
      if (cancelled) return;
      setAllowed(ok);
      await refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  if (allowed === null) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-2 text-gray-600">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" aria-hidden />
        <p className="text-sm">Verifying admin access…</p>
      </div>
    );
  }

  if (!allowed) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}
