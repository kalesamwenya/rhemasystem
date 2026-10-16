'use client';

import React, { useState } from 'react';
import { Plus, ArrowLeft, ListPlus, Clock, PlayCircle, Eye, Trash2, Milestone, GripVertical } from 'lucide-react';
import Link from 'next/link';

export default function StructureLessonsPage() {
  const [lessons, setLessons] = useState([
    { id: 1, currentChapter: 'Chapter 01', name: 'Relational Database Paradigms & Core Set Theory', timeframe: '45 mins', type: 'Theoretical Core' },
    { id: 2, currentChapter: 'Chapter 02', name: 'Deconstruction of Third Normal Form (3NF) Validation Matrix', timeframe: '60 mins', type: 'Laboratory Session' }
  ]);

  const [newLesson, setNewLesson] = useState({ currentChapter: 'Chapter 03', name: '', timeframe: '50 mins', type: 'Theoretical Core' });

  const handleAppendLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLesson.name) return;
    setLessons([...lessons, { ...newLesson, id: Date.now() }]);
    setNewLesson({ currentChapter: `Chapter 0${lessons.length + 2}`, name: '', timeframe: '50 mins', type: 'Theoretical Core' });
  };

  const handlePurgeLesson = (id: number) => {
    setLessons(lessons.filter(l => l.id !== id));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-16 animate-in fade-in duration-300">
      
      {/* Title Matrix spanning block workspace layout */}
      <div className="lg:col-span-3 space-y-1 pb-4 border-b border-slate-200/80">
        <Link href="/admin/courses" className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-3 w-3" /> Back to Catalog
        </Link>
        <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">Syllabus Lesson Architect</h1>
        <p className="text-xs text-slate-500 font-medium">Map structural timelines, assemble instructional sequence frameworks, and manage chapter access nodes.</p>
      </div>

      {/* Left Column Input Canvas Module (CREATE) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs h-fit space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <ListPlus className="h-4 w-4 text-blue-600" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Append Instructional Unit</h3>
        </div>
        
        <form onSubmit={handleAppendLesson} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Chapter Target Reference</label>
            <input 
              type="text" required placeholder="e.g. Chapter 03" value={newLesson.currentChapter}
              onChange={(e) => setNewLesson({...newLesson, currentChapter: e.target.value})}
              className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl font-bold text-slate-900 focus:border-slate-950"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Lesson Focus Title</label>
            <input 
              type="text" required placeholder="e.g. Index Tuning & B-Tree Execution Traversal" value={newLesson.name}
              onChange={(e) => setNewLesson({...newLesson, name: e.target.value})}
              className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl font-medium text-slate-900 focus:border-slate-950"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Instructional Duration</label>
              <input 
                type="text" required placeholder="e.g. 50 mins" value={newLesson.timeframe}
                onChange={(e) => setNewLesson({...newLesson, timeframe: e.target.value})}
                className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl font-semibold text-slate-900 focus:border-slate-950"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Instructional Space</label>
              <select 
                value={newLesson.type} onChange={(e) => setNewLesson({...newLesson, type: e.target.value})}
                className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl font-bold bg-white text-slate-900 focus:border-slate-950"
              >
                <option value="Theoretical Core">Theoretical Core</option>
                <option value="Laboratory Session">Laboratory Session</option>
                <option value="Syllabus Review Seminar">Seminar Node</option>
              </select>
            </div>
          </div>
          <button type="submit" className="w-full py-2.5 bg-slate-950 text-white text-xs font-black tracking-wide uppercase rounded-xl hover:bg-slate-900 transition-all flex items-center justify-center gap-2">
            <Plus className="h-3.5 w-3.5 text-amber-500" /> Insert Sequence Block
          </button>
        </form>
      </div>

      {/* Right Column Layout Index Pipeline (READ LISTING / DELETE) */}
      <div className="lg:col-span-2 space-y-3">
        <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
          <span>Syllabus Sequence Node Map Execution Flow</span>
          <span>{lessons.length} Nodes Active</span>
        </div>

        <div className="space-y-2">
          {lessons.length > 0 ? (
            lessons.map((lesson, idx) => (
              <div key={lesson.id} className="bg-white border border-slate-200/80 p-4 rounded-xl flex items-center justify-between gap-4 shadow-3xs group hover:border-slate-400 transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="cursor-grab text-slate-300 group-hover:text-slate-500 transition-colors hidden sm:block">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-[10px] text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-md">{lesson.currentChapter}</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {lesson.timeframe}
                      </span>
                    </div>
                    <p className="font-bold text-slate-900 text-sm truncate pr-2">{lesson.name}</p>
                    <span className="text-[10px] text-slate-400 font-bold block">{lesson.type}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-lg transition-all">
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handlePurgeLesson(lesson.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition-all">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-white border border-slate-200 border-dashed rounded-2xl space-y-1">
              <Milestone className="h-6 w-6 text-slate-300 mx-auto" />
              <p className="text-slate-900 font-bold text-xs">Instructional Flow Path Empty</p>
              <p className="text-[11px] text-slate-400">Map new sequential chapter modules using the structural setup tool panel.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}