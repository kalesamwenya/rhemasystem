'use client';

import React from 'react';
import { MessageSquare, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface AdminThread {
  id: number;
  sender: string;
  topic: string;
  time: string;
}

interface AdminMessageProps {
  isOpen: boolean;
  onToggle: () => void;
  threads: AdminThread[];
}

export default function AdminMessageDropdown({ isOpen, onToggle, threads }: AdminMessageProps) {
  return (
    <div className="relative">
      <button 
        onClick={onToggle}
        className={`p-2.5 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors relative border border-transparent ${isOpen ? 'bg-slate-50 border-slate-200 text-slate-900' : ''}`}
      >
        <MessageSquare className="h-5 w-5" />
        {threads.length > 0 && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-white" />}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white py-2 shadow-xl z-50">
          <div className="px-4 py-2 font-black text-xs text-slate-900 border-b border-slate-100 uppercase bg-slate-50/50 flex justify-between items-center">
            <span>Client Communications</span>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
            {threads.map((thread) => (
              <Link key={thread.id} href="/admin/messages" onClick={onToggle} className="block p-4 text-xs hover:bg-slate-50">
                <div className="flex justify-between items-center">
                  <p className="font-bold text-slate-900">{thread.sender}</p>
                  <span className="text-[9px] text-slate-400 font-mono">{thread.time}</span>
                </div>
                <p className="text-slate-500 mt-1 font-bold">{thread.topic}</p>
              </Link>
            ))}
          </div>
          <div className="border-t border-slate-100 mt-1 px-2 pt-1.5">
            <Link href="/admin/messages" onClick={onToggle} className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 uppercase tracking-wider">
              Expand Support Suite <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}