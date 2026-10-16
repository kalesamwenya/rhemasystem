'use client';

import React from 'react';
import { Save, ShieldCheck, Clock, History, AlertTriangle, KeyRound, Mail, UserCircle } from 'lucide-react';

export default function AdvancedAdminProfile() {
  return (
    <div className="max-w-8xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex items-end justify-between border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter">Identity Governance</h1>
          <p className="text-xs text-slate-400 font-bold">Emit Photography | System Administrative Portal</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 border border-slate-200 px-6 py-2.5 rounded-xl text-xs font-black uppercase hover:bg-slate-50 transition-all">
            Cancel
          </button>
          <button className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all active:scale-95">
            <Save className="h-3.5 w-3.5" /> Commit Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Meta & Status */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-2xs">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center border-2 border-slate-200">
                <UserCircle className="h-10 w-10 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 uppercase">Emit Admin</p>
                <p className="text-[10px] font-mono text-slate-400">UID: ADM-0972338115</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-bold p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500">Last Seen</span>
                <span className="text-slate-900 flex items-center gap-1.5"><Clock className="h-3 w-3" /> 2m ago</span>
              </div>
              <div className="flex justify-between text-xs font-bold p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500">Access Level</span>
                <span className="text-emerald-700 uppercase tracking-widest">Root</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Configuration */}
        <div className="lg:col-span-8 space-y-6">
          {/* Identity Form */}
          <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-2xs space-y-6">
            <h3 className="text-xs font-black uppercase text-slate-400 border-b border-slate-100 pb-4">Personal Identifiers</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-900 uppercase">Username</label>
                <input className="w-full border border-slate-200 p-3 rounded-xl text-xs font-bold" defaultValue="Emit_Admin_01" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-900 uppercase">Email Address</label>
                <input className="w-full border border-slate-200 p-3 rounded-xl text-xs font-bold" defaultValue="admin@emitphotography.com" />
              </div>
            </div>
          </div>

          {/* Security & Audit */}
          <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-2xs space-y-6">
            <h3 className="text-xs font-black uppercase text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Security & Governance
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <button className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl hover:border-slate-300 transition-all">
                <KeyRound className="h-5 w-5 text-slate-400" />
                <div className="text-left">
                  <p className="text-xs font-black">Reset Credentials</p>
                  <p className="text-[10px] text-slate-400">Rotate primary login keys</p>
                </div>
              </button>
              <button className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl hover:border-slate-300 transition-all">
                <History className="h-5 w-5 text-slate-400" />
                <div className="text-left">
                  <p className="text-xs font-black">Audit Logs</p>
                  <p className="text-[10px] text-slate-400">View access history</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}