'use client';

import { useEffect, useState } from 'react';
import { Download, Eye, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { exportBrandedPdf } from '@/lib/branded-pdf';

type StudentGrade = {
  course_id: string;
  course_name: string;
  item_name: string;
  item_type: string;
  item_module: string | null;
  maximum_grade: number;
  grade: number | null;
  feedback: string;
};

type GradesResponse = { data: StudentGrade[] };

export default function StudentGradesPage() {
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'view' | 'download' | null>(null);

  const exportTranscript = async (mode: 'view' | 'download') => {
    setExporting(mode);
    setError('');
    try {
      await exportBrandedPdf(async () => {
        const response = await api.students.myProfile() as { data: { student: { name: string; student_id: string; class: string } } };
        const student = response.data.student;
        const courses = Array.from(new Set(grades.map((grade) => grade.course_name)));
        return {
          title: 'Academic Transcript',
          subtitle: 'Published gradebook results for enrolled courses',
          fileName: `Rhema-Transcript-${student.student_id}`,
          student: { name: student.name, id: student.student_id, cohort: student.class },
          sections: courses.map((courseName) => ({
            title: courseName,
            columns: ['Assessment', 'Type', 'Grade', 'Maximum', 'Feedback'],
            rows: grades.filter((grade) => grade.course_name === courseName).map((grade) => [
              grade.item_name || 'Course total',
              grade.item_module || grade.item_type,
              grade.grade === null ? 'Pending' : String(grade.grade),
              String(grade.maximum_grade),
              grade.feedback || '—',
            ]),
          })),
        };
      }, mode);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to prepare your transcript PDF.');
    } finally {
      setExporting(null);
    }
  };

  useEffect(() => {
    let active = true;
    (api.students.myGrades() as Promise<GradesResponse>)
      .then((response: GradesResponse) => {
        if (active) setGrades(response.data);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load your grades.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">My grades</h1>
          <p className="mt-1 text-sm text-slate-500">Published gradebook results for your enrolled courses.</p>
        </div>
        {!loading && !error && grades.length > 0 && <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void exportTranscript('view')} disabled={exporting !== null} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60">
            {exporting === 'view' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}View transcript PDF
          </button>
          <button type="button" onClick={() => void exportTranscript('download')} disabled={exporting !== null} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60">
            {exporting === 'download' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Download transcript PDF
          </button>
        </div>}
      </header>
      {loading ? (
        <div className="flex items-center gap-2 p-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading grades…</div>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : grades.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No published grades are available for your enrolled courses yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="p-4">Course</th><th className="p-4">Assessment</th><th className="p-4">Type</th><th className="p-4 text-right">Grade</th><th className="p-4">Feedback</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {grades.map((grade, index) => (
                <tr key={`${grade.course_id}-${grade.item_name}-${index}`}>
                  <td className="p-4 font-semibold text-slate-800">{grade.course_name}</td>
                  <td className="p-4 text-slate-700">{grade.item_name || 'Course total'}</td>
                  <td className="p-4 capitalize text-slate-500">{grade.item_module || grade.item_type}</td>
                  <td className="p-4 text-right font-mono font-semibold text-slate-800">{grade.grade === null ? 'Pending' : `${grade.grade} / ${grade.maximum_grade}`}</td>
                  <td className="p-4 text-slate-500">{grade.feedback || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
