'use client';

import React, { useState } from 'react';
import { HelpCircle, ArrowLeft, HelpCircle as QIcon, Zap, Clock, Trash2, HelpCircle as PlaceholderIcon } from 'lucide-react';
import Link from 'next/link';

export default function AssembleQuizzesPage() {
  const [quizzes, setQuizzes] = useState([
    { id: 1, name: 'Syllabus Pulse: Normal Form Structural Core Rules', count: 10, limit: '15 mins', tier: 'Conceptual Check' },
    { id: 2, name: 'Syllabus Pulse: Transaction Isolation Multi-choice', count: 15, limit: '20 mins', tier: 'Practical Validation' }
  ]);

  const [formState, setFormState] = useState({ name: '', count: 10, limit: '15 mins', tier: 'Conceptual Check' });

  const handleAppendQuizNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name) return;
    setQuizzes([...quizzes, { ...formState, id: Date.now() }]);
    setFormState({ name: '', count: 10, limit: '15 mins', tier: 'Conceptual Check' });
  };

  const handlePurgeQuiz = (id: number) => {
    setQuizzes(quizzes.filter(q => q.id !== id));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-16 animate-in fade-in duration-300">
      
      {/* Header Descriptors block layout */}
      <div className="lg:col-span-3 space-y-1 pb-4 border-b border-slate-200/80">
        <Link href="/admin/courses" className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-3 w-3" /> Back to Catalog
        </Link>
        <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">Quiz Formulation Bench</h1>
        <p className="text-xs text-slate-500 font-medium">Build micro conceptual diagnostic blocks, manage multi-choice banks, and configure strict session timer limits.</p>
      </div>

      {/* Left Column Builder Setup Frame Component */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs h-fit space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <HelpCircle className="h-4 w-4 text-purple-600" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Generate Micro Quiz Node</h3>
        </div>

        <form onSubmit={handleAppendQuizNode} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Quiz Scope Title</label>
            <input 
              type="text" required placeholder="e.g. Acid Properties Validation checkpoints" value={formState.name}
              onChange={(e) => setFormState({...formState, name: e.target.value})}
              className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl font-medium text-slate-900 focus:border-slate-950"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Items Count</label>
              <input 
                type="number" min="5" max="50" required value={formState.count}
                onChange={(e) => setFormState({...formState, count: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl font-bold font-mono text-slate-900 focus:border-slate-950"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Session Timer Limit</label>
              <select 
                value={formState.limit} onChange={(e) => setFormState({...formState, limit: e.target.value})}
                className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl font-bold bg-white text-slate-900 focus:border-slate-950"
              >
                {['10 mins', '15 mins', '20 mins', '30 mins'].map(t => <option key={t} value={t}>{t} countdown</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Diagnostic Evaluation Tier</label>
            <select 
              value={formState.tier} onChange={(e) => setFormState({...formState, tier: e.target.value})}
              className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl font-bold bg-white text-slate-900 focus:border-slate-950"
            >
              <option value="Conceptual Check">Conceptual Diagnostic Check</option>
              <option value="Practical Validation">Practical Execution Test</option>
              <option value="Weekly Syllabus Pulse">Weekly Review Checkpoint</option>
            </select>
          </div>
          <button type="submit" className="w-full py-2.5 bg-slate-950 text-white text-xs font-black tracking-wide uppercase rounded-xl hover:bg-slate-900 transition-all flex items-center justify-center gap-2">
            <Zap className="h-3.5 w-3.5 text-amber-500" /> Commit Quiz Template
          </button>
        </form>
      </div>

      {/* Right Column Layout Index Matrix Block Data Listing (READ/DELETE) */}
      <div className="lg:col-span-2 space-y-3">
        <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
          <span>Active Diagnostic Quiz Schemas</span>
          <span>{quizzes.length} Iterations Deployed</span>
        </div>

        <div className="space-y-2">
          {quizzes.length > 0 ? (
            quizzes.map((quiz) => (
              <div key={quiz.id} className="bg-white border border-slate-200/80 p-4 rounded-xl flex items-center justify-between gap-4 shadow-3xs group hover:border-slate-400 transition-all">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 group-hover:bg-purple-50 group-hover:text-purple-700 transition-all shrink-0">
                    <QIcon className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] font-black text-slate-500 bg-slate-100 border border-slate-200/40 px-1.5 py-0.5 rounded-md">{quiz.count} MCQ Items</span>
                      <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Time Limit: {quiz.limit}
                      </span>
                    </div>
                    <p className="font-bold text-slate-900 text-sm truncate pr-2 mt-1">{quiz.name}</p>
                    <span className="text-[10px] text-slate-400 font-bold block mt-0.5">{quiz.tier} Frame</span>
                  </div>
                </div>

                <button onClick={() => handlePurgeQuiz(quiz.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition-all shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-white border border-slate-200 border-dashed rounded-2xl space-y-1">
              <PlaceholderIcon className="h-6 w-6 text-slate-300 mx-auto" />
              <p className="text-slate-900 font-bold text-xs">Diagnostic Registries Clear</p>
              <p className="text-[11px] text-slate-400">Initialize small multi-choice review sessions using the blueprint canvas panel.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}