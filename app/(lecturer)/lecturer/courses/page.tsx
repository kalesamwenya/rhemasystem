'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { BookOpen, ChevronRight, FileCheck2, Users } from 'lucide-react';
import { api } from '@/lib/api';

type LecturerCourse = {
  id: string;
  course: string;
  cohort_name: string;
  student_count: number;
  assignment_count: number;
  pending_count: number;
};

export default function LecturerCourseDashboardPage() {
  const [courses, setCourses] = useState<LecturerCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (api.courses.lecturerAssignments() as Promise<{ data?: LecturerCourse[]; message?: string }>)
      .then((response) => {
        if (!active) return;
        setCourses(response.data ?? []);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load assigned courses.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-100 pb-5">
        <p className="mb-1 text-[10px] font-mono font-black uppercase tracking-widest text-blue-900">Lecturer workspace</p>
        <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">Courses I teach</h1>
        <p className="mt-1 text-xs font-medium text-slate-500">Review submissions and record marks for courses assigned to you.</p>
      </header>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
      {loading ? <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">Loading assigned courses…</p>
        : courses.length ? (
          <div className="grid gap-5 xl:grid-cols-2">
            {courses.map((course) => (
              <article key={course.id} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-blue-900">{course.id}</span>
                    <h2 className="mt-3 text-base font-black uppercase tracking-tight text-slate-900">{course.course}</h2>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Class {course.cohort_name}</p>
                  </div>
                  <BookOpen className="h-5 w-5 text-blue-800" />
                </div>
                <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3">
                  <Metric icon={<Users size={14} />} label="Students" value={course.student_count} />
                  <Metric icon={<BookOpen size={14} />} label="Assignments" value={course.assignment_count} />
                  <Metric icon={<FileCheck2 size={14} />} label="To mark" value={course.pending_count} />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Link href="/lecturer/students" className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-xs font-bold text-slate-800 transition hover:bg-slate-50">
                    <span>View enrolled students</span><ChevronRight size={16} />
                  </Link>
                  <Link href={`/lecturer/courses/${encodeURIComponent(course.id)}/assignments`} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-xs font-bold text-slate-800 transition hover:bg-slate-50">
                    <span>Review assignments</span><ChevronRight size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : !error ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-semibold text-slate-500">No courses have been assigned to your account yet. Contact an administrator to assign your teaching courses.</div> : null}
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return <div className="flex items-center gap-2"><span className="text-blue-800">{icon}</span><span><span className="block text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</span><span className="text-xs font-black text-slate-800">{value}</span></span></div>;
}
