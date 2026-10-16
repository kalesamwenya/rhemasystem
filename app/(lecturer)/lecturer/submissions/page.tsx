'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, ClipboardCheck } from 'lucide-react';
import { api } from '@/lib/api';

type CourseQueue = { id: string; course: string; cohort_name: string; student_count: number; pending_count: number; assignment_count: number };

export default function LecturerSubmissionsPage() {
  const [courses, setCourses] = useState<CourseQueue[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    (api.courses.lecturerAssignments() as Promise<{ data?: CourseQueue[] }>)
      .then((response) => { if (active) setCourses(response.data ?? []); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Unable to load submissions.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const withSubmissions = courses.filter((course) => course.pending_count > 0);
  return (
    <div className="space-y-5">
      <header className="border-b border-slate-100 pb-5"><p className="text-[10px] font-black uppercase tracking-widest text-blue-900">Marking queue</p><h1 className="mt-1 text-xl font-black text-slate-900">Submissions to review</h1><p className="mt-1 text-xs text-slate-500">Open an assigned course to review individual student submissions.</p></header>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
      {loading ? <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading marking queue…</p>
        : withSubmissions.length ? <div className="space-y-3">{withSubmissions.map((course) => <article key={course.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-black text-slate-900">{course.course}</p><p className="mt-1 text-xs text-slate-500">{course.id} · {course.cohort_name} · {course.assignment_count} assignments</p></div><Link href={`/lecturer/courses/${encodeURIComponent(course.id)}/assignments`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white"><ClipboardCheck size={14} /> {course.pending_count} awaiting mark <ArrowRight size={14} /></Link></article>)}</div>
          : !error ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-semibold text-slate-500">No submissions are currently awaiting a mark.</div> : null}
    </div>
  );
}
