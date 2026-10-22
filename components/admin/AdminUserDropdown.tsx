'use client';

import React, { useState } from 'react';
import { ChevronDown, User, Settings, LogOut, Terminal } from 'lucide-react';
import Link from 'next/link';

interface AdminData {
  name: string;
  role: string;
  email: string;
}

interface AdminUserDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  admin: AdminData & { department: string };
  onSignOut: () => Promise<void>;
}

export default function AdminUserDropdown({ isOpen, onToggle, admin, onSignOut }: AdminUserDropdownProps) {
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const isOwnerOrAdministrator = ['owner', 'administrator'].includes(admin.role.toLowerCase());

  async function handleSignOut() {
    setSignOutError(null);
    setIsSigningOut(true);
    try {
      await onSignOut();
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : 'Unable to end this session. Try again.');
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="relative">
      <button 
        onClick={onToggle}
        className={`flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-50 transition-all border border-transparent ${isOpen ? 'bg-slate-50 border-slate-200' : ''}`}
      >
        <div className="h-8 w-8 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center uppercase">
          {admin.name.charAt(0)}
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl z-50">
          <div className="px-3 py-2.5 bg-slate-50 rounded-t-xl mb-1">
            <p className="text-xs font-black text-slate-900">{admin.name}</p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{admin.email}</p>
            <p className="text-[10px] text-slate-500 mt-1">{admin.department}</p>
          </div>
          
          <Link href="/admin/profile" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
            <User className="h-4 w-4" /> Account Management
          </Link>
          {isOwnerOrAdministrator && <>
            <Link href="/admin/settings" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
              <Settings className="h-4 w-4" /> Global Preferences
            </Link>
            <Link href="/admin/performance-logs" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
              <Terminal className="h-4 w-4" /> System Audit Logs
            </Link>
          </>}
          
          <div className="h-px bg-slate-100 my-1" />
          
          {signOutError && <p role="alert" className="px-3 py-2 text-xs text-red-700">{signOutError}</p>}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" /> Terminate Session
          </button>
        </div>
      )}
    </div>
  );
}