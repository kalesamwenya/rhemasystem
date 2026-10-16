'use client';

import React from 'react';
import { Bell, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

interface AlertItem {
  id: number;
  title: string;
  detail: string;
  time: string;
  type: string;
  href?: string;
}

interface NotificationDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  alerts: AlertItem[];
}

export default function NotificationDropdown({ isOpen, onToggle, alerts }: NotificationDropdownProps) {
  return (
    <div className="relative">
      <button 
        onClick={onToggle}
        className={`p-2.5 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors relative border border-transparent ${
          isOpen ? 'bg-slate-50 border-slate-200 text-blue-900' : ''
        }`}
        aria-label="Toggle notifications configuration window"
      >
        <Bell className="h-5 w-5" />
        {alerts.length > 0 && (
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-600 ring-2 ring-white" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white py-2 shadow-xl ring-1 ring-black/5 animate-in fade-in slide-in-from-top-1 duration-150 z-50">
          <div className="px-4 py-2 font-black text-xs text-slate-900 border-b border-slate-100 flex justify-between items-center tracking-wide uppercase bg-slate-50/50">
            <span>System Operations Alerts</span>
            <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-md font-black border border-red-100">
              {alerts.length} Pending
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
            {alerts.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs font-medium">
                No active operational alerts flagged.
              </div>
            ) : (
              alerts.map((alert) => (
                <Link
                  key={alert.id}
                  href={alert.href ?? `/student/notifications?id=${alert.id}`}
                  onClick={onToggle}
                  className="block p-4 text-xs hover:bg-slate-50/80 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-slate-900 truncate">{alert.title}</p>
                    <span className="text-[9px] text-slate-400 font-mono shrink-0">{alert.time}</span>
                  </div>
                  <p className="text-slate-500 mt-1 leading-normal truncate">{alert.detail}</p>
                </Link>
              ))
            )}
          </div>

          <div className="border-t border-slate-100 mt-1 px-2 pt-1.5 pb-0.5">
            <Link
              href="/student/notifications"
              onClick={onToggle}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors uppercase tracking-wider"
            >
              Open Operations Center
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}