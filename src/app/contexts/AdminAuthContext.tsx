import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { logoutAdmin, peekAdminEmail, verifyAdminSession } from '../utils/auth';

type AdminAuthContextValue = {
  adminEmail: string | null;
  checking: boolean;
  refresh: () => Promise<void>;
  signOut: () => void;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const refresh = useCallback(async () => {
    setChecking(true);
    const ok = await verifyAdminSession();
    setAdminEmail(ok ? peekAdminEmail() : null);
    setChecking(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signOut = useCallback(() => {
    logoutAdmin();
    setAdminEmail(null);
  }, []);

  const value = useMemo(
    () => ({ adminEmail, checking, refresh, signOut }),
    [adminEmail, checking, refresh, signOut]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return ctx;
}
