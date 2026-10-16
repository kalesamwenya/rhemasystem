'use client';

import React from 'react';
import { Bell, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

interface LecturerAlert {
  id: number;
  title: string;
  detail: string;
  time: string;
}

interface LecturerNotificationProps {
  isOpen: boolean;
  onToggle: () => void;
  alerts: LecturerAlert[];
}

export default function LecturerNotificationDropdown({ isOpen, onToggle, alerts }: LecturerNotificationProps) {
  return (
    <div className="relative">
      <button 
        onClick={onToggle}
        className={`p-2.5 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors relative border border-transparent ${isOpen ? 'bg-slate-50 border-slate-200 text-slate-900' : ''}`}
      >
        <Bell className="h-5 w-5" />
        {alerts.length > 0 && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" />}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white py-2 shadow-xl z-50">
          <div className="px-4 py-2 font-black text-xs text-slate-900 border-b border-slate-100 uppercase bg-slate-50/50 flex justify-between items-center">
            <span>Academic Alerts</span>
            <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-black border border-amber-100">{alerts.length} New</span>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
            {alerts.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">No active alerts recorded.</div>
            ) : (
              alerts.map((alert) => (
                <Link key={alert.id} href="/lecture/submissions" onClick={onToggle} className="block p-4 text-xs hover:bg-slate-50">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-slate-900">{alert.title}</p>
                    <span className="text-[9px] text-slate-400 font-mono">{alert.time}</span>
                  </div>
                  <p className="text-slate-500 mt-1 text-left font-medium">{alert.detail}</p>
                </Link>
              ))
            )}
          </div>
          <div className="border-t border-slate-100 mt-1 px-2 pt-1.5">
            <Link href="/lecture/submissions" onClick={onToggle} className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 uppercase tracking-wider">
              Open Evaluation Feed <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}