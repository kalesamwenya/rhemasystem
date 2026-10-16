'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Clock, FileText, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

type Assignment = {
  id: number;
  name: string;
  intro: string;
  course_id: string;
  course_name: string;
  due_at: number;
  deadline_passed: boolean;
  maximum_grade: number;
  submission_type: string;
  submitted_at: string | null;
};

type AssignmentsResponse = { data: Assignment[] };

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (api.courses.myAssignments() as Promise<AssignmentsResponse>)
      .then((response) => { if (active) setAssignments(response.data); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load your assignments.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <main className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-black text-slate-900">Assignments</h1>
        <p className="mt-1 text-sm text-slate-500">Assessments for your currently enrolled courses.</p>
      </header>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {loading ? (
        <div className="flex items-center gap-2 p-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading assignments…</div>
      ) : assignments.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">There are no assignments for your enrolled courses yet.</div>
      ) : (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {assignments.map((assignment) => {
            return (
              <article key={`${assignment.course_id}-${assignment.id}`} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="rounded-xl bg-blue-50 p-3 text-blue-900"><FileText className="h-5 w-5" /></div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-900">{assignment.course_name}</p>
                    <h2 className="mt-1 font-bold text-slate-900">{assignment.name}</h2>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{assignment.due_at ? new Date(assignment.due_at * 1000).toLocaleString() : 'No deadline'}</span>
                      <span>Maximum grade: {assignment.maximum_grade}</span>
                      {assignment.submitted_at && <span>Submitted {new Date(assignment.submitted_at).toLocaleString()}</span>}
                    </div>
                    {assignment.deadline_passed && !assignment.submitted_at && <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-700"><AlertCircle className="h-3.5 w-3.5" />Deadline passed</p>}
                  </div>
                </div>
                <Link href={`/student/courses/${encodeURIComponent(assignment.course_id)}/assignment?assessment_id=${assignment.id}`} className="shrink-0 rounded-xl bg-slate-950 px-4 py-2.5 text-center text-xs font-bold text-white hover:bg-slate-800">
                  {assignment.submitted_at ? 'View submission' : 'Open assignment'}
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
