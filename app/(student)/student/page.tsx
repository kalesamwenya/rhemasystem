'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, BookOpen, Calendar, Clock, FileText, GraduationCap } from 'lucide-react';
import { api } from '@/lib/api';

type StudentCourse = {
  id: string;
  course: string;
  description: string;
  cohortName: string;
  sessionCount: number;
  attendedSessionCount?: number;
  progressPercent?: number;
  enrolled: boolean;
};

type CourseSession = {
  id: string | number;
  course: string;
  session_date: string;
  start_time: string;
  end_time: string;
  notes: string;
};

type UpcomingAssessment = {
  type: 'assignment' | 'quiz' | 'exam';
  id: number;
  name: string;
  course_id: string;
  course_name: string;
  opens_at: number;
  due_at: number;
};

type StudentDashboardResponse = {
  success?: boolean;
  message?: string;
  data?: { student: { name: string; cohort: string }; courses: StudentCourse[] };
};

type StudentScheduleResponse = {
  success?: boolean;
  message?: string;
  data?: { sessions: CourseSession[] };
};

type UpcomingAssessmentsResponse = {
  success?: boolean;
  message?: string;
  data?: UpcomingAssessment[];
};

type StudentDataStatus = {
  cohort: string;
  available_courses: number;
  active_enrollments: number;
  scheduled_sessions: number;
  learning_tables_installed: boolean;
  missing_learning_tables: string[];
  student_moodle_mapped: boolean;
};

type StudentDataStatusResponse = {
  success?: boolean;
  message?: string;
  data?: StudentDataStatus;
};

