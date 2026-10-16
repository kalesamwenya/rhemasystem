'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, FileCheck2 } from 'lucide-react';
import { api } from '@/lib/api';

type Assignment = {
  id: number;
  name: string;
  intro: string;
  due_at: number;
  maximum_grade: number;
  submission_count: number;
  pending_count: number;
};

type AssignmentResponse = {
  data?: { course: { id: string; course: string; cohort_name: string }; assignments: Assignment[] };
};

export default function LecturerAssignmentsPage() {
  const params = useParams();
  const courseId = String(params.courseCode ?? '');
  const [data, setData] = useState<AssignmentResponse['data']>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (api.courses.lecturerAssignments({ course_id: courseId }) as Promise<AssignmentResponse>)
      .then((response) => {
        if (active) setData(response.data);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load course assignments.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [courseId]);

  return (
    <div className="space-y-5">
      <header className="border-b border-slate-100 pb-5">
        <Link href="/lecturer/courses" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500"><ArrowLeft size={14} /> My courses</Link>
        <h1 className="mt-3 text-xl font-black uppercase tracking-tight text-slate-900">{data?.course.course ?? 'Course assignments'}</h1>
        {data?.course && <p className="mt-1 text-xs text-slate-500">{data.course.id} · {data.course.cohort_name}</p>}
      </header>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
      {loading ? <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">Loading assignments…</p>
        : data?.assignments.length ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Assignment</th><th className="px-5 py-3">Due</th><th className="px-5 py-3">Max mark</th><th className="px-5 py-3">Submissions</th><th className="px-5 py-3">Awaiting mark</th><th className="px-5 py-3" /></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {data.assignments.map((assignment) => (
                    <tr key={assignment.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4"><p className="font-bold text-slate-900">{assignment.name}</p><p className="mt-1 line-clamp-2 text-xs text-slate-500">{assignment.intro.replace(/<[^>]*>/g, ' ').trim()}</p></td>
                      <td className="px-5 py-4 text-xs text-slate-600">{assignment.due_at ? new Date(assignment.due_at * 1000).toLocaleDateString() : 'No deadline'}</td>
                      <td className="px-5 py-4 font-semibold text-slate-700">{assignment.maximum_grade}</td>
                      <td className="px-5 py-4 text-slate-700">{assignment.submission_count}</td>
                      <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${assignment.pending_count ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>{assignment.pending_count}</span></td>
                      <td className="px-5 py-4 text-right"><Link href={`/lecturer/courses/${encodeURIComponent(courseId)}/assignments/${assignment.id}`} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white"><FileCheck2 size={14} /> Open marking</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : !error ? <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-semibold text-slate-500">No assignments are attached to this course.</p> : null}
    </div>
  );
}
