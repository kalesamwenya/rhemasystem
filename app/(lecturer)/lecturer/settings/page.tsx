'use client';

import React, { useState } from 'react';
import { confirmWithApp } from '@/components/ui/app-dialogs';
import { 
  Sliders, Shield, Bell, Key, Database, 
  CheckCircle2, AlertTriangle, HelpCircle, Save, 
  RotateCcw, RefreshCw, Smartphone, Eye
} from 'lucide-react';

export default function LecturerAdvancedSettingsPage() {
  // Notification Management Configurations
  const [notifyOnUpload, setNotifyOnUpload] = useState(true);
  const [notifyOnScheduleConflict, setNotifyOnScheduleConflict] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  // Security & Terminal Sync Policies
  const [sessionTimeout, setSessionTimeout] = useState('60');
  const [requireMfaForWrites, setRequireMfaForWrites] = useState(true);
  const [allowStudentTerminalSync, setAllowStudentTerminalSync] = useState(true);

  // Storage and Network Synchronization Flags
  const [autoPurgeDrafts, setAutoPurgeDrafts] = useState(false);
  const [cdnCachingStrategy, setCdnCachingStrategy] = useState('aggressive');

  // Trigger Save Confirmation Banner State
  const [isSaved, setIsSaved] = useState(false);

  const handleCommitConfiguration = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 mx-auto">
      
      {/* Upper Registry Management Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="text-[10px] font-mono font-black uppercase tracking-widest text-blue-900 mb-1">System Core Deck</div>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Advanced Platform Settings</h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Calibrate core middleware flags, notification pipeline targets, security clearance thresholds, and local device clusters.</p>
        </div>

        {isSaved && (
          <div className="flex items-center gap-1.5 text-xs font-mono font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl animate-in fade-in zoom-in-95 duration-150">
            <CheckCircle2 className="h-4 w-4" /> Parameters Written
          </div>
        )}
      </div>

      {/* Main Structural Settings Control Form Wrapper */}
      <form onSubmit={handleCommitConfiguration} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Side: Category Navigation Blocks */}
        <div className="space-y-3 md:col-span-1">
          <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-2xs space-y-1">
            <a href="#security" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-950 text-white transition-all">
              <Shield className="h-4 w-4 text-amber-400" /> Security & Access Cleared
            </a>
            <a href="#notifications" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">
              <Bell className="h-4 w-4 text-slate-400" /> Dispatch Alerts Engine
            </a>
            <a href="#storage" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">
              <Database className="h-4 w-4 text-slate-400" /> Storage Arrays Data
            </a>
          </div>

          {/* Quick Stats Diagnostic Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-slate-400">
              <RefreshCw className="h-3.5 w-3.5 text-slate-500 animate-spin-slow" />
              <h4 className="text-[10px] font-mono font-black uppercase text-slate-900">System State Node</h4>
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-600 font-medium font-mono">
              <div className="flex justify-between"><span className="text-slate-400">API Gateway:</span> <span className="text-emerald-700 font-bold">ONLINE</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Sync Delay:</span> <span>12ms</span></div>
              <div className="flex justify-between"><span className="text-slate-400">SSL Module:</span> <span>TLS v1.3</span></div>
            </div>
          </div>
        </div>

        {/* Right Side: Main Panels Cluster Input Workspace */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Section: Security Matrix Configuration */}
          <div id="security" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-900" />
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Security & Access Thresholds</h3>
                <p className="text-[10px] text-slate-400 font-medium">Protect write routes and manage student terminal handshakes.</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Timeout Variable Config Slider/Select */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono font-black text-slate-400 uppercase tracking-wider">Session Token Timeout Lifespan</label>
                <select 
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-slate-300"
                >
                  <option value="15">15 Minutes (High Guardrail)</option>
                  <option value="60">60 Minutes (Standard Faculty Block)</option>
                  <option value="240">4 Hours (Extended Workshop)</option>
                </select>
              </div>

              {/* Toggle 1: MFA Requirement */}
              <div className="flex items-start justify-between gap-4 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <div className="space-y-0.5">
                  <label htmlFor="mfa-toggle" className="text-xs font-bold text-slate-800 cursor-pointer block">Enforce Verification for Asset Destructuring</label>
                  <p className="text-[10px] text-slate-400 font-medium leading-normal">Requires active prompt validation checks before any permanent resource purge scripts trigger.</p>
                </div>
                <input 
                  type="checkbox" 
                  id="mfa-toggle"
                  checked={requireMfaForWrites}
                  onChange={(e) => setRequireMfaForWrites(e.target.checked)}
                  className="h-4 w-4 accent-blue-900 rounded cursor-pointer mt-0.5"
                />
              </div>

              {/* Toggle 2: Terminal Syncing */}
              <div className="flex items-start justify-between gap-4 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <div className="space-y-0.5">
                  <label htmlFor="terminal-toggle" className="text-xs font-bold text-slate-800 cursor-pointer block">Allow Real-time Terminal Sync Hookups</label>
                  <p className="text-[10px] text-slate-400 font-medium leading-normal">Allows connected student dashboard sockets to hot-reload calendars when exceptions are deployed.</p>
                </div>
                <input 
                  type="checkbox" 
                  id="terminal-toggle"
                  checked={allowStudentTerminalSync}
                  onChange={(e) => setAllowStudentTerminalSync(e.target.checked)}
                  className="h-4 w-4 accent-blue-900 rounded cursor-pointer mt-0.5"
                />
              </div>
            </div>
          </div>

          {/* Section: Notification Pipeline Controls */}
          <div id="notifications" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-900" />
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Alert Distribution Control</h3>
                <p className="text-[10px] text-slate-400 font-medium">Calibrate automatic outbound messaging channels.</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Alert Field 1 */}
              <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100">
                <div>
                  <span className="block text-xs font-bold text-slate-800">Instant Broadcaster for Payload Deployments</span>
                  <span className="block text-[10px] text-slate-400 font-medium">Broadcast mobile alerts immediately when file assets transition to public.</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={notifyOnUpload}
                  onChange={(e) => setNotifyOnUpload(e.target.checked)}
                  className="h-4 w-4 accent-blue-900 rounded cursor-pointer"
                />
              </div>

              {/* Alert Field 2 */}
              <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100">
                <div>
                  <span className="block text-xs font-bold text-slate-800">Conflict Matrix Early Warners</span>
                  <span className="block text-[10px] text-slate-400 font-medium">Receive direct operational warnings if schedule logs clip room boundaries.</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={notifyOnScheduleConflict}
                  onChange={(e) => setNotifyOnScheduleConflict(e.target.checked)}
                  className="h-4 w-4 accent-blue-900 rounded cursor-pointer"
                />
              </div>

              {/* Alert Field 3 */}
              <div className="flex items-center justify-between gap-4 py-2">
                <div>
                  <span className="block text-xs font-bold text-slate-800">Faculty Weekly Digest Report Summary</span>
                  <span className="block text-[10px] text-slate-400 font-medium">Compile structural metrics around student storage consumption indexes every Friday.</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={weeklyDigest}
                  onChange={(e) => setWeeklyDigest(e.target.checked)}
                  className="h-4 w-4 accent-blue-900 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Section: Storage Arrays Strategy */}
          <div id="storage" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-900" />
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Storage System Architecture</h3>
                <p className="text-[10px] text-slate-400 font-medium">Fine-tune database garbage collection routes and server-side cache structures.</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Storage selection rail */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono font-black text-slate-400 uppercase tracking-wider">CDN Asset Distribution Stratum</label>
                <select 
                  value={cdnCachingStrategy}
                  onChange={(e) => setCdnCachingStrategy(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-slate-300"
                >
                  <option value="aggressive">Aggressive Edge Cache (Optimized Network Footprint)</option>
                  <option value="realtime">Bypass Edge Processing (Real-time Cluster Sync)</option>
                </select>
              </div>

              {/* Garbage collection toggle */}
              <div className="flex items-start justify-between gap-4 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <div className="space-y-0.5">
                  <label htmlFor="purge-toggle" className="text-xs font-bold text-slate-800 cursor-pointer block">Automated Stash Draft Purges</label>
                  <p className="text-[10px] text-slate-400 font-medium leading-normal">System automatically sweeps and destroys hidden resource artifacts older than 90 days.</p>
                </div>
                <input 
                  type="checkbox" 
                  id="purge-toggle"
                  checked={autoPurgeDrafts}
                  onChange={(e) => setAutoPurgeDrafts(e.target.checked)}
                  className="h-4 w-4 accent-blue-900 rounded cursor-pointer mt-0.5"
                />
              </div>
            </div>
          </div>

          {/* Persistent Action Bar Footer Row */}
          <div className="pt-2 flex items-center justify-end gap-2 text-xs">
            <button 
              type="button"
              onClick={async () => {
                if (await confirmWithApp('Reset settings to default factory variables?', { title: 'Reset lecturer settings?', confirmText: 'Reset settings', tone: 'danger' })) window.location.reload();
              }}
              className="px-4 py-2 border border-slate-200 bg-white text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors inline-flex items-center gap-1"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset Defaults
            </button>
            <button 
              type="submit"
              className="px-5 py-2 bg-blue-900 text-white font-mono font-black uppercase tracking-wider hover:bg-blue-800 rounded-xl inline-flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Save className="h-3.5 w-3.5 text-amber-400" /> Commit Parameters
            </button>
          </div>

        </div>
      </form>
    </div>
  );
}