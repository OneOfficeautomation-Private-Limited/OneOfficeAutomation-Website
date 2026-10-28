import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { admin } from './api';
import type { AdminUser } from './api';

interface Ctx { me: AdminUser | null; loading: boolean; setMe: (a: AdminUser | null) => void; logout: () => Promise<void> }
const AdminCtx = createContext<Ctx | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    admin.me().then((r) => setMe(r.admin)).catch(() => setMe(null)).finally(() => setLoading(false));
  }, []);
  const logout = useCallback(async () => {
    await admin.logout().catch(() => undefined);
    setMe(null);
  }, []);
  const value = useMemo(() => ({ me, loading, setMe, logout }), [me, loading, logout]);
  return <AdminCtx.Provider value={value}>{children}</AdminCtx.Provider>;
}

export function useAdmin(): Ctx {
  const v = useContext(AdminCtx);
  if (!v) throw new Error('useAdmin must be used inside <AdminProvider>');
  return v;
}
