'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BarChart3,
  Bot,
  BookOpen,
  CalendarDays,
  CalendarHeart,
  ChevronDown,
  ClipboardCheck,
  CreditCard,
  CheckSquare,
  Banknote,
  FileSpreadsheet,
  Gauge,
  GraduationCap,
  LayoutDashboard,
  Library,
  LifeBuoy,
  LogOut,
  MessageSquareText,
  Share2,
  ShoppingBag,
  Sliders,
  Tag,
  Users,
  UserCog,
  Clock3,
  X,
} from 'lucide-react';
import { canAccessAdminModule, type AdminModule } from '@/lib/admin-access';

interface AdminProfile {
  name: string;
  email: string;
  admin_role: string;
  department: string;
}

interface AdminSidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  sidebarWidth: number;
  onMouseDownResize: (e: React.MouseEvent) => void;
  isDragging: boolean;
  admin: AdminProfile;
  onSignOut: () => Promise<void>;
}

interface NavItem {
  title: string;
  href: string;
  module: AdminModule;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { title: 'Dashboard', href: '/admin', module: 'dashboard', icon: LayoutDashboard },
      { title: 'Tasks & calendar', href: '/admin/tasks', module: 'tasks', icon: CheckSquare },
      { title: 'Statistics', href: '/admin/statistics', module: 'statistics', icon: BarChart3 },
      { title: 'Analysis', href: '/admin/analysis', module: 'analysis', icon: Gauge },
    ],
  },
  {
    title: 'Admissions & people',
    items: [
      { title: 'Admissions', href: '/admin/admissions', module: 'admissions', icon: ClipboardCheck },
      { title: 'Student Directory', href: '/admin/students', module: 'students', icon: Users },
      { title: 'Staff & Lecturers', href: '/admin/people', module: 'people', icon: UserCog },
    ],
  },
  {
    title: 'Academics & student affairs',
    items: [
      { title: 'Academic Registry', href: '/admin/courses', module: 'academics', icon: BookOpen },
      { title: 'Assessment Manager', href: '/admin/assessments', module: 'academics', icon: FileSpreadsheet },
      { title: 'Student Affairs', href: '/admin/student-affairs', module: 'student-affairs', icon: Users },
      { title: 'Church Service Hours', href: '/admin/student-affairs/service-hours', module: 'student-affairs', icon: Clock3 },
      { title: 'Class Timetabling', href: '/admin/schedule', module: 'schedule', icon: CalendarDays },
      { title: 'Resource Hub', href: '/admin/library', module: 'library', icon: Library },
    ],
  },
  {
    title: 'Communications & website',
    items: [
      { title: 'Communications', href: '/admin/communications', module: 'communications', icon: MessageSquareText, badge: 'Live' },
      { title: 'Messages & alerts', href: '/admin/messages', module: 'communications', icon: MessageSquareText },
      { title: 'Website Chatbot', href: '/admin/chatbot', module: 'chatbot', icon: Bot },
      { title: 'Website contact messages', href: '/admin/contact-messages', module: 'contact-messages', icon: MessageSquareText },
      { title: 'Website Content', href: '/admin/site-content', module: 'social-media', icon: BookOpen },
      { title: 'Social Media & Content', href: '/admin/social-media', module: 'social-media', icon: Share2 },
      { title: 'Help Desk', href: '/admin/help-desk', module: 'help-desk', icon: LifeBuoy },
    ],
  },
  {
    title: 'Events & commerce',
    items: [
      { title: 'Events Management', href: '/admin/events', module: 'events', icon: CalendarHeart },
      { title: 'Store Management', href: '/admin/store', module: 'store', icon: ShoppingBag },
      { title: 'Store Promotions', href: '/admin/store/promotions', module: 'store', icon: Tag },
    ],
  },
  {
    title: 'Finance',
    items: [
      { title: 'Finance & Payments', href: '/admin/payments', module: 'finance', icon: CreditCard, badge: 'Review' },
      { title: 'Financial Reports', href: '/admin/financials', module: 'finance', icon: CreditCard },
      { title: 'Budgets', href: '/admin/budgets', module: 'finance', icon: FileSpreadsheet },
      { title: 'Expenditures', href: '/admin/expenditures', module: 'finance', icon: Banknote },
    ],
  },
  {
    title: 'System administration',
    items: [
      { title: 'Performance Logs', href: '/admin/performance-logs', module: 'performance', icon: Activity },
      { title: 'System Settings', href: '/admin/settings', module: 'settings', icon: Sliders },
    ],
  },
];

function getInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase() || 'AD';
}

function formatRole(role: string): string {
  return role.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function AdminSidebar({
  isMobileOpen,
  setIsMobileOpen,
  sidebarWidth,
  onMouseDownResize,
  isDragging,
  admin,
  onSignOut,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const activeGroup = navigationGroups.find((group) => group.items.some((item) => item.href === pathname || (item.href !== '/admin' && pathname.startsWith(`${item.href}/`))));
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');

  const signOut = async () => {
    setSigningOut(true);
    setSignOutError('');
    try {
      await onSignOut();
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : 'Unable to end this session.');
      setSigningOut(false);
    }
  };

  return (
    <aside
      style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
      className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col overflow-hidden bg-red-700 text-white transition-transform duration-300 ease-in-out md:z-30 md:translate-x-0 md:w-[var(--sidebar-width)] ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="flex h-16 shrink-0 items-center justify-between bg-red-700 px-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-800/60 bg-blue-900 text-amber-500"><GraduationCap className="h-5 w-5" /></div>
          <div className="flex flex-col truncate"><span className="text-xs font-black uppercase leading-tight tracking-wider text-white">EduPortal</span><span className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-slate-300">Admin Workspace</span></div>
        </div>
        <button type="button" onClick={() => setIsMobileOpen(false)} className="rounded-lg border border-slate-800/60 p-1.5 text-slate-200 transition-colors hover:bg-red-900 hover:text-white md:hidden" aria-label="Close admin navigation"><X className="h-4 w-4" /></button>
      </div>

      <nav className="scrollbar-none flex-1 space-y-2 overflow-y-auto px-3 py-4" aria-label="Administrator navigation" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        {navigationGroups.map((group) => {
          const visibleItems = group.items.filter((item) => canAccessAdminModule(admin.admin_role, admin.department, item.module));
          if (!visibleItems.length) return null;
          const isCurrentGroup = activeGroup?.title === group.title;
          const expanded = expandedGroups[group.title] ?? isCurrentGroup;
          return (
            <section key={group.title} className="rounded-xl">
              <button type="button" aria-expanded={expanded} onClick={() => setExpandedGroups((previous) => ({ ...previous, [group.title]: !expanded }))} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[10px] font-black uppercase tracking-[0.14em] text-red-100 hover:bg-red-900/50">
                <span>{group.title}</span><ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>
              {expanded && <div className="mt-1 space-y-1">{visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(`${item.href}/`));
                return <Link key={item.href} href={item.href} onClick={() => setIsMobileOpen(false)} aria-current={isActive ? 'page' : undefined} className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold tracking-wide transition-all ${isActive ? 'border border-blue-800/50 bg-blue-900 text-white' : 'text-white hover:bg-red-900/60'}`}>
                  <span className="flex min-w-0 items-center gap-3"><Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-white group-hover:text-amber-300'}`} /><span className="truncate">{item.title}</span></span>
                  {item.badge && <span className={`ml-2 rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${isActive ? 'bg-amber-500 text-white' : 'border border-blue-900/40 bg-blue-950 text-white'}`}>{item.badge}</span>}
                </Link>;
              })}</div>}
            </section>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-red-600/60 p-3">
        {signOutError && <p role="alert" className="mb-2 rounded-lg bg-red-950/40 px-3 py-2 text-[11px] text-red-100">{signOutError}</p>}
        <div className="mb-2 flex items-center gap-3 rounded-xl bg-red-950/25 px-3 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-amber-300/50 bg-blue-950 text-sm font-black text-amber-300" aria-label={`${admin.name} avatar`}>{getInitials(admin.name)}</div>
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-black text-white">{admin.name}</p><p className="mt-0.5 truncate text-[10px] font-semibold capitalize text-red-100">{formatRole(admin.admin_role)}</p><p className="truncate text-[9px] text-red-200">{admin.department}</p></div>
        </div>
        <button type="button" onClick={() => void signOut()} disabled={signingOut} className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition-all hover:border-red-900/20 hover:bg-red-950/40 hover:text-red-100 disabled:opacity-60"><LogOut className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5" /><span className="truncate">{signingOut ? 'Signing out...' : 'Sign out'}</span></button>
      </div>

      <div onMouseDown={onMouseDownResize} className={`absolute bottom-0 right-0 top-0 z-50 hidden w-1 cursor-col-resize transition-all hover:bg-slate-800 md:block ${isDragging ? 'w-1.5 bg-blue-600' : ''}`} />
    </aside>
  );
}
