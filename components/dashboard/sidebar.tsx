'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  ShoppingCart,
  Users,
  Package,
  Target,
  LogOut,
  LayoutDashboard,
  Settings,
  User,
  UserCog,
  ChevronLeft,
  ChevronRight,
  FileStack,
  FileText,
  MessageCircle,
  History as HistoryIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const mainNavigation = [
  { name: 'Overview', href: '/dashboard/overview', icon: LayoutDashboard },
  { name: 'Ventas', href: '/dashboard/sales', icon: ShoppingCart },
  { name: 'Leads (CRM)', href: '/dashboard/leads', icon: Users },
  { name: 'Inventario', href: '/dashboard/inventory', icon: Package },
  { name: 'Objetivos', href: '/dashboard/goals', icon: Target },
  { name: 'Archivos', href: '/dashboard/files', icon: FileStack },
  { name: 'Facturas', href: '/dashboard/invoices', icon: FileText },
  { name: 'Historial', href: '/dashboard/audit-logs', icon: HistoryIcon },
  { name: 'Tickets', href: '/dashboard/tickets', icon: MessageCircle },
  { name: 'Usuarios', href: '/dashboard/users', icon: UserCog },
];

const bottomNavigation = [
  { name: 'Mi Perfil', href: '/dashboard/profile', icon: User },
  { name: 'Configuración', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { signOut, user, profile } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const displayName = profile?.name ? `${profile.name} ${profile.lastname}` : user?.email;

  return (
    <TooltipProvider>
      <div className={cn('flex h-full flex-col bg-slate-900 text-white transition-all', collapsed ? 'w-16' : 'w-64')}>
        <div className="flex h-16 items-center justify-between gap-2 border-b border-slate-800 px-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            {!collapsed && <span className="text-xl font-bold">ERP-Commerce</span>}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-300 hover:bg-slate-800 hover:text-white"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-4">
          {mainNavigation.map((item) => {
            const isActive = pathname === item.href;
            const content = (
              <Link
                key={item.name}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <item.icon className="h-5 w-5" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
            return collapsed ? (
              <Tooltip key={item.name}>
                <TooltipTrigger asChild>{content}</TooltipTrigger>
                <TooltipContent side="right">{item.name}</TooltipContent>
              </Tooltip>
            ) : (
              content
            );
          })}
        </nav>

        <div className="border-t border-slate-800 px-2 py-3 space-y-2">
          {bottomNavigation.map((item) => {
            const isActive = pathname === item.href;
            const content = (
              <Link
                key={item.name}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <item.icon className="h-5 w-5" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
            return collapsed ? (
              <Tooltip key={item.name}>
                <TooltipTrigger asChild>{content}</TooltipTrigger>
                <TooltipContent side="right">{item.name}</TooltipContent>
              </Tooltip>
            ) : (
              content
            );
          })}

          <div className={cn('mt-2 rounded-lg px-3 py-2 text-xs text-slate-400', collapsed ? 'px-1' : '')}>
            {!collapsed && <div className="mb-1 truncate">{displayName}</div>}
          </div>

          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start text-slate-300 hover:bg-slate-800 hover:text-white',
              collapsed && 'justify-center px-0'
            )}
            onClick={() => signOut()}
          >
            <LogOut className={cn('h-4 w-4', !collapsed && 'mr-2')} />
            {!collapsed && <span>Cerrar sesión</span>}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
