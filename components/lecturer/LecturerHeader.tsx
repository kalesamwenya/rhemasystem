'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Menu, Search } from 'lucide-react';
import LecturerUserDropdown from './LecturerUserDropdown';
import CommunicationDropdown from '@/components/communications/CommunicationDropdown';

// Updated paths to target the dynamic Instructor context layout structure


interface LecturerHeaderProps {
  onMenuOpenClick: () => void;
  lecturer: { name: string; email: string; title: string };
  onSignOut: () => Promise<void>;
}

export default function LecturerHeader({ onMenuOpenClick, lecturer, onSignOut }: LecturerHeaderProps) {
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
    <header ref={containerRef} className="h-16 border-b border-slate-200/80 bg-white px-4 md:px-6 flex items-center justify-between gap-4 sticky top-0 z-50 shadow-2xs">
      
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuOpenClick}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors border border-slate-200 md:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 w-64 md:w-80">
          <Search className="h-3.5 w-3.5 text-slate-400" />
          <input type="text" placeholder="Search courses, student IDs, grade books..." className="bg-transparent text-xs outline-none w-full text-slate-800 placeholder-slate-400" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <CommunicationDropdown
          kind="notifications"
          isOpen={activeDropdown === 'notifications'} 
          onToggle={() => toggleDropdown('notifications')} 
          rolePath="/lecturer"
        />

        <CommunicationDropdown
          kind="messages"
          isOpen={activeDropdown === 'messages'} 
          onToggle={() => toggleDropdown('messages')} 
          rolePath="/lecturer"
        />

        <div className="h-6 w-px bg-slate-200 mx-1.5" />

        <LecturerUserDropdown 
          isOpen={activeDropdown === 'user'} 
          onToggle={() => toggleDropdown('user')} 
          lecturer={{ ...lecturer, role: lecturer.title || 'Lecturer' }}
          onSignOut={onSignOut}
        />
      </div>
    </header>
  );
}