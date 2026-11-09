'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Download, Eye, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { exportBrandedPdf } from '@/lib/branded-pdf';
import { formatGrade, getCourseTotal, getGradePercentage, summarizeGrades, type StudentGrade } from '@/lib/student-grades';

type GradesResponse = { data: StudentGrade[] };

export default function StudentGradesPage() {
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'view' | 'download' | null>(null);
  const overallSummary = summarizeGrades(grades);
  const courseSummaries = Array.from(
    grades.reduce((courses, grade) => {
      const current = courses.get(grade.course_id) || { name: grade.course_name, grades: [] as StudentGrade[] };
      current.grades.push(grade);
      courses.set(grade.course_id, current);
      return courses;
    }, new Map<string, { name: string; grades: StudentGrade[] }>()),
    ([id, course]) => ({ id, ...course, summary: summarizeGrades(course.grades) }),
  );

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
          subtitle: 'Published gradebook results and cumulative activity grades for enrolled courses',
          fileName: `Rhema-Transcript-${student.student_id}`,
          student: { name: student.name, id: student.student_id, cohort: student.class },
          sections: [
            {
              title: 'Cumulative activity grade',
              columns: ['Activities graded', 'Cumulative grade', 'Percentage'],
              rows: [[
                `${overallSummary.gradedActivityCount} of ${overallSummary.activityCount}`,
                overallSummary.possible > 0 ? `${formatGrade(overallSummary.earned)} / ${formatGrade(overallSummary.possible)}` : 'Pending',
                overallSummary.percentage === null ? 'Pending' : `${overallSummary.percentage.toFixed(1)}%`,
              ]],
            },
            ...courses.map((courseName) => ({
            title: courseName,
            columns: ['Assessment', 'Type', 'Grade', 'Maximum'],
            rows: grades.filter((grade) => grade.course_name === courseName).map((grade) => [
              grade.item_name || 'Course total',
              grade.item_module || grade.item_type,
              grade.grade === null ? 'Pending' : String(grade.grade),
              String(grade.maximum_grade),
            ]),
            })),
          ],
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
        <>
          <section aria-label="Cumulative activity grades" className="grid gap-3">
            <article className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-950 to-blue-800 p-5 text-white shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-100">Cumulative grade · all courses</p>
              <p className="mt-2 text-3xl font-black">
                {overallSummary.possible > 0
                  ? `${formatGrade(overallSummary.earned)} / ${formatGrade(overallSummary.possible)}`
                  : 'Pending'}
              </p>
              <p className="mt-1 text-sm text-blue-100">
                {overallSummary.percentage === null ? 'No activities graded yet' : `${overallSummary.percentage.toFixed(1)}%`}
                {' · '}{overallSummary.gradedActivityCount} of {overallSummary.activityCount} activities graded
              </p>
            </article>
          </section>
          <section aria-label="Course grades" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-bold text-slate-900">Grades by course</h2>
              <p className="mt-1 text-xs text-slate-500">Select a course to see its published assessment results.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="p-4">Course</th><th className="p-4">Assessments graded</th><th className="p-4 text-right">Course grade</th><th className="p-4"></th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {courseSummaries.map((course, index) => {
                    const publishedTotal = getCourseTotal(course.grades);
                    const totalPercentage = publishedTotal ? getGradePercentage(publishedTotal) : course.summary.percentage;
                    const shownGrade = publishedTotal?.grade !== null && publishedTotal?.grade !== undefined
                      ? `${formatGrade(publishedTotal.grade)} / ${formatGrade(publishedTotal.maximum_grade)}`
                      : course.summary.possible > 0
                        ? `${formatGrade(course.summary.earned)} / ${formatGrade(course.summary.possible)}`
                        : 'Pending';
                    return (
                      <tr key={course.id} className={index % 2 === 0 ? 'bg-slate-50/70' : 'bg-white'}>
                        <td className="p-4">
                          <Link href={`/student/grades/${encodeURIComponent(course.id)}`} className="font-semibold text-blue-900 hover:text-blue-700 hover:underline">
                            {course.name}
                          </Link>
                        </td>
                        <td className="p-4 text-slate-600">{course.summary.gradedActivityCount} of {course.summary.activityCount}</td>
                        <td className="p-4 text-right font-mono font-semibold text-slate-800">
                          {shownGrade}
                          <span className="ml-2 text-xs font-sans text-slate-500">
                            {totalPercentage === null ? '' : `${totalPercentage.toFixed(2)}%`}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <Link aria-label={`View ${course.name} grade details`} href={`/student/grades/${encodeURIComponent(course.id)}`} className="inline-flex items-center gap-1 text-xs font-bold text-blue-900 hover:underline">
                            Details <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
