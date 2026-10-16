'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  GraduationCap, 
  LayoutDashboard, 
  BookOpen, 
  FileSpreadsheet, 
  CalendarDays, 
  CreditCard, 
  Library, 
  FileText,
  UserCheck,
  LogOut,
  X,
  Music,
  MessageSquare,
  Bell
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const studentLinks: NavItem[] = [
  { title: 'Dashboard Overview', href: '/student', icon: LayoutDashboard },
  { title: 'My Course Registry', href: '/student/courses', icon: BookOpen },
  { title: 'Continuous Assessments', href: '/student/assignments', icon: FileText },
  { title: 'Grades & Transcript', href: '/student/grades', icon: FileSpreadsheet },
  { title: 'Timetable & Sessions', href: '/student/schedule', icon: CalendarDays },
  { title: 'Financials & Invoices', href: '/student/billing', icon: CreditCard },
  { title: 'Digital Library Node', href: '/book-library', icon: Library },
  { title: 'Elections & Guild', href: '/student/guild', icon: UserCheck },
   { title: 'Profile Settings', href: '/student/profile', icon: UserCheck },
    { title: 'Auddo Library', href: '/student/library', icon: Music },
  { title: 'Messages', href: '/student/messages', icon: MessageSquare },
  { title: 'Notifications', href: '/student/notifications', icon: Bell },
];

export default function StudentSidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile structural overlay blocker background backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 z-40 bg-red-700 backdrop-blur-sm transition-opacity duration-300 md:hidden"
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 flex flex-col shrink-0  bg-red-700 transition-all duration-300 ease-in-out
        md:sticky md:z-30 h-screen overflow-hidden
        ${isOpen 
          ? 'w-64 translate-x-0' 
          : '-translate-x-full md:translate-x-0 md:w-20 lg:w-64'
        }
      `}>
        {/* Brand Identity Frame Header */}
        <div className="flex h-16 items-center justify-between px-4 lg:px-6  shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-900 text-amber-500 shadow-md shadow-blue-900/20 border border-blue-800">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className={`flex flex-col transition-all duration-200 origin-left ${!isOpen ? 'md:scale-0 md:opacity-0 lg:scale-100 lg:opacity-100' : 'scale-100 ' + 'opacity-100'}`}>
              <span className="font-black text-sm leading-tight text-white tracking-wider uppercase">EduPortal</span>
              <span className="text-[9px] font-black tracking-widest text-amber-500 uppercase mt-0.5">Campus Workspace</span>
            </div>
          </div>

          {/* Manual Mobile Close Action Button Trigger */}
          <button 
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-900 hover:text-white transition-colors md:hidden border border-slate-800"
            aria-label="Close layout navigation drawers"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Primary Links Map Dashboard Stream Panel navigation (No internal scrolling) */}
        <nav className="flex-1 space-y-1 px-3 py-6 overflow-hidden">
          {studentLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onClose()} 
                className={`group flex items-center gap-3 rounded-xl px-3.5 py-3 text-xs tracking-wide capitalize transition-all duration-200 relative ${
                  isActive
                    ? 'bg-blue-900 text-white shadow-lg shadow-blue-900/20 border border-blue-800/60'
                    : 'text-white hover:bg-slate-900/80'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 transition-colors duration-200 ${isActive ? 'text-amber-500' : 'text-slate-400 group-hover:text-amber-500'}`} />
                <span className={`transition-all duration-200 whitespace-nowrap truncate ${!isOpen ? 'md:opacity-0 lg:opacity-100 md:w-0 lg:w-auto' : 'opacity-100'}`}>
                  {item.title}
                </span>

                {/* Tooltip hint overlays on compressed screen structures */}
                {!isOpen && (
                  <div className="absolute left-full ml-4 hidden rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-[10px] capitalize tracking-wider text-white shadow-xl md:group-hover:block lg:hidden z-50 whitespace-nowrap">
                    {item.title}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar System Signout Anchor Actions Block */}
        <div className="p-3 shrink-0">
          <button className="group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-xs font-black tracking-wide uppercase text-white hover:bg-red-950/40 hover:text-red-200 transition-all duration-200 relative border border-transparent hover:border-red-900/30">
            <LogOut className="h-4 w-4 text-red-500 shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span className={`transition-all duration-200 whitespace-nowrap truncate ${!isOpen ? 'md:opacity-0 lg:opacity-100 md:w-0 lg:w-auto' : 'opacity-100'}`}>
              Log Out Session
            </span>
            
            {!isOpen && (
              <div className="absolute left-full ml-4 hidden rounded-xl bg-red-600 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white shadow-xl md:group-hover:block lg:hidden z-50 whitespace-nowrap">
                Terminate Authentication
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}