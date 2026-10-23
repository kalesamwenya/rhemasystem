'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  GraduationCap, LayoutDashboard, Users, BookOpen, 
  FileSpreadsheet, ClipboardCheck, CalendarDays, Library, 
  Sliders, LogOut, X, MessageSquare
} from 'lucide-react';

interface LecturerSidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  sidebarWidth: number;
  onResizePointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onResizeKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  isDragging: boolean;
  onSignOut: () => void;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const lecturerLinks: NavItem[] = [
  { title: 'Overview Panel', href: '/lecturer', icon: LayoutDashboard },
  { title: 'Course Dashboard', href: '/lecturer/courses', icon: BookOpen },
  { title: 'Submissions Matrix', href: '/lecturer/submissions', icon: ClipboardCheck },
  { title: 'Class Rosters', href: '/lecturer/students', icon: Users },
  { title: 'Gradebook Ledgers', href: '/lecturer/grades', icon: FileSpreadsheet },
  { title: 'Session Timetable', href: '/lecturer/schedule', icon: CalendarDays },
  { title: 'Resource Manager', href: '/lecturer/resources', icon: Library },
  { title: 'Messages', href: '/lecturer/messages', icon: MessageSquare },
  { title: 'Profile Settings', href: '/lecturer/settings/profile', icon: Sliders },
];

export default function LecturerSidebar({ 
  isMobileOpen, 
  setIsMobileOpen, 
  sidebarWidth, 
  onResizePointerDown,
  onResizeKeyDown,
  isDragging,
  onSignOut,
}: LecturerSidebarProps) {
  const pathname = usePathname();

  return (
    <aside 
      className={`
        fixed inset-y-0 left-0 z-50 flex w-[min(85vw,320px)] flex-col shrink-0 bg-rhema-red text-white border-r border-white/15 transition-transform duration-300 ease-in-out
        md:sticky md:z-30 md:h-screen md:translate-x-0
        md:w-[var(--sidebar-width)] ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
    >
      {/* Faculty Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-white/15 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-rhema-red border border-white/60 shadow-inner">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="flex flex-col truncate">
            <span className="font-black text-xs tracking-wider uppercase text-white leading-tight">Rhema</span>
            <span className="text-[9px] font-mono font-bold tracking-widest text-white/70 uppercase mt-0.5">Faculty workspace</span>
          </div>
        </div>

        {/* Mobile Drawer Close */}
        <button 
          onClick={() => setIsMobileOpen(false)}
          className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white transition-colors md:hidden border border-white/20"
          aria-label="Close layout framework"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation Stack Links mapping */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto custom-scrollbar">
        {lecturerLinks.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href) && (item.href !== '/lecture' || pathname === '/lecture');
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileOpen(false)} 
              className={`group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold tracking-wide transition-all duration-150 ${
                isActive
                  ? 'bg-white text-rhema-red border border-white/50 shadow-md'
                    : 'text-white/90 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Icon className={`h-4 w-4 shrink-0 transition-colors duration-150 ${isActive ? 'text-rhema-red' : 'text-white/70 group-hover:text-rhema-accent'}`} />
                <span className="truncate">{item.title}</span>
              </div>

              {item.badge && (
                <span className={`text-[9px] font-mono font-black tracking-wider uppercase px-2 py-0.5 rounded-md ${
                  isActive ? 'bg-rhema-accent text-slate-950' : 'bg-white/10 text-white/80 border border-white/15'
                }`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Account Termination Footer */}
      <div className="shrink-0 p-3 border-t border-white/15">
        <button onClick={onSignOut} className="group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold tracking-wide uppercase text-white/80 hover:bg-white/10 hover:text-white transition-all duration-150">
          <LogOut className="h-4 w-4 text-white/70 transition-transform duration-150 group-hover:-translate-x-0.5 group-hover:text-rhema-accent" />
          <span className="truncate">Exit Portal</span>
        </button>
      </div>

      {/* Desktop Column Drag Width Resizer */}
      <div 
        role="separator"
        aria-label="Resize lecturer sidebar"
        aria-orientation="vertical"
        aria-valuemin={220}
        aria-valuemax={Math.max(220, Math.min(420, typeof window === 'undefined' ? 420 : window.innerWidth * 0.4, typeof window === 'undefined' ? 420 : window.innerWidth - 320))}
        aria-valuenow={sidebarWidth}
        tabIndex={0}
        onPointerDown={onResizePointerDown}
        onKeyDown={onResizeKeyDown}
        className={`
          hidden md:block absolute top-0 right-0 bottom-0 w-2 touch-none cursor-col-resize transition-all group z-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rhema-accent
          ${isDragging ? 'bg-rhema-accent w-1.5' : 'hover:bg-white/30'}
        `}
      />
    </aside>
  );
}