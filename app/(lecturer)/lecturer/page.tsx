'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BookOpen, ClipboardCheck, Users } from 'lucide-react';
import { api } from '@/lib/api';

type LecturerCourse = { id: string; course: string; cohort_name: string; student_count: number; pending_count: number; assignment_count: number };

export default function LecturerMainDashboard() {
  const [courses, setCourses] = useState<LecturerCourse[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (api.courses.lecturerAssignments() as Promise<{ data?: LecturerCourse[] }>)
      .then((response) => {
        if (!active) return;
        setCourses(response.data ?? []);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load your assigned courses.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const totalStudents = courses.reduce((total, course) => total + course.student_count, 0);
  const pendingMarks = courses.reduce((total, course) => total + course.pending_count, 0);
  const metrics = [
    { title: 'Courses I teach', value: courses.length, icon: BookOpen, tone: 'bg-blue-50 text-blue-800' },
    { title: 'Course enrollments', value: totalStudents, icon: Users, tone: 'bg-emerald-50 text-emerald-800' },
    { title: 'Submissions to mark', value: pendingMarks, icon: ClipboardCheck, tone: 'bg-amber-50 text-amber-800' },
  ];

  return (
    <div className="mx-auto space-y-6">
      <header className="border-b border-slate-100 pb-5">
        <p className="mb-1 text-[10px] font-mono font-black uppercase tracking-widest text-blue-900">Lecturer workspace</p>
        <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">Teaching dashboard</h1>
        <p className="mt-1 text-xs font-medium text-slate-500">Your assigned courses, enrolled students, and submissions to mark.</p>
      </header>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
      {loading ? <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading your teaching data…</p> : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">{metrics.map((metric) => { const Icon = metric.icon; return <article key={metric.title} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4"><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{metric.title}</p><p className="mt-1 text-2xl font-black text-slate-900">{metric.value}</p></div><span className={`rounded-xl p-3 ${metric.tone}`}><Icon size={18} /></span></article>; })}</div>
          <section className="space-y-3">
            <div className="flex items-center justify-between"><h2 className="font-black text-slate-900">Courses I teach</h2><Link href="/lecturer/courses" className="text-xs font-bold text-blue-900">View all</Link></div>
            {courses.length ? courses.slice(0, 5).map((course) => <Link key={course.id} href={`/lecturer/courses/${encodeURIComponent(course.id)}/assignments`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50"><span><span className="block text-sm font-bold text-slate-900">{course.course}</span><span className="text-xs text-slate-500">{course.id} · {course.cohort_name}</span></span><span className="text-right"><span className="block text-sm font-black text-amber-800">{course.pending_count}</span><span className="text-[10px] text-slate-500">to mark</span></span></Link>) : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">No courses are assigned to your lecturer account.</p>}
          </section>
        </>
      )}
    </div>
  );
}
