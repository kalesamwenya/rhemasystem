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

export default function StudentTopbar({ student, onMenuToggle }: StudentTopbarProps) {
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
    <header ref={containerRef} className="h-16 border-b border-slate-200 bg-white px-4 md:px-6 flex items-center justify-between shadow-sm relative z-50">
      
      {/* Left Control Area */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="rounded-xl p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors focus:outline-none border border-transparent hover:border-slate-200"
          aria-label="Toggle structural sidebar layout alignment"
        >
          <Menu className="h-5 w-5" />
        </button>
        
        <span className="hidden sm:inline-block rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[10px] font-black tracking-wider text-emerald-800">
          CAMPUS NETWORK ONLINE
        </span>
      </div>

      {/* Right Core Controls Cluster */}
      <div className="flex items-center gap-2">
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

        <div className="h-6 w-px bg-slate-200 mx-1.5" />

        <UserDropdown 
          isOpen={activeDropdown === 'user'} 
          onToggle={() => toggleDropdown('user')} 
          student={student} 
        />
      </div>
    </header>
  );
}