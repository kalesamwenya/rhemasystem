"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Menu } from 'lucide-react';
import UserDropdown from './UserDropdown';
import CommunicationDropdown from '@/components/communications/CommunicationDropdown';

interface StudentTopbarProps {
  student: {
    name: string;
    studentId: string;
    email: string;
  };
  onMenuToggle: () => void;
  isSidebarOpen: boolean;
}

export default function StudentTopbar({ student, onMenuToggle, isSidebarOpen }: StudentTopbarProps) {
  const [activeDropdown, setActiveDropdown] = useState<'notifications' | 'messages' | 'user' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (type: 'notifications' | 'messages' | 'user') => {
    setActiveDropdown(prev => prev === type ? null : type);
  };

  return (
    <header ref={containerRef} className="relative z-50 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 px-3 shadow-sm shadow-slate-200/30 backdrop-blur-xl sm:px-5 lg:px-7">
      
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="rounded-xl border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus:outline-none"
          aria-label="Toggle navigation"
          aria-expanded={isSidebarOpen}
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">{student.name ? `Welcome, ${student.name.split(' ')[0]}` : 'Student portal'}</p>
          <p className="hidden text-[10px] text-slate-500 sm:block">Your learning space</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <CommunicationDropdown
          kind="notifications"
          isOpen={activeDropdown === 'notifications'} 
          onToggle={() => toggleDropdown('notifications')} 
          rolePath="/student"
        />

        <CommunicationDropdown
          kind="messages"
          isOpen={activeDropdown === 'messages'} 
          onToggle={() => toggleDropdown('messages')} 
          rolePath="/student"
        />

        <div className="mx-1.5 h-6 w-px bg-slate-200" />

        <UserDropdown 
          isOpen={activeDropdown === 'user'} 
          onToggle={() => toggleDropdown('user')} 
          student={student} 
        />
      </div>
    </header>
  );
}