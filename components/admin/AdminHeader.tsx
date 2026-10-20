'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Menu, Search } from 'lucide-react';

// Updated imports to reflect the Admin-specific folder
import AdminUserDropdown from './AdminUserDropdown';
import { canAccessAdminModule } from '@/lib/admin-access';
import CommunicationDropdown from '@/components/communications/CommunicationDropdown';
import SharedReportNotifications from './SharedReportNotifications';

interface AdminHeaderProps {
  onMenuOpenClick: () => void;
  admin: { name: string; email: string; admin_role: string; department: string };
  onSignOut: () => Promise<void>;
}

export default function AdminHeader({ onMenuOpenClick, admin, onSignOut }: AdminHeaderProps) {
  const [activeDropdown, setActiveDropdown] = useState<'notifications' | 'messages' | 'user' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canViewCommunications = canAccessAdminModule(admin.admin_role, admin.department, 'communications');
  const canViewReportNotifications = canAccessAdminModule(admin.admin_role, admin.department, 'reports');
  const canViewGlobalSearch = ['owner', 'administrator'].includes(admin.admin_role.toLowerCase());

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
    <header
      ref={containerRef}
      className="fixed left-0 top-0 z-50 flex h-16 w-full items-center justify-between gap-4 border-b border-[#dce3de] bg-white/95 px-4 backdrop-blur md:left-[var(--sidebar-width)] md:w-[calc(100%-var(--sidebar-width))] md:px-7"
    >
      
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuOpenClick}
          className="admin-focus rounded-lg p-2 text-slate-600 transition-colors hover:bg-[#eef2ef] md:hidden"
          aria-label="Open admin navigation"
        >
          <Menu className="h-4 w-4" />
        </button>

        {canViewGlobalSearch && <div className="hidden h-10 w-64 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 transition focus-within:border-[#9ab2a6] focus-within:bg-white md:flex md:w-96">
          <Search className="h-4 w-4 text-[#31584c]" />
          <input type="text" placeholder="Search people, courses, records" className="w-full bg-transparent text-sm text-[#17201d] outline-none placeholder:text-[#8a9690]" />
        </div>}
      </div>

      <div className="flex items-center gap-2">
        {canViewReportNotifications && !canViewCommunications && <SharedReportNotifications />}
        {canViewCommunications && <>
          <CommunicationDropdown
            kind="notifications"
            isOpen={activeDropdown === 'notifications'} 
            onToggle={() => toggleDropdown('notifications')} 
            rolePath="/admin"
          />

          <CommunicationDropdown
            kind="messages"
            isOpen={activeDropdown === 'messages'} 
            onToggle={() => toggleDropdown('messages')} 
            rolePath="/admin"
          />
          <div className="mx-1.5 h-6 w-px bg-[#dce3de]" />
        </>}

        <AdminUserDropdown 
          isOpen={activeDropdown === 'user'} 
          onToggle={() => toggleDropdown('user')} 
          admin={{ ...admin, role: admin.admin_role }}
          onSignOut={onSignOut}
        />
      </div>
    </header>
  );
}