'use client';

import React, { useState } from 'react';
import { FileEdit, ArrowLeft, Calendar, Award, Code, CheckSquare, Trash2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function FormulateAssignmentsPage() {
  const [tasks, setTasks] = useState([
    { id: 'ASN-01', title: 'Normal Form Isolation & Normalization Logic Proofs', cutoffDate: '2026-06-12', weightFactor: '10%', mode: 'Document Submission' },
    { id: 'ASN-02', title: 'Multi-Threaded Transaction Pipeline Engine Implementation', cutoffDate: '2026-06-28', weightFactor: '15%', mode: 'Repository Code Push' }
  ]);

  const [formFields, setFormFields] = useState({ title: '', cutoffDate: '', weightFactor: '10%', mode: 'Document Submission' });

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFields.title || !formFields.cutoffDate) return;
    const nextKeyId = `ASN-0${tasks.length + 1}`;
    setTasks([...tasks, { ...formFields, id: nextKeyId }]);
    setFormFields({ title: '', cutoffDate: '', weightFactor: '10%', mode: 'Document Submission' });
  };

  const handlePurgeTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-16 animate-in fade-in duration-300">
      
      {/* Header Matrix Block layout */}
      <div className="lg:col-span-3 space-y-1 pb-4 border-b border-slate-200/80">
        <Link href="/admin/courses" className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-3 w-3" /> Back to Catalog
        </Link>
        <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">Assignment Constructor Workspace</h1>
        <p className="text-xs text-slate-500 font-medium">Formulate macro-assessment items, establish grade book weighting balances, and enforce submission deadlines.</p>
      </div>

      {/* Left Column Input Workspace Block Configuration */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs h-fit space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <FileEdit className="h-4 w-4 text-emerald-600" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Formulate Assessment Node</h3>
        </div>

        <form onSubmit={handleCreateAssignment} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Assignment Operational Title</label>
            <input 
              type="text" required placeholder="e.g. Entity-Relationship Structural Optimization Lab" value={formFields.title}
              onChange={(e) => setFormFields({...formFields, title: e.target.value})}
              className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl font-medium text-slate-900 focus:border-slate-950"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Submission Cutoff Deadline</label>
            <input 
              type="date" required value={formFields.cutoffDate}
              onChange={(e) => setFormFields({...formFields, cutoffDate: e.target.value})}
              className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl font-bold font-mono text-slate-900 focus:border-slate-950"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Grade Weight Factor</label>
              <select 
                value={formFields.weightFactor} onChange={(e) => setFormFields({...formFields, weightFactor: e.target.value})}
                className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl font-bold bg-white text-slate-900 focus:border-slate-950"
              >
                {['5%', '10%', '15%', '20%', '25%'].map(w => <option key={w} value={w}>{w} of Grade</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Evaluation Channel</label>
              <select 
                value={formFields.mode} onChange={(e) => setFormFields({...formFields, mode: e.target.value})}
                className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl font-bold bg-white text-slate-900 focus:border-slate-950"
              >
                <option value="Document Submission">PDF File Upload</option>
                <option value="Repository Code Push">Git Repo Code Push</option>
                <option value="Direct Text Input">Text Editor Matrix</option>
              </select>
            </div>
          </div>
          <button type="submit" className="w-full py-2.5 bg-slate-950 text-white text-xs font-black tracking-wide uppercase rounded-xl hover:bg-slate-900 transition-all">
            Deploy Course Assignment Task
          </button>
        </form>
      </div>

      {/* Right Column Layout Index Matrix Block (READ LIST/DELETE) */}
      <div className="lg:col-span-2 space-y-3">
        <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
          <span>Active Semester Milestone Deliverables</span>
          <span>{tasks.length} Grade book Anchors Linked</span>
        </div>

        <div className="space-y-2">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <div key={task.id} className="bg-white border border-slate-200/80 p-4 rounded-xl flex items-center justify-between gap-4 shadow-3xs group hover:border-slate-400 transition-all">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="p-2.5 rounded-xl bg-slate-100 border text-slate-800 font-mono font-black text-[11px] select-none shrink-0 tracking-wider">
                    {task.id}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Cutoff: {task.cutoffDate}
                      </span>
                      <span className="font-mono text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        <Award className="h-3 w-3" /> Weight: {task.weightFactor}
                      </span>
                    </div>
                    <p className="font-bold text-slate-900 text-sm truncate pr-2 mt-1">{task.title}</p>
                    <span className="text-[10px] text-slate-400 font-bold block mt-0.5">{task.mode} Matrix Channel</span>
                  </div>
                </div>

                <button onClick={() => handlePurgeTask(task.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition-all shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-white border border-slate-200 border-dashed rounded-2xl space-y-1">
              <CheckSquare className="h-6 w-6 text-slate-300 mx-auto" />
              <p className="text-slate-900 font-bold text-xs">No Pending Tasks Found</p>
              <p className="text-[11px] text-slate-400">Deploy macro assessment requirements to initialize grade book computations.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}