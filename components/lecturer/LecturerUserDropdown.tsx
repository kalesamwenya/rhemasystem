'use client';

import React, { useState } from 'react';
import { ChevronDown, User, Settings, LogOut, FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';

interface lecturerData {
  name: string;
  role: string;
  email: string;
}

interface lecturerUserDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  lecturer: lecturerData;
  onSignOut: () => Promise<void>;
}

export default function LecturerUserDropdown({ isOpen, onToggle, lecturer, onSignOut }: lecturerUserDropdownProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setError(null);
    setIsSigningOut(true);
    try {
      await onSignOut();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : 'Unable to end this session.');
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
        <div className="h-8 w-8 rounded-xl bg-slate-950 text-white font-black text-xs flex items-center justify-center uppercase">
          {lecturer.name.charAt(0)}
        </div>
        <div className="hidden md:block pr-1 text-left">
          <p className="text-xs font-bold text-slate-900 leading-none">{lecturer.name}</p>
          <p className="text-[10px] text-slate-400 mt-1 leading-none uppercase tracking-wider">{lecturer.role}</p>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl z-50">
          <div className="px-3 py-2.5 bg-slate-50 rounded-t-xl mb-1">
            <p className="text-xs font-black text-slate-900">{lecturer.name}</p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{lecturer.email}</p>
          </div>
          
          <Link href="/lecturer/settings/profile" onClick={onToggle} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
            <User className="h-4 w-4" /> Faculty Profile
          </Link>
          <Link href="/lecturer/grades" onClick={onToggle} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
            <FileSpreadsheet className="h-4 w-4" /> Gradebook Ledgers
          </Link>
          <Link href="/lecturer/settings" onClick={onToggle} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
            <Settings className="h-4 w-4" /> Portal Preferences
          </Link>
          
          <div className="h-px bg-slate-100 my-1" />
          
          {error && <p role="alert" className="px-3 py-2 text-xs text-red-700">{error}</p>}
          <button type="button" onClick={handleSignOut} disabled={isSigningOut} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-60">
            <LogOut className="h-4 w-4" /> Terminate Session
          </button>
        </div>
      )}
    </div>
  );
}