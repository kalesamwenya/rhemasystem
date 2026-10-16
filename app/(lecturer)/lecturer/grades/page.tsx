'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';

type GradeRecord = { course_id: string; course_name: string; assignment_id: number; assignment_name: string; student_id: string; student_name: string; grade: number; maximum_grade: number; feedback: string; graded_at: string };

export default function LecturerGradesPage() {
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [courseFilter, setCourseFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    (api.courses.lecturerGrades() as Promise<{ data?: GradeRecord[] }>)
      .then((response) => { if (active) setGrades(response.data ?? []); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Unable to load marks.'); });
    return () => { active = false; };
  }, []);
  const courseOptions = useMemo(() => Array.from(new Map(grades.map((grade) => [grade.course_id, grade.course_name])).entries()), [grades]);
  const filtered = grades.filter((grade) =>
    (courseFilter === 'all' || grade.course_id === courseFilter)
    && `${grade.student_name} ${grade.student_id} ${grade.assignment_name}`.toLowerCase().includes(search.trim().toLowerCase())
  );
  return (
    <div className="space-y-5">
      <header className="border-b border-slate-100 pb-5"><p className="text-[10px] font-black uppercase tracking-widest text-blue-900">Assignment assessment</p><h1 className="mt-1 text-xl font-black text-slate-900">Marked assignments</h1><p className="mt-1 text-xs text-slate-500">Marks saved for submissions in the courses assigned to you.</p></header>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row">
        <label className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student or assignment" className="w-full rounded-xl bg-slate-50 py-2.5 pl-10 pr-3 text-xs outline-none focus:ring-2 focus:ring-blue-900/20" /></label>
        <select value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700"><option value="all">All assigned courses</option>{courseOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Student</th><th className="px-5 py-3">Course / assignment</th><th className="px-5 py-3">Mark</th><th className="px-5 py-3">Graded</th><th className="px-5 py-3">Feedback</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{filtered.map((entry) => <tr key={`${entry.course_id}-${entry.assignment_id}-${entry.student_id}`}><td className="px-5 py-3"><p className="font-bold">{entry.student_name}</p><p className="font-mono text-xs text-slate-500">{entry.student_id}</p></td><td className="px-5 py-3"><p className="font-semibold">{entry.course_name}</p><p className="text-xs text-slate-500">{entry.assignment_name}</p></td><td className="px-5 py-3 font-black text-emerald-800">{entry.grade} / {entry.maximum_grade}</td><td className="px-5 py-3 text-xs text-slate-600">{new Date(entry.graded_at).toLocaleDateString()}</td><td className="max-w-sm px-5 py-3 text-xs text-slate-600">{entry.feedback || '—'}</td></tr>)}</tbody>
        </table></div>
        {!filtered.length && <p className="p-8 text-center text-sm text-slate-500">{grades.length ? 'No marks match your filters.' : 'No assignment marks have been recorded yet.'}</p>}
      </div>
    </div>
  );
}
