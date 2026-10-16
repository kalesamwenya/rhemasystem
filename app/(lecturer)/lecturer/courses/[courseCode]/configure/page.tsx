'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  Settings2, ArrowLeft, Layers, Sliders, Save, 
  HelpCircle, ShieldAlert, Cpu, ToggleLeft, ToggleRight, Plus 
} from 'lucide-react';

export default function LecturerEvaluationConfigurePage() {
  const params = useParams();
  const courseCode = (params?.courseCode as string)?.toUpperCase() || 'CSC-301';

  // State configurations for the active tracking matrix
  const [examLock, setExamLock] = useState(true);
  const [antiCheat, setAntiCheat] = useState(true);
  const [autoRelease, setAutoRelease] = useState(false);
  const [passingThreshold, setPassingThreshold] = useState(50);

  const handleSaveMatrix = (e: React.FormEvent) => {
    e.preventDefault();
    // Logic pipeline to update database streams via API
    alert(`Configuration stream synced for course parameters: ${courseCode}`);
  };

  return (
    <div className="space-y-6">
      
      {/* Upper Navigation Back Track */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <Link 
            href="/lecturer/courses" 
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors mb-2 group"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" /> Back to Course Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-black text-blue-900 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
              {courseCode} Parameter Engine
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
            Self-Marking System Configuration
          </h1>
          <p className="text-xs font-medium text-slate-500">
            Calibrate the automated marking schema rules, evaluation criteria settings, and system anti-cheat variables.
          </p>
        </div>
      </div>

      {/* Main Configurations Form Engine */}
      <form onSubmit={handleSaveMatrix} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Core Parameter Controls */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section: Logic Engine Metrics */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs p-6 space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-blue-900" />
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Automated Grading Matrix</h3>
                <p className="text-[10px] text-slate-400 font-medium">Control parsing sensitivity constraints for inbound quiz scripts.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono font-black text-slate-500 uppercase tracking-wider">Passing Target Limit (%)</label>
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                  <input 
                    type="number" 
                    min="1" 
                    max="100" 
                    value={passingThreshold}
                    onChange={(e) => setPassingThreshold(Number(e.target.value))}
                    className="bg-transparent font-mono font-black text-xs text-slate-800 outline-none w-full"
                  />
                  <span className="text-xs font-mono text-slate-400 font-bold">%</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono font-black text-slate-500 uppercase tracking-wider">Submission Multi-Attempt Lock</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-slate-300">
                  <option value="1">Strictly 1 Attempt Allowed</option>
                  <option value="2">2 Retries Allowed</option>
                  <option value="unlimited">Unlimited Evaluation Runs</option>
                </select>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Switch Grid Layer */}
            <div className="space-y-4">
              
              {/* Row item 1 */}
              <div className="flex items-start justify-between gap-4 p-3 rounded-xl border border-slate-100 bg-slate-50/40">
                <div className="space-y-0.5">
                  <label className="block text-xs font-bold text-slate-800">Instant Grade Release Dispatch</label>
                  <p className="text-[10px] text-slate-400 font-medium max-w-md">Automatically compile metrics and render score feedback points to student dashboards immediately post-submission.</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setAutoRelease(!autoRelease)}
                  className="text-slate-400 hover:text-slate-900 transition-colors shrink-0"
                >
                  {autoRelease ? <ToggleRight className="h-7 w-7 text-blue-900" /> : <ToggleLeft className="h-7 w-7 text-slate-300" />}
                </button>
              </div>

              {/* Row item 2 */}
              <div className="flex items-start justify-between gap-4 p-3 rounded-xl border border-slate-100 bg-slate-50/40">
                <div className="space-y-0.5">
                  <label className="block text-xs font-bold text-slate-800">Continuous Assessment Windows</label>
                  <p className="text-[10px] text-slate-400 font-medium max-w-md">Lock all active tests instantly if systemic framework threats or server schedule mismatches arise.</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setExamLock(!examLock)}
                  className="text-slate-400 hover:text-slate-900 transition-colors shrink-0"
                >
                  {examLock ? <ToggleRight className="h-7 w-7 text-emerald-600" /> : <ToggleLeft className="h-7 w-7 text-slate-300" />}
                </button>
              </div>

            </div>
          </div>

          {/* Section: Academic Anti-Cheat Module */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Exam Environment Restrictions</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Configure terminal security variables during testing intervals.</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setAntiCheat(!antiCheat)}
                className="text-slate-400 hover:text-slate-900 transition-colors shrink-0"
              >
                {antiCheat ? <ToggleRight className="h-7 w-7 text-blue-900" /> : <ToggleLeft className="h-7 w-7 text-slate-300" />}
              </button>
            </div>

            {antiCheat && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 transition-all">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono font-black text-slate-500 uppercase tracking-wider">Window Blur Detection</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none">
                    <option value="strict">Flag & Auto-Submit on Blur</option>
                    <option value="warn">Warn Student up to 3 Times</option>
                    <option value="log">Silently Log to Audit Trail</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono font-black text-slate-500 uppercase tracking-wider">IP Restricting Subnet Matrix</label>
                  <input 
                    type="text" 
                    placeholder="e.g., 192.168.10.0/24" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 placeholder-slate-400 outline-none"
                  />
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right 1 Column: Summary Save Block & Advice Panel */}
        <div className="space-y-6">
          
          {/* Action Trigger Canvas */}
          <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 text-white space-y-4 shadow-sm">
            <div className="space-y-1">
              <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-slate-500">Pipeline Registry</span>
              <h3 className="text-xs font-black uppercase tracking-wider text-white">Save Configuration State</h3>
              <p className="text-[11px] text-slate-400 font-medium leading-normal">
                Executing this write action recalculates grading structures instantly for all unresolved student tests within <span className="font-mono text-amber-400 font-black">{courseCode}</span>.
              </p>
            </div>

            <button 
              type="submit"
              className="w-full bg-blue-900 hover:bg-blue-800 text-white border border-blue-800 text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md shadow-blue-950/50"
            >
              <Save className="h-4 w-4 text-amber-500" /> Deploy Parameter Changes
            </button>
          </div>

          {/* Context Advisory Block */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-2xs">
            <div className="flex items-center gap-1.5 text-slate-400">
              <HelpCircle className="h-4 w-4 text-slate-500" />
              <h4 className="text-[11px] font-mono font-black uppercase tracking-wider text-slate-900">System Guidelines</h4>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              If an assignment contains complex string components or custom multi-line response blocks, check that your regex keys or text matching settings match the evaluation parameters before locking configuration rules.
            </p>
          </div>

        </div>

      </form>
    </div>
  );
}