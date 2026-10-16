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
  onMouseDownResize: (e: React.MouseEvent) => void;
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
  onMouseDownResize,
  isDragging,
  onSignOut,
}: LecturerSidebarProps) {
  const pathname = usePathname();

  return (
    <aside 
      style={{ width: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${sidebarWidth}px` : undefined }}
      className={`
        fixed inset-y-0 left-0 z-50 flex flex-col shrink-0 bg-slate-950 text-white border-r border-slate-900 transition-transform duration-300 ease-in-out
        md:sticky md:z-30 md:h-screen md:translate-x-0
        ${isMobileOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full'}
      `}
    >
      {/* Faculty Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-900 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-900 text-amber-500 border border-blue-800/60 shadow-inner">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="flex flex-col truncate">
            <span className="font-black text-xs tracking-wider uppercase text-white leading-tight">EduPortal</span>
            <span className="text-[9px] font-mono font-bold tracking-widest text-slate-500 uppercase mt-0.5">Faculty Terminal</span>
          </div>
        </div>

        {/* Mobile Drawer Close */}
        <button 
          onClick={() => setIsMobileOpen(false)}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-900 hover:text-white transition-colors md:hidden border border-slate-900"
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
                  ? 'bg-blue-900 text-white border border-blue-800/50 shadow-md shadow-blue-950/20'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Icon className={`h-4 w-4 shrink-0 transition-colors duration-150 ${isActive ? 'text-amber-500' : 'text-slate-500 group-hover:text-amber-400'}`} />
                <span className="truncate">{item.title}</span>
              </div>

              {item.badge && (
                <span className={`text-[9px] font-mono font-black tracking-wider uppercase px-2 py-0.5 rounded-md ${
                  isActive ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Account Termination Footer */}
      <div className="shrink-0 p-3 border-t border-slate-900">
        <button onClick={onSignOut} className="group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold tracking-wide uppercase text-slate-400 hover:bg-slate-900 hover:text-rose-400 transition-all duration-150">
          <LogOut className="h-4 w-4 text-slate-500 transition-transform duration-150 group-hover:-translate-x-0.5 group-hover:text-rose-400" />
          <span className="truncate">Exit Portal</span>
        </button>
      </div>

      {/* Desktop Column Drag Width Resizer */}
      <div 
        onMouseDown={onMouseDownResize}
        className={`
          hidden md:block absolute top-0 right-0 bottom-0 w-1 cursor-col-resize transition-all group z-50
          ${isDragging ? 'bg-blue-600 w-1.5' : 'hover:bg-slate-800'}
        `}
      />
    </aside>
  );
}