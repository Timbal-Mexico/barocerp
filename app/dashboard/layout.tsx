'use client';

import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/dashboard/sidebar';
import { MobileSidebar } from '@/components/dashboard/mobile-sidebar';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const ERP_NAME = 'ERPCommerce';
const ERP_VERSION = 'v0.1.0';
const ERP_RELEASE_YEAR = '2026';
const ERP_LAST_UPDATE = '2026-01-17';

type PresenceStatus = 'online' | 'away' | 'offline';

function getPresenceLabel(status: PresenceStatus) {
  if (status === 'online') return 'Conectado';
  if (status === 'away') return 'Ausente';
  return 'Desconectado';
}

function getPresenceColor(status: PresenceStatus) {
  if (status === 'online') return 'bg-emerald-500';
  if (status === 'away') return 'bg-amber-400';
  return 'bg-slate-400';
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, profile } = useAuth();
  const router = useRouter();
  const [presenceStatus, setPresenceStatus] = useState<PresenceStatus>('online');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('erp-presence-status') : null;
    if (stored === 'online' || stored === 'away' || stored === 'offline') {
      setPresenceStatus(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('erp-presence-status', presenceStatus);
    }
  }, [presenceStatus]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const displayName = profile?.name ? `${profile.name} ${profile.lastname}` : user.email;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <div className="hidden md:flex h-full">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="md:hidden p-4 border-b dark:border-slate-800 flex items-center justify-between gap-4 bg-white dark:bg-slate-950">
          <div className="flex items-center gap-4">
            <MobileSidebar />
            <span className="font-bold text-lg">{ERP_NAME}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden xs:inline text-xs text-slate-500 dark:text-slate-400">
              {user.email}
            </span>
            <button
              type="button"
              className="flex items-center gap-1 rounded-full border px-2 py-1 text-xs"
              onClick={() =>
                setPresenceStatus((prev) =>
                  prev === 'online' ? 'away' : prev === 'away' ? 'offline' : 'online'
                )
              }
            >
              <span className={`h-2.5 w-2.5 rounded-full ${getPresenceColor(presenceStatus)}`} />
              <span>{getPresenceLabel(presenceStatus)}</span>
            </button>
          </div>
        </div>
        <header className="hidden md:flex items-center justify-between px-8 py-4 border-b bg-white dark:bg-slate-950 dark:border-slate-800">
          <div className="font-semibold text-lg">{ERP_NAME}</div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              <div className="font-medium text-slate-900 dark:text-slate-50">
                {displayName}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Estado
              </span>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                onClick={() =>
                  setPresenceStatus((prev) =>
                    prev === 'online' ? 'away' : prev === 'away' ? 'offline' : 'online'
                  )
                }
              >
                <span className={`h-2.5 w-2.5 rounded-full ${getPresenceColor(presenceStatus)}`} />
                <span>{getPresenceLabel(presenceStatus)}</span>
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-8">{children}</div>
        </main>
        <footer className="border-t bg-white/80 backdrop-blur-sm dark:bg-slate-950/80 dark:border-slate-800 px-4 md:px-8 py-3 text-xs text-slate-500 dark:text-slate-400 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{ERP_NAME}</span>
            <span>{ERP_VERSION}</span>
            <span className="hidden md:inline">·</span>
            <span>
              © {ERP_RELEASE_YEAR} Todos los derechos reservados
            </span>
          </div>
          <div className="flex items-center gap-2 md:justify-end">
            <span>Última actualización: {ERP_LAST_UPDATE}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
