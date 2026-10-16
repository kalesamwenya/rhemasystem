'use client';

import React, { useState } from 'react';
import { ShieldAlert, ArrowLeft, Landmark, Calendar, Award, Lock, Trash2, Eye } from 'lucide-react';
import Link from 'next/link';

export default function OrchestrateExamsPage() {
  const [examinations, setExaminations] = useState([
    { code: 'EXM-MID-26', reference: 'Mid-Term Core Session', calendarDate: '2026-06-18', windowDuration: '120 mins', weightContribution: '30%', securityProtocol: 'Proctored Sandbox' }
  ]);

  const [formFields, setFormFields] = useState({ reference: '', calendarDate: '', windowDuration: '120 mins', weightContribution: '30%', securityProtocol: 'Proctored Sandbox' });

  const handleDeployExamStructure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFields.reference || !formFields.calendarDate) return;
    const computedKeyIndex = `EXM-FIN-${Math.floor(20 + Math.random() * 79)}`;
    setExaminations([...examinations, { ...formFields, code: computedKeyIndex }]);
    setFormFields({ reference: '', calendarDate: '', windowDuration: '120 mins', weightContribution: '30%', securityProtocol: 'Proctored Sandbox' });
  };

  const handlePurgeExam = (code: string) => {
    setExaminations(examinations.filter(e => e.code !== code));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-16 animate-in fade-in duration-300">
      
      {/* Main Structural Page Header Container block layout matrix */}
      <div className="lg:col-span-3 space-y-1 pb-4 border-b border-slate-200/80">
        <Link href="/admin/courses" className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-3 w-3" /> Back to Catalog
        </Link>
        <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">Summative Examination Orchestration Control</h1>
        <p className="text-xs text-slate-500 font-medium">Orchestrate high-stakes course milestones, enforce safe browsing lockouts, and manage core grade book weight parameters.</p>
      </div>

      {/* Left Column Builder Component Form Deck Block Layout */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs h-fit space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Landmark className="h-4 w-4 text-red-600" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Authorize Examination Terminal</h3>
        </div>

        <form onSubmit={handleDeployExamStructure} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Examination Session Reference</label>
            <input 
              type="text" required placeholder="e.g. End of Semester Summative Assessment II" value={formFields.reference}
              onChange={(e) => setFormFields({...formFields, reference: e.target.value})}
              className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl font-medium text-slate-900 focus:border-slate-950"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Scheduled Block Date</label>
            <input 
              type="date" required value={formFields.calendarDate}
              onChange={(e) => setFormFields({...formFields, calendarDate: e.target.value})}
              className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl font-bold font-mono text-slate-900 focus:border-slate-950"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Session Window</label>
              <select 
                value={formFields.windowDuration} onChange={(e) => setFormFields({...formFields, windowDuration: e.target.value})}
                className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl font-bold bg-white text-slate-900 focus:border-slate-950"
              >
                {['60 mins', '120 mins', '180 mins'].map(t => <option key={t} value={t}>{t} block</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Grade Book Weight Contribution</label>
              <select 
                value={formFields.weightContribution} onChange={(e) => setFormFields({...formFields, weightContribution: e.target.value})}
                className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl font-bold bg-white text-slate-900 focus:border-slate-950"
              >
                {['30%', '40%', '50%', '60%'].map(w => <option key={w} value={w}>{w} Gross Cumulative Weight</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Security Proctor Lock Protocol</label>
            <select 
              value={formFields.securityProtocol} onChange={(e) => setFormFields({...formFields, securityProtocol: e.target.value})}
              className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl font-bold bg-white text-slate-900 focus:border-slate-950"
            >
              <option value="Proctored Sandbox">Proctored Lockdown Sandbox Browser</option>
              <option value="Open Network Check">Open Network Resource Ledger</option>
              <option value="Biometric Verification Block">Biometric Verification Core Gate</option>
            </select>
          </div>
          <button type="submit" className="w-full py-2.5 bg-red-700 text-white text-xs font-black tracking-wide uppercase rounded-xl hover:bg-red-800 transition-all flex items-center justify-center gap-2 shadow-xs">
            <Lock className="h-3.5 w-3.5 text-amber-400" /> Deploy Examination Terminal
          </button>
        </form>
      </div>

      {/* Right Column Layout Index Matrix Block Display Layout Container (READ/DELETE) */}
      <div className="lg:col-span-2 space-y-3">
        <div className="bg-slate-950 border border-slate-900 p-3.5 rounded-xl flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 shadow-sm">
          <span className="flex items-center gap-2 text-amber-500"><ShieldAlert className="h-3.5 w-3.5 shrink-0" /> Critical Summative Core Ledgers</span>
          <span>{examinations.length} Gates Armed</span>
        </div>

        <div className="space-y-2">
          {examinations.length > 0 ? (
            examinations.map((exam) => (
              <div key={exam.code} className="bg-white border border-slate-200/80 p-4 rounded-xl flex items-center justify-between gap-4 shadow-3xs group hover:border-red-200/80 transition-all">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="p-2.5 rounded-xl bg-slate-950 border text-white font-mono font-black text-[10px] select-none tracking-wider shrink-0">
                    {exam.code}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Date: {exam.calendarDate}
                      </span>
                      <span className="font-mono text-[10px] font-black text-slate-900 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        Weight Contribution: {exam.weightContribution}
                      </span>
                    </div>
                    <p className="font-black text-slate-900 text-sm truncate pr-2 mt-1">{exam.reference}</p>
                    <span className="text-[10px] text-red-700 bg-rose-50 border border-rose-100/50 px-2 py-0.5 rounded-md font-mono font-bold inline-block mt-1">{exam.securityProtocol} Active</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-lg transition-all">
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handlePurgeExam(exam.code)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition-all">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-white border border-slate-200 border-dashed rounded-2xl space-y-1">
              <Landmark className="h-6 w-6 text-slate-300 mx-auto" />
              <p className="text-slate-900 font-bold text-xs">Summative Matrix Empty</p>
              <p className="text-[11px] text-slate-400">No high-stakes examinations currently live inside the administrative pipeline context.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}