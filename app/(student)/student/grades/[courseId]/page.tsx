'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { formatGrade, getCourseTotal, getGradePercentage, getLetterGrade, getGradePoints, isActivityGrade, summarizeGrades, summarizeCourseGrades, type StudentGrade } from '@/lib/student-grades';

type GradesResponse = { data: StudentGrade[] };

function activityType(grade: StudentGrade) {
  const moduleName = grade.item_module || grade.item_type;
  const labels: Record<string, string> = { assign: 'Assignment', quiz: 'Quiz', lesson: 'Lesson', workshop: 'Workshop' };
  return labels[moduleName.toLowerCase()] ?? moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
}

export default function StudentCourseGradesPage() {
  const params = useParams<{ courseId: string }>();
  const courseId = String(params.courseId ?? '');
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (api.students.myGrades() as Promise<GradesResponse>)
      .then((response) => {
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

  const courseGrades = useMemo(
    () => grades.filter((grade) => String(grade.course_id) === courseId),
    [courseId, grades],
  );
  const activities = courseGrades.filter(isActivityGrade);
  const summary = summarizeGrades(courseGrades);
  const courseSummary = summarizeCourseGrades(courseGrades)[0];
  const courseTotal = getCourseTotal(courseGrades);
  const hasPublishedTotal = courseTotal?.grade !== null && courseTotal?.grade !== undefined;
  const totalGrade = courseTotal && courseTotal.grade !== null
    ? `${formatGrade(courseTotal.grade)} / ${formatGrade(courseTotal.maximum_grade)}`
    : summary.possible > 0
      ? `${formatGrade(summary.earned)} / ${formatGrade(summary.possible)}`
      : 'Pending';
  const totalPercentage = courseTotal && courseTotal.grade !== null
    ? getGradePercentage(courseTotal)
    : summary.percentage;

  return (
    <main className="space-y-6">
      <Link href="/student/grades" className="inline-flex items-center gap-2 text-sm font-bold text-blue-900 hover:underline">
        <ArrowLeft className="h-4 w-4" /> All grades
      </Link>

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading course grades…
        </div>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : courseGrades.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <h1 className="text-lg font-bold text-slate-900">Course grades not found</h1>
          <p className="mt-2 text-sm text-slate-500">There are no published grade records for this course.</p>
        </div>
      ) : (
        <>
          <header className="border-b border-slate-200 pb-5">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-900">Course grade breakdown</p>
            <h1 className="mt-1 text-2xl font-black text-slate-900">{courseGrades[0].course_name}</h1>
            <p className="mt-1 text-sm text-slate-500">Published marks for quizzes, assignments, and other course activities.</p>
          </header>

          <section aria-label="Course total" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Course total</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{totalGrade}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {hasPublishedTotal ? 'Published course grade' : 'Calculated from graded activities; the published course total is not available yet.'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Level {courseSummary?.academic_level ?? '—'} · {courseSummary?.course_sessions ?? 0} sessions · {courseSummary?.course_hours.toFixed(2) ?? '0.00'} hours
                </p>
              </div>
              <p className="text-xl font-black text-blue-900">
                {totalPercentage === null
                  ? 'Pending'
                  : `${totalPercentage.toFixed(2)}% · ${getLetterGrade(totalPercentage)} · ${getGradePoints(totalPercentage).toFixed(1)} GPA`}
              </p>
            </div>
          </section>

          <section aria-label="Assessment grades" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-bold text-slate-900">Assessment results</h2>
              <p className="mt-1 text-xs text-slate-500">{summary.gradedActivityCount} of {summary.activityCount} activities graded</p>
            </div>
            {activities.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">No graded activities are available for this course yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="p-4">Assessment</th>
                      <th className="p-4">Type</th>
                      <th className="p-4 text-right">Grade</th>
                      <th className="p-4 text-right">Range</th>
                      <th className="p-4 text-right">Percentage</th>
                      <th className="p-4">Feedback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activities.map((grade, index) => {
                      const percentage = getGradePercentage(grade);
                      return (
                        <tr key={`${grade.item_module}-${grade.item_name}-${index}`} className={index % 2 === 0 ? 'bg-slate-50/70' : 'bg-white'}>
                          <td className="p-4 font-semibold text-slate-800">{grade.item_name || 'Assessment'}</td>
                          <td className="p-4 text-slate-600">{activityType(grade)}</td>
                          <td className="p-4 text-right font-mono font-semibold text-slate-800">
                            {grade.grade === null ? 'Pending' : formatGrade(grade.grade)}
                          </td>
                          <td className="p-4 text-right font-mono text-slate-600">
                            {formatGrade(grade.minimum_grade ?? 0)}–{formatGrade(grade.maximum_grade)}
                          </td>
                          <td className="p-4 text-right font-semibold text-slate-700">
                            {percentage === null ? '—' : `${percentage.toFixed(2)}%`}
                          </td>
                          <td className="max-w-sm whitespace-pre-wrap p-4 text-xs leading-5 text-slate-600">{grade.feedback || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
