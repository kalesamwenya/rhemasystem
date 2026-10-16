'use client';

import React, { useState } from 'react';
import { Save, ArrowLeft, BookOpen, Layers, Milestone, Globe, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function CreateCoursePage() {
  const [formFields, setFormFields] = useState({
    code: '', title: '', department: 'ICT', level: '100', 
    credits: '4', capacity: '60', description: '', delivery: 'On-Campus'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Course Entry context [${formFields.code}] verified and published to curriculum catalogs.`);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16 animate-in fade-in duration-300">
      
      {/* Header Matrix */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200/80">
        <div className="space-y-1">
          <Link href="/admin/courses" className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-900 transition-colors mb-1">
            <ArrowLeft className="h-3 w-3" /> Back to Catalog
          </Link>
          <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">Enlist Curriculum Module</h1>
          <p className="text-xs text-slate-500 font-medium">Initialize a global catalog syllabus structure with credit distributions and group capacities.</p>
        </div>
      </div>

      {/* Structural Setup Form */}
      <form onSubmit={handleSubmit} className="space-y-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-3xs">
        
        {/* Row 1: Core Identifiers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Unique Code Index</label>
            <input 
              type="text" required placeholder="e.g. ICT-2010" value={formFields.code}
              onChange={(e) => setFormFields({...formFields, code: e.target.value.toUpperCase()})}
              className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl font-mono font-bold tracking-wider outline-hidden text-slate-900 focus:border-slate-950"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Syllabus Title Descriptor</label>
            <input 
              type="text" required placeholder="e.g. Advanced Relational Databases & Schema Optimization" value={formFields.title}
              onChange={(e) => setFormFields({...formFields, title: e.target.value})}
              className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl font-medium outline-hidden text-slate-900 focus:border-slate-950"
            />
          </div>
        </div>

        {/* Row 2: Matrix Classification parameters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Faculty Branch</label>
            <select 
              value={formFields.department} onChange={(e) => setFormFields({...formFields, department: e.target.value})}
              className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl font-semibold bg-white text-slate-900 outline-hidden focus:border-slate-950"
            >
              {['ICT', 'Engineering', 'Health Sci', 'Business', 'Law', 'Education'].map(d => (
                <option key={d} value={d}>{d} Division</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Academic Tier</label>
            <select 
              value={formFields.level} onChange={(e) => setFormFields({...formFields, level: e.target.value})}
              className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl font-semibold bg-white text-slate-900 outline-hidden focus:border-slate-950"
            >
              {['100', '200', '300', '400', '500'].map(lvl => (
                <option key={lvl} value={lvl}>Level {lvl}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Unit Credit Load</label>
            <input 
              type="number" min="1" max="6" required value={formFields.credits}
              onChange={(e) => setFormFields({...formFields, credits: e.target.value})}
              className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl font-bold text-slate-900 focus:border-slate-950"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Seat Allocation Cap</label>
            <input 
              type="number" min="10" max="300" required value={formFields.capacity}
              onChange={(e) => setFormFields({...formFields, capacity: e.target.value})}
              className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:border-slate-950"
            />
          </div>
        </div>

        {/* Row 3: Syllabus Scope */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Curriculum Module Scope Statement (Description)</label>
          <textarea 
            rows={4} required placeholder="Detail the structural core requirements, instructional paths, and expected core milestones for student tracking reference fields..."
            value={formFields.description} onChange={(e) => setFormFields({...formFields, description: e.target.value})}
            className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl font-medium outline-hidden text-slate-900 focus:border-slate-950 resize-none"
          />
        </div>

        {/* Row 4: Workspace Execution Profile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Delivery Pipeline</label>
            <div className="flex gap-4 mt-1">
              {['On-Campus', 'Remote Delivery', 'Hybrid Schema'].map(mode => (
                <label key={mode} className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input 
                    type="radio" name="delivery" value={mode} checked={formFields.delivery === mode}
                    onChange={() => setFormFields({...formFields, delivery: mode})}
                    className="h-3.5 w-3.5 text-slate-950 focus:ring-0 accent-slate-950"
                  /> {mode}
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-400 self-end py-1 sm:justify-end">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span className="text-[10px] font-black uppercase tracking-wider">Validated Node Profile Key</span>
          </div>
        </div>

        {/* Submission Action Anchor Container */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Link href="/admin/courses" className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all">
            Cancel
          </Link>
          <button type="submit" className="flex items-center gap-2 px-5 py-2.5 bg-slate-950 text-white rounded-xl text-xs font-black tracking-wide uppercase hover:bg-slate-900 transition-all shadow-xs">
            <Save className="h-4 w-4 text-amber-400" /> Initialize Catalog Course
          </button>
        </div>

      </form>
    </div>
  );
}