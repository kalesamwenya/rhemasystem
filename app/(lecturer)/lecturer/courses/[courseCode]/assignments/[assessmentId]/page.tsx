'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpenCheck } from 'lucide-react';
import AssignmentReader, { type AssignmentAiReview, type SubmissionAnnotation } from '@/components/lecturer/AssignmentReader';
import { api } from '@/lib/api';

type Submission = {
  student_id: string;
  student_name: string;
  email: string | null;
  submission_text: string;
  submitted_at: string;
  assignment_id: number;
  assignment_name: string;
  maximum_grade: number;
  grade: number | null;
  feedback: string | null;
  annotations: SubmissionAnnotation[];
  graded_at: string | null;
};

type SubmissionResponse = {
  data?: {
    course: { id: string; course: string; cohort_name: string };
    assignment: { id: number; name: string; maximum_grade: number };
    submissions: Submission[];
  };
};

export default function LecturerAssignmentSubmissionsPage() {
  const params = useParams();
  const courseId = String(params.courseCode ?? '');
  const assignmentId = String(params.assessmentId ?? '');
  const [data, setData] = useState<SubmissionResponse['data']>();
  const [selected, setSelected] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (api.courses.lecturerAssignments({ course_id: courseId, assignment_id: assignmentId }) as Promise<SubmissionResponse>)
      .then((response) => { if (active) setData(response.data); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Unable to load submissions.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [courseId, assignmentId]);

  const saveMark = async (grade: number, feedback: string, annotations: SubmissionAnnotation[]) => {
    if (!selected) return;
    await api.courses.saveLecturerAssignmentGrade({
      course_id: courseId,
      assignment_id: assignmentId,
      student_id: selected.student_id,
      grade,
      feedback,
      annotations,
    });
    setData((current) => current ? {
      ...current,
      submissions: current.submissions.map((submission) => submission.student_id === selected.student_id
        ? { ...submission, grade, feedback, annotations, graded_at: new Date().toISOString() }
        : submission),
    } : current);
    setSelected(null);
  };

  const reviewWithAi = async (): Promise<AssignmentAiReview> => {
    if (!selected) throw new Error('Select a student submission before running the AI check.');
    const response = await api.courses.checkAssignmentWithAI({
      course_id: courseId,
      assignment_id: assignmentId,
      student_id: selected.student_id,
    }) as { success?: boolean; message?: string; data?: AssignmentAiReview };
    if (!response.success || !response.data) throw new Error(response.message || 'Unable to review this assignment with AI.');
    return response.data;
  };

  return (
    <div className="space-y-5">
      <header className="border-b border-slate-100 pb-5">
        <Link href={`/lecturer/courses/${encodeURIComponent(courseId)}/assignments`} className="inline-flex items-center gap-2 text-xs font-bold text-slate-500"><ArrowLeft size={14} /> Course assignments</Link>
        <h1 className="mt-3 text-xl font-black text-slate-900">{data?.assignment.name ?? 'Assignment submissions'}</h1>
        <p className="mt-1 text-xs text-slate-500">{data?.course.course ?? courseId} · Maximum mark {data?.assignment.maximum_grade ?? '—'}</p>
      </header>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
      {loading ? <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">Loading student submissions…</p>
        : data?.submissions.length ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Student</th><th className="px-5 py-3">Student ID</th><th className="px-5 py-3">Submitted</th><th className="px-5 py-3">Mark</th><th className="px-5 py-3">Review</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {data.submissions.map((submission) => (
                    <tr key={submission.student_id} className="hover:bg-slate-50">
                      <td className="px-5 py-4"><p className="font-bold text-slate-900">{submission.student_name}</p><p className="text-xs text-slate-500">{submission.email || 'No email recorded'}</p></td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-700">{submission.student_id}</td>
                      <td className="px-5 py-4 text-xs text-slate-600">{new Date(submission.submitted_at).toLocaleString()}</td>
                      <td className="px-5 py-4">{submission.grade === null ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">Pending</span> : <span className="text-xs font-black text-emerald-800">{submission.grade} / {submission.maximum_grade}</span>}</td>
                      <td className="px-5 py-4"><button type="button" onClick={() => setSelected(submission)} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white"><BookOpenCheck size={14} /> {submission.grade === null ? 'Read and mark' : 'Review / edit mark'}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : !error ? <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-semibold text-slate-500">There are no student submissions for this assignment yet.</p> : null}
      {selected && data?.assignment && <AssignmentReader
        key={`${selected.student_id}-${selected.assignment_id}`}
        isOpen
        onClose={() => setSelected(null)}
        studentName={selected.student_name}
        assignmentTitle={selected.assignment_name}
        assignmentContent={selected.submission_text}
        maximumGrade={data.assignment.maximum_grade}
        initialGrade={selected.grade}
        initialFeedback={selected.feedback ?? ''}
        initialAnnotations={selected.annotations}
        onSaveFeedback={saveMark}
        onAiCheck={reviewWithAi}
      />}
    </div>
  );
}
