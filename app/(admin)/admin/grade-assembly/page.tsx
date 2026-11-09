'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Loader2, Printer, Save, Search } from 'lucide-react';
import { api } from '@/lib/api';
import AcademicTranscriptPrint from '@/components/grades/AcademicTranscriptPrint';
import {
  calculateGpa,
  summarizeCourseGrades,
  type StudentGrade,
} from '@/lib/student-grades';

type Student = { student_id: string; name: string; class: string };
type GradeResponse = { data?: StudentGrade[]; message?: string };
type RosterResponse = { data?: Student[]; message?: string };
type CourseHoursForm = { sessions: string; hours: string };

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function GradeAssemblyPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [search, setSearch] = useState('');
  const [cohortFilter, setCohortFilter] = useState('all');
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [savingCourseId, setSavingCourseId] = useState('');
  const [courseTotals, setCourseTotals] = useState<Record<string, CourseHoursForm>>({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    (api.students.adminRoster() as Promise<RosterResponse>)
      .then((response) => {
        if (!response.data) throw new Error(response.message ?? 'The student roster was not returned.');
        if (active) setStudents(response.data);
      })
      .catch((cause: unknown) => {
        if (active) setError(messageOf(cause, 'Unable to load the student roster.'));
      })
      .finally(() => {
        if (active) setLoadingRoster(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedStudentId) {
      setGrades([]);
      setCourseTotals({});
      return;
    }
    let active = true;
    setLoadingGrades(true);
    setError('');
    setNotice('');
    (api.students.adminGrades(selectedStudentId) as Promise<GradeResponse>)
      .then((response) => {
        if (!Array.isArray(response.data)) throw new Error(response.message ?? 'Student grades were not returned.');
        if (!active) return;
        setGrades(response.data);
        const courses = summarizeCourseGrades(response.data);
        setCourseTotals(Object.fromEntries(courses.map((course) => {
          const courseGrades = response.data?.filter((grade) => grade.course_id === course.course_id) ?? [];
          const firstGrade = courseGrades[0];
          return [course.course_id, {
            sessions: String(firstGrade?.session_count_override ?? firstGrade?.scheduled_sessions ?? course.scheduled_sessions),
            hours: String(firstGrade?.course_hours_override ?? firstGrade?.scheduled_hours ?? course.scheduled_hours),
          }];
        })));
      })
      .catch((cause: unknown) => {
        if (active) setError(messageOf(cause, 'Unable to load the selected student’s grades.'));
      })
      .finally(() => {
        if (active) setLoadingGrades(false);
      });
    return () => { active = false; };
  }, [selectedStudentId]);

  const cohorts = useMemo(() => [...new Set(students.map((student) => student.class).filter(Boolean))].sort(), [students]);
  const visibleStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return students.filter((student) =>
      (cohortFilter === 'all' || student.class === cohortFilter)
      && (!term || `${student.name} ${student.student_id} ${student.class}`.toLowerCase().includes(term)),
    );
  }, [cohortFilter, search, students]);
  const selectedStudent = students.find((student) => student.student_id === selectedStudentId) ?? null;
  const courseSummaries = useMemo(() => summarizeCourseGrades(grades), [grades]);
  const levelOneGpa = calculateGpa(courseSummaries, 1);
  const levelTwoGpa = calculateGpa(courseSummaries, 2);
  const cumulativeGpa = calculateGpa(courseSummaries);

  const saveTotals = async (courseId: string) => {
    const course = courseSummaries.find((item) => item.course_id === courseId);
    const form = courseTotals[courseId];
    if (!course || !form || !course.session_period) {
      setError('This course does not have a session period for saving its totals.');
      return;
    }
    const sessions = form.sessions.trim() === '' ? null : Number(form.sessions);
    const hours = form.hours.trim() === '' ? null : Number(form.hours);
    if ((sessions !== null && (!Number.isInteger(sessions) || sessions < 0))
      || (hours !== null && (!Number.isFinite(hours) || hours < 0))) {
      setError('Enter a non-negative whole number of sessions and valid course hours, or leave a field blank to use its scheduled total.');
      return;
    }
    setSavingCourseId(courseId);
    setError('');
    setNotice('');
    try {
      const response = await api.students.saveCourseSessionTotals({
        course_id: courseId,
        session_period: course.session_period,
        session_count_override: sessions,
        course_hours_override: hours,
      }) as { success?: boolean; message?: string };
      if (!response.success) throw new Error(response.message ?? 'Unable to save course totals.');
      setNotice(response.message ?? 'Course totals saved.');
      const refreshed = await api.students.adminGrades(selectedStudentId) as GradeResponse;
      if (!Array.isArray(refreshed.data)) throw new Error(refreshed.message ?? 'Saved totals could not be reloaded.');
      setGrades(refreshed.data);
      setCourseTotals((current) => ({
        ...current,
        [courseId]: {
          sessions: sessions === null ? String(course.scheduled_sessions) : String(sessions),
          hours: hours === null ? String(course.scheduled_hours) : hours.toFixed(2),
        },
      }));
    } catch (cause) {
      setError(messageOf(cause, 'Unable to save course totals.'));
    } finally {
      setSavingCourseId('');
    }
  };

  return (
    <main className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-600">Academic department</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Grade assembly &amp; transcripts</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          Review published course totals, assemble Level 1 and Level 2 GPAs, confirm course sessions and hours, and print a two-sided transcript.
        </p>
      </header>

      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_220px]">
        <label className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a student by name or ID" aria-label="Search students" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm outline-none focus:border-blue-700" />
        </label>
        <select value={cohortFilter} onChange={(event) => setCohortFilter(event.target.value)} aria-label="Filter students by cohort" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700">
          <option value="all">All cohorts</option>
          {cohorts.map((cohort) => <option key={cohort} value={cohort}>{cohort}</option>)}
        </select>
        <label className="md:col-span-2">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Student</span>
          <select value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)} disabled={loadingRoster} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800">
            <option value="">{loadingRoster ? 'Loading students…' : 'Select a student'}</option>
            {visibleStudents.map((student) => <option key={student.student_id} value={student.student_id}>{student.name} · {student.student_id} · {student.class}</option>)}
          </select>
        </label>
      </section>

      {loadingGrades ? (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading academic record…</div>
      ) : selectedStudent && grades.length > 0 ? (
        <>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-black text-slate-900">{selectedStudent.name}</h2>
              <p className="text-sm text-slate-500">{selectedStudent.student_id} · Current cohort {selectedStudent.class}</p>
            </div>
            <button type="button" onClick={() => window.print()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800">
              <Printer className="h-4 w-4" /> Print front &amp; back transcript
            </button>
          </div>

          <section aria-label="Grade point averages" className="grid gap-3 sm:grid-cols-3">
            {[['Level 1 GPA · first year', levelOneGpa], ['Level 2 GPA · second year', levelTwoGpa], ['Cumulative GPA', cumulativeGpa]].map(([label, gpa]) => (
              <article key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
                <p className="mt-2 text-3xl font-black text-blue-950">{typeof gpa === 'number' ? gpa.toFixed(2) : 'Pending'}</p>
                <p className="mt-1 text-xs text-slate-500">4.0 scale · equal course weighting</p>
              </article>
            ))}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="font-bold text-slate-900">Course results &amp; workload</h2>
              <p className="mt-1 text-xs text-slate-500">Final course scores are read from the published gradebook. Schedule totals can be corrected by the academic department.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="p-4">Course</th><th className="p-4">Level</th><th className="p-4 text-right">Course grade</th><th className="p-4 text-right">Letter / GPA</th><th className="p-4 text-right">Sessions</th><th className="p-4 text-right">Hours</th><th className="p-4"></th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {courseSummaries.map((course) => (
                    <tr key={course.course_id}>
                      <td className="p-4">
                        <p className="font-semibold text-slate-800">{course.course_name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{course.cohort_name} · {course.session_period || 'period unavailable'}</p>
                      </td>
                      <td className="p-4 text-slate-600">{course.academic_level ? `Level ${course.academic_level}` : 'Unmapped'}</td>
                      <td className="p-4 text-right font-mono text-slate-700">{course.grade === null ? 'Pending' : `${course.grade.toFixed(2)} / ${course.maximum_grade.toFixed(2)} · ${course.percentage?.toFixed(2)}%`}</td>
                      <td className="p-4 text-right font-semibold text-slate-800">{course.letter_grade ?? '—'}{course.grade_points === null ? '' : ` · ${course.grade_points.toFixed(1)}`}</td>
                      <td className="p-4">
                        <input aria-label={`${course.course_name} total sessions`} type="number" min="0" step="1" value={courseTotals[course.course_id]?.sessions ?? ''} onChange={(event) => setCourseTotals((current) => ({ ...current, [course.course_id]: { ...current[course.course_id], sessions: event.target.value, hours: current[course.course_id]?.hours ?? '' } }))} className="w-24 rounded-lg border border-slate-200 px-2 py-2 text-right font-mono text-sm" />
                        <p className="mt-1 text-right text-[10px] text-slate-400">Scheduled {course.scheduled_sessions}</p>
                      </td>
                      <td className="p-4">
                        <input aria-label={`${course.course_name} total hours`} type="number" min="0" step="0.25" value={courseTotals[course.course_id]?.hours ?? ''} onChange={(event) => setCourseTotals((current) => ({ ...current, [course.course_id]: { ...current[course.course_id], hours: event.target.value, sessions: current[course.course_id]?.sessions ?? '' } }))} className="w-24 rounded-lg border border-slate-200 px-2 py-2 text-right font-mono text-sm" />
                        <p className="mt-1 text-right text-[10px] text-slate-400">Scheduled {course.scheduled_hours.toFixed(2)}</p>
                      </td>
                      <td className="p-4 text-right">
                        <button type="button" onClick={() => void saveTotals(course.course_id)} disabled={savingCourseId !== '' || !course.session_period} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                          {savingCourseId === course.course_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <p className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-900">
            <BookOpen className="mt-0.5 h-4 w-4 shrink-0" />
            A 4.0 scale is used: A 80–100 (4.0), B 70–79.99 (3.0), C 60–69.99 (2.0), D 50–59.99 (1.0), and F below 50 (0.0). Each published course total contributes equally to GPA. Blank workload values use scheduled totals.
          </p>
          <AcademicTranscriptPrint student={selectedStudent} grades={grades} />
        </>
      ) : selectedStudent && !error ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="font-semibold text-slate-800">No course grade records are available yet.</p>
          <p className="mt-1 text-sm text-slate-500">Published course totals will appear here when the gradebook has been synchronized.</p>
        </div>
      ) : null}
    </main>
  );
}