export default function StudentDashboardPage() {
  const [studentName, setStudentName] = useState('');
  const [cohort, setCohort] = useState('');
  const [courses, setCourses] = useState<StudentCourse[]>([]);
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [assessments, setAssessments] = useState<UpcomingAssessment[]>([]);
  const [assessmentError, setAssessmentError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataStatus, setDataStatus] = useState<StudentDataStatus | null>(null);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      api.courses.studentCatalog() as Promise<StudentDashboardResponse>,
      api.courses.studentSchedule() as Promise<StudentScheduleResponse>,
      api.students.myDataStatus() as Promise<StudentDataStatusResponse>,
      api.courses.studentUpcomingAssessments() as Promise<UpcomingAssessmentsResponse>,
    ]).then(([courseResult, scheduleResult, statusResult, assessmentResult]) => {
      if (!active) return;
      const errors: string[] = [];

      if (courseResult.status === 'fulfilled' && courseResult.value.success && courseResult.value.data) {
        setStudentName(courseResult.value.data.student.name);
        setCohort(courseResult.value.data.student.cohort);
        setCourses(courseResult.value.data.courses.filter((course) => course.enrolled));
      } else {
        errors.push(courseResult.status === 'rejected'
          ? courseResult.reason instanceof Error ? courseResult.reason.message : 'Unable to load your enrolled courses.'
          : courseResult.value.message || 'Unable to load your enrolled courses.');
      }

      if (scheduleResult.status === 'fulfilled' && scheduleResult.value.success && scheduleResult.value.data) {
        setSessions(scheduleResult.value.data.sessions);
      } else {
        errors.push(scheduleResult.status === 'rejected'
          ? scheduleResult.reason instanceof Error ? scheduleResult.reason.message : 'Unable to load your course schedule.'
          : scheduleResult.value.message || 'Unable to load your course schedule.');
      }

      if (statusResult.status === 'fulfilled' && statusResult.value.success && statusResult.value.data) {
        setDataStatus(statusResult.value.data);
        setCohort(statusResult.value.data.cohort);
      } else if (statusResult.status === 'rejected') {
        errors.push(statusResult.reason instanceof Error ? statusResult.reason.message : 'Unable to inspect student data availability.');
      }

      if (assessmentResult.status === 'fulfilled' && assessmentResult.value.success && assessmentResult.value.data) {
        setAssessments(assessmentResult.value.data);
      } else {
        setAssessmentError(assessmentResult.status === 'rejected'
          ? assessmentResult.reason instanceof Error ? assessmentResult.reason.message : 'Unable to load upcoming assessments.'
          : assessmentResult.value.message || 'Unable to load upcoming assessments.');
      }
      if (errors.length) setError(errors.join(' '));
      setLoading(false);
    }).catch((cause: unknown) => {
      if (active) {
        setError(cause instanceof Error ? cause.message : 'Unable to load your student dashboard.');
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingSessions = sessions
    .filter((session) => new Date(`${session.session_date}T12:00:00`) >= today)
    .sort((a, b) => `${a.session_date} ${a.start_time}`.localeCompare(`${b.session_date} ${b.start_time}`))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Student Desk</h1>
          <p className="mt-1 text-sm text-slate-500">
            {studentName ? `Welcome, ${studentName}. Your live academic overview for cohort ${cohort}.` : 'Your live academic overview.'}
          </p>
        </div>
        <Link href="/student/schedule" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600 shadow-sm">
          <Calendar className="h-4 w-4 text-blue-900" /> View schedule
        </Link>
      </div>

      {error && <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}

      {dataStatus && (
        <section aria-label="Student data status" className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
          <p className="font-bold text-slate-800">Your account data · {dataStatus.cohort}</p>
          <p className="mt-1">Eligible courses: {dataStatus.available_courses} · Active enrollments: {dataStatus.active_enrollments} · Scheduled sessions: {dataStatus.scheduled_sessions}</p>
          {dataStatus.available_courses === 0 && <p className="mt-2 text-amber-800">No courses are configured for this cohort. The administrator should run php-api/courses/seedBibleSchoolCourses.sql against the same database used by the student API.</p>}
          {dataStatus.available_courses > 0 && dataStatus.active_enrollments === 0 && <p className="mt-2 text-amber-800">You have eligible courses but no active enrollments. Open Course Catalog and enroll in the courses for your cohort.</p>}
          {!dataStatus.learning_tables_installed && <p className="mt-2 text-amber-800">The learning database tables are incomplete. Missing: {dataStatus.missing_learning_tables.join(', ')}. Ask the administrator to import php-api/moodle_learning_extension.sql in the same database.</p>}
          {dataStatus.learning_tables_installed && !dataStatus.student_moodle_mapped && <p className="mt-2 text-amber-800">Your student account is not linked to the gradebook user record. Grades cannot appear until the school links those accounts.</p>}
        </section>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'Active Enrollments', value: String(courses.length), icon: BookOpen, color: 'text-blue-900 bg-blue-50' },
          { label: 'Scheduled Sessions', value: String(sessions.length), icon: Calendar, color: 'text-yellow-600 bg-yellow-50' },
          { label: 'Assigned Cohort', value: cohort || '—', icon: GraduationCap, color: 'text-emerald-600 bg-emerald-50' },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{metric.label}</span>
                <p className="text-2xl font-black text-slate-900">{loading ? '…' : metric.value}</p>
              </div>
              <div className={`rounded-xl p-3 ${metric.color}`}><Icon className="h-6 w-6" /></div>
            </div>
          );
        })}
      </div>

      <section aria-labelledby="upcoming-assessments-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="upcoming-assessments-heading" className="text-xl font-bold tracking-tight text-slate-900">Upcoming Assessments</h2>
            <p className="mt-1 text-xs text-slate-500">Assignments, quizzes, and exams for your active courses.</p>
          </div>
          <Link href="/student/assignments" className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-900 hover:underline">
            All assignments <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {assessmentError && <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertCircle className="h-4 w-4 shrink-0" />{assessmentError}</div>}
        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading upcoming assessments...</div>
        ) : assessments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">There are no upcoming assignments, quizzes, or exams for your active courses.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {assessments.slice(0, 6).map((assessment) => {
              const assessmentPath = assessment.type === 'assignment'
                ? `/student/courses/${encodeURIComponent(assessment.course_id)}/assignment?assessment_id=${assessment.id}`
                : `/student/courses/${encodeURIComponent(assessment.course_id)}/quiz?assessment_id=${assessment.id}`;
              const typeLabel = assessment.type === 'exam' ? 'Exam' : assessment.type === 'quiz' ? 'Quiz' : 'Assignment';
              const assessmentDate = assessment.due_at
                ? `${assessment.type === 'assignment' ? 'Due' : assessment.due_at === assessment.opens_at ? 'Opens' : 'Closes'} ${new Date(assessment.due_at * 1000).toLocaleString()}`
                : 'Available now';
              return (
                <Link key={`${assessment.type}-${assessment.course_id}-${assessment.id}`} href={assessmentPath} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-900/30">
                  <div className="rounded-xl bg-blue-50 p-2.5 text-blue-900"><FileText className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">{typeLabel}</span>
                      <span className="truncate text-[11px] font-semibold text-blue-900">{assessment.course_name}</span>
                    </div>
                    <h3 className="mt-1 truncate text-sm font-bold text-slate-900">{assessment.name}</h3>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500"><Clock className="h-3.5 w-3.5" />{assessmentDate}</p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-blue-900" />
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">My Courses</h2>
            <Link href="/student/courses" className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-900 hover:underline">
              Course catalog <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {loading ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading enrolled courses...</div>
          ) : courses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
              <BookOpen className="mx-auto h-7 w-7 text-slate-300" />
              <p className="mt-2 text-sm font-bold text-slate-700">No active course enrollments yet.</p>
              <Link href="/student/courses" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-900 hover:underline">Browse eligible courses <ArrowRight className="h-3 w-3" /></Link>
            </div>
          ) : (
            <div className="space-y-4">
              {courses.map((course) => (
                <Link key={course.id} href={`/student/courses/${encodeURIComponent(course.id)}`} className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-900/30">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="inline-block rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-700">{course.id}</span>
                      <h3 className="mt-2 text-base font-bold text-slate-900">{course.course}</h3>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{course.description || 'Course details will be added by the academic office.'}</p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-blue-900" />
                  </div>
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-bold text-slate-700">Session attendance progress</span>
                      <span className="font-black text-blue-900">
                        {course.sessionCount > 0 ? `${course.progressPercent ?? 0}%` : 'Not scheduled'}
                      </span>
                    </div>
                    <div
                      role="progressbar"
                      aria-label={`${course.course} session attendance progress`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={course.progressPercent ?? 0}
                      className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
                    >
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, course.progressPercent ?? 0))}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-[10px] text-slate-500">
                      {course.attendedSessionCount ?? 0} of {course.sessionCount} sessions attended · Cohort {course.cohortName}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Upcoming Sessions</h2>
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {loading ? <p className="text-sm text-slate-500">Loading your schedule...</p> : upcomingSessions.length === 0 ? (
              <p className="text-sm text-slate-500">There are no upcoming sessions for your active enrollments.</p>
            ) : upcomingSessions.map((session) => (
              <div key={session.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-blue-900">{session.course}</span>
                  <span className="text-[10px] font-semibold text-slate-500">{new Date(`${session.session_date}T12:00:00`).toLocaleDateString()}</span>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600"><Clock className="h-3 w-3" />{session.start_time}–{session.end_time}</p>
                {session.notes && <p className="mt-1 text-xs text-slate-500">{session.notes}</p>}
              </div>
            ))}
            <Link href="/student/schedule" className="inline-flex items-center gap-1 text-xs font-bold text-blue-900 hover:underline">Full schedule <ArrowRight className="h-3 w-3" /></Link>
          </div>
        </section>
      </div>
    </div>
  );
}
