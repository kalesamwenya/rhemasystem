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
  X,
  Music,
  MessageSquare,
  Bell,
  Clock3,
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
  { title: 'Home', href: '/student', icon: LayoutDashboard },
  { title: 'My courses', href: '/student/courses', icon: BookOpen },
  { title: 'Assignments', href: '/student/assignments', icon: FileText },
  { title: 'Grades', href: '/student/grades', icon: FileSpreadsheet },
  { title: 'Schedule', href: '/student/schedule', icon: CalendarDays },
  { title: 'Church service hours', href: '/student/service-hours', icon: Clock3 },
  { title: 'Billing', href: '/student/billing', icon: CreditCard },
  { title: 'Library', href: '/book-library', icon: Library },
  { title: 'Guild', href: '/student/guild', icon: UserCheck },
  { title: 'Profile', href: '/student/profile', icon: UserCheck },
  { title: 'Audio library', href: '/student/library', icon: Music },
  { title: 'Messages', href: '/student/messages', icon: MessageSquare },
  { title: 'Notifications', href: '/student/notifications', icon: Bell },
];

export default function StudentSidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-sm transition-opacity duration-300 md:hidden"
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-[60] flex shrink-0 flex-col border-r border-white/15 bg-rhema-red text-white transition-all duration-300 ease-in-out
        md:sticky md:z-30 h-screen overflow-hidden
        ${isOpen 
          ? 'w-64 translate-x-0' 
          : '-translate-x-full md:translate-x-0 md:w-20 lg:w-64'
        }
      `}>
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/15 px-4 lg:px-5">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-rhema-red shadow-sm">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className={`flex origin-left flex-col transition-all duration-200 ${!isOpen ? 'md:scale-0 md:opacity-0 lg:scale-100 lg:opacity-100' : 'scale-100 opacity-100'}`}>
              <span className="text-sm font-black leading-tight tracking-tight text-white">Rhema</span>
              <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-white/70">Student portal</span>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white md:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav aria-label="Student navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {studentLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onClose()} 
                aria-current={isActive ? 'page' : undefined}
                className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-white text-rhema-red'
                    : 'text-white/90 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 transition-colors duration-200 ${isActive ? 'text-rhema-red' : 'text-white/70 group-hover:text-rhema-accent'}`} />
                <span className={`transition-all duration-200 whitespace-nowrap truncate ${!isOpen ? 'md:opacity-0 lg:opacity-100 md:w-0 lg:w-auto' : 'opacity-100'}`}>
                  {item.title}
                </span>

                {!isOpen && (
                  <div className="absolute left-full z-50 ml-4 hidden whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-lg md:group-hover:block lg:hidden">
                    {item.title}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-white/15 p-4">
          <div className={`flex items-center gap-3 rounded-xl bg-white/10 p-3 ${!isOpen ? 'md:justify-center md:px-1 lg:justify-start lg:px-3' : ''}`}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-rhema-red shadow-sm"><GraduationCap className="h-4 w-4" /></span>
            <span className={`min-w-0 ${!isOpen ? 'md:hidden lg:block' : ''}`}>
              <span className="block truncate text-[11px] font-bold text-white">Learning workspace</span>
              <span className="mt-0.5 block truncate text-[10px] text-white/70">Your studies, in one place</span>
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}