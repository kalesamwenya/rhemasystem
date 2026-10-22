import React from 'react';
import { ChevronDown, User, Settings, ShieldCheck, LogOut } from 'lucide-react';
import Link from 'next/link';
import { api, clearAuthSession } from '@/lib/api';

interface StudentData {
  name: string;
  studentId: string;
  email: string;
}

interface UserDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  student: StudentData;
}

export default function UserDropdown({ isOpen, onToggle, student }: UserDropdownProps) {
  const avatarInitials = student.name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2) || 'S';

  const logout = async () => {
    try {
      await api.logout();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to revoke the server session. It will expire automatically.');
    } finally {
      clearAuthSession();
      window.location.assign('/login');
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={onToggle}
        className={`flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-50 transition-all text-left border border-transparent ${
          isOpen ? 'bg-slate-50 border-slate-200' : ''
        }`}
      >
        <div className="h-8 w-8 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center border border-slate-950 shadow-sm uppercase">
          {avatarInitials}
        </div>
        <div className="hidden md:block pr-1">
          <p className="text-xs font-bold text-slate-900 leading-none">{student.name}</p>
          <p className="text-[10px] text-slate-400 font-mono mt-1 leading-none">{student.studentId}</p>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-2.5 border-b border-slate-100 mb-1 bg-slate-50/40 rounded-t-xl">
            <p className="text-xs font-black text-slate-900 leading-snug">{student.name}</p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{student.email}</p>
          </div>
          
          <Link href="/student/profile" className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
            <User className="h-4 w-4 text-slate-400" />
            Profile
          </Link>
          
          <Link href="/student/settings" className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
            <Settings className="h-4 w-4 text-slate-400" />
            Settings
          </Link>
          
          <Link href="/student/security" className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
            <ShieldCheck className="h-4 w-4 text-slate-400" />
            Security
          </Link>
          
          <div className="h-px bg-slate-100 my-1" />
          
          <button onClick={() => void logout()} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors">
            <LogOut className="h-4 w-4 text-red-500" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}