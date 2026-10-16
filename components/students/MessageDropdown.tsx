'use client';

import React from 'react';
import { MessageSquare, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface ThreadItem {
  id: number;
  sender: string;
  topic: string;
  snippet: string;
  time: string;
}

interface MessageDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  threads: ThreadItem[];
}

export default function MessageDropdown({ isOpen, onToggle, threads }: MessageDropdownProps) {
  return (
    <div className="relative">
      <button 
        onClick={onToggle}
        className={`p-2.5 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors relative border border-transparent ${
          isOpen ? 'bg-slate-50 border-slate-200 text-blue-900' : ''
        }`}
        aria-label="Toggle instructor message channels window"
      >
        <MessageSquare className="h-5 w-5" />
        {threads.length > 0 && (
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-yellow-500 ring-2 ring-white" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white py-2 shadow-xl ring-1 ring-black/5 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-4 py-2 font-black text-xs text-slate-900 border-b border-slate-100 tracking-wide uppercase bg-slate-50/50 flex justify-between items-center">
            <span>Instructor Channels</span>
            <span className="text-[9px] bg-yellow-50 text-yellow-800 border border-yellow-200 px-1.5 py-0.5 rounded-md font-mono">
              Live Feed
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
            {threads.map((msg) => (
              <Link 
                key={msg.id} 
                href={`/student/messages?thread=${msg.id}`}
                onClick={onToggle}
                className="block p-4 text-xs hover:bg-slate-50/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900">{msg.sender}</span>
                  <span className="text-[9px] text-slate-400 font-mono">{msg.time}</span>
                </div>
                <p className="font-bold text-slate-800 mt-1 truncate">{msg.topic}</p>
                <p className="text-slate-400 mt-0.5 truncate">{msg.snippet}</p>
              </Link>
            ))}
          </div>

          {/* Action Link Footer Block */}
          <div className="border-t border-slate-100 mt-1 px-2 pt-1.5 pb-0.5">
            <Link
              href="/student/messages"
              onClick={onToggle}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors uppercase tracking-wider"
            >
              Expand Communication Suite
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}