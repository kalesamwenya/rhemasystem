'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  Bug,
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
  Boxes,
  ClipboardList,
  FileSpreadsheet,
  Gauge,
  GraduationCap,
  Globe2,
  Handshake,
  LayoutDashboard,
  Library,
  LifeBuoy,
  LogOut,
  MessageSquareText,
  Share2,
  ShieldCheck,
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
  isDesktopOpen: boolean;
  closeSidebar: () => void;
  closeMobileSidebar: () => void;
  sidebarWidth: number;
  onResizePointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onResizeKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
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
      { title: 'Shared reports', href: '/admin/reports', module: 'reports', icon: BarChart3 },
      { title: 'Tasks & calendar', href: '/admin/tasks', module: 'tasks', icon: CheckSquare },
      { title: 'Statistics', href: '/admin/statistics', module: 'statistics', icon: BarChart3 },
      { title: 'Public website', href: '/admin/website-statistics', module: 'website-statistics', icon: Globe2 },
      { title: 'Analysis', href: '/admin/analysis', module: 'analysis', icon: Gauge },
    ],
  },
  {
    title: 'People',
    items: [
      { title: 'Admissions', href: '/admin/admissions', module: 'admissions', icon: ClipboardCheck },
      { title: 'Partnership applications', href: '/admin/partner-applications', module: 'partnerships', icon: Handshake },
      { title: 'Student Directory', href: '/admin/students', module: 'students', icon: Users },
      { title: 'Staff & Lecturers', href: '/admin/people', module: 'people', icon: UserCog },
    ],
  },
  {
    title: 'Student affairs',
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
    title: 'Communications',
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
      { title: 'Budgets', href: '/admin/budgets', module: 'budgets', icon: FileSpreadsheet },
      { title: 'Expenditures', href: '/admin/expenditures', module: 'finance', icon: Banknote },
      { title: 'School assets', href: '/admin/assets', module: 'assets', icon: Boxes },
      { title: 'Activity access requests', href: '/admin/activity-requests', module: 'activity-requests', icon: ClipboardList },
    ],
  },
  {
    title: 'Systems',
    items: [
      { title: 'Staff access', href: '/admin/staff-access', module: 'staff-access', icon: ShieldCheck },
      { title: 'Activity Logs', href: '/admin/performance-logs', module: 'performance', icon: Activity },
      { title: 'Error Logs', href: '/admin/error-logs', module: 'performance', icon: Bug },
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
  isDesktopOpen,
  closeSidebar,
  closeMobileSidebar,
  sidebarWidth,
  onResizePointerDown,
  onResizeKeyDown,
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
      id="admin-navigation"
      style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
      className={`fixed inset-y-0 left-0 z-50 flex h-screen w-[min(85vw,320px)] shrink-0 flex-col overflow-hidden border-r border-white/15 bg-rhema-red text-white transition-transform duration-300 ease-in-out md:z-30 md:w-[var(--sidebar-width)] ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} ${isDesktopOpen ? 'md:translate-x-0' : 'md:-translate-x-full'}`}
    >
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/15 bg-rhema-red px-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-rhema-red"><GraduationCap className="h-5 w-5" /></div>
          <div className="flex flex-col truncate"><span className="text-xs font-black uppercase leading-tight tracking-wider text-white">Rhema</span><span className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-white/70">Admin workspace</span></div>
        </div>
        <button type="button" onClick={closeSidebar} className="rounded-lg border border-white/20 p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white md:hidden" aria-label="Close admin navigation"><X className="h-4 w-4" /></button>
      </div>

      <div className="mb-2 flex flex-col items-center gap-3 rounded-xl bg-white/10 px-3 py-3 text-center">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-sm font-black text-rhema-red" aria-label={`${admin.name} avatar`}>{getInitials(admin.name)}</div>
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-black text-white">{admin.name}</p><p className="mt-0.5 truncate text-[10px] font-semibold capitalize text-rhema-accent">{formatRole(admin.admin_role)}</p><p className="truncate text-[9px] text-white/70">{admin.department}</p></div>
      </div>

      <nav className="scrollbar-none flex-1 space-y-2 overflow-y-auto px-3 py-4" aria-label="Administrator navigation" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        {navigationGroups.map((group) => {
          const visibleItems = group.items.filter((item) => canAccessAdminModule(admin.admin_role, admin.department, item.module));
          if (!visibleItems.length) return null;
          const isCurrentGroup = activeGroup?.title === group.title;
          const expanded = expandedGroups[group.title] ?? isCurrentGroup;
          return (
            <section key={group.title} className="rounded-xl">
              <button type="button" aria-expanded={expanded} onClick={() => setExpandedGroups((previous) => ({ ...previous, [group.title]: !expanded }))} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[10px] font-black uppercase tracking-[0.14em] text-white/70 transition hover:bg-white/10 hover:text-white">
                <span>{group.title}</span><ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>
              {expanded && <div className="mt-1 space-y-1">{visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(`${item.href}/`));
                return <Link key={item.href} href={item.href} onClick={closeMobileSidebar} aria-current={isActive ? 'page' : undefined} className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold tracking-wide transition-all ${isActive ? 'bg-white text-rhema-red shadow-sm' : 'text-white/90 hover:bg-white/10 hover:text-white'}`}>
                  <span className="flex min-w-0 items-center gap-3"><Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-rhema-red' : 'text-white/70 group-hover:text-rhema-accent'}`} /><span className="truncate">{item.title}</span></span>
                  {item.badge && <span className={`ml-2 rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${isActive ? 'bg-rhema-red/10 text-rhema-red' : 'bg-white/15 text-rhema-accent'}`}>{item.badge}</span>}
                </Link>;
              })}</div>}
            </section>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-white/15 p-3">
        {signOutError && <p role="alert" className="mb-2 rounded-lg bg-white px-3 py-2 text-[11px] font-medium text-rhema-red">{signOutError}</p>}
        
         <button type="button" onClick={() => void signOut()} disabled={signingOut} className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-white/80 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white disabled:opacity-60"><LogOut className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5 group-hover:text-rhema-accent" /><span className="truncate">{signingOut ? 'Signing out...' : 'Sign out'}</span></button>
      </div>

      <div
        role="separator"
        aria-label="Resize administrator sidebar"
        aria-orientation="vertical"
        aria-valuemin={220}
        aria-valuemax={Math.max(220, Math.min(420, typeof window === 'undefined' ? 420 : window.innerWidth * 0.4, typeof window === 'undefined' ? 420 : window.innerWidth - 320))}
        aria-valuenow={sidebarWidth}
        tabIndex={0}
        onPointerDown={onResizePointerDown}
        onKeyDown={onResizeKeyDown}
        className={`absolute bottom-0 right-0 top-0 z-50 hidden w-2 touch-none cursor-col-resize transition-all hover:bg-rhema-accent/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rhema-accent md:block ${isDragging ? 'bg-rhema-accent/70' : ''}`}
      />
    </aside>
  );
}
