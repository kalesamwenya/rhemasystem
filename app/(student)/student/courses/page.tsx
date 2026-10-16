'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDownUp, ArrowRight, BookOpen, Calendar, Check, Search, ShieldAlert, User } from 'lucide-react';
import { api } from '@/lib/api';

type StudentCourse = {
  id: string;
  course: string;
  description: string;
  cohortName: string;
  sessionCount: number;
  attendedSessionCount: number;
  progressPercent: number;
  enrolled: boolean;
};

type StudentCoursesResponse = {
  success?: boolean;
  message?: string;
  data?: {
    student: { id: string; name: string; cohort: string };
    courses: StudentCourse[];
  };
};

const supportedCohorts = ['FYM', 'FYE', 'SYM', 'SYE'];

export default function StudentCoursesPage() {
  const router = useRouter();
  const [studentName, setStudentName] = useState('');
  const [cohort, setCohort] = useState('');
  const [courses, setCourses] = useState<StudentCourse[]>([]);
  const [activeTab, setActiveTab] = useState<'my-courses' | 'catalog'>('my-courses');
  const [search, setSearch] = useState('');
  const [progressFilter, setProgressFilter] = useState<'all' | 'not-started' | 'in-progress' | 'complete'>('all');
  const [sortOrder, setSortOrder] = useState<'name-asc' | 'name-desc' | 'progress-desc' | 'progress-asc'>('name-asc');
  const [loading, setLoading] = useState(true);
  const [busyCourseId, setBusyCourseId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    const loadCourses = async () => {
      try {
        const rawUser = window.localStorage.getItem('rhema_user');
        if (!rawUser) throw new Error('Sign in with your student account to view courses.');
        let user: { role?: string };
        try {
          user = JSON.parse(rawUser) as typeof user;
        } catch {
          throw new Error('Your saved sign-in session is invalid. Sign in again.');
        }
        if (user.role !== 'student') {
          throw new Error('A valid student account is required to view eligible courses.');
        }

        const response = await api.courses.studentCatalog() as StudentCoursesResponse;
        if (!response.success || !response.data) {
          throw new Error(response.message ?? 'Unable to load courses for your cohort.');
        }
        if (!active) return;
        setStudentName(response.data.student.name);
        setCohort(response.data.student.cohort);
        setCourses(response.data.courses);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load your courses.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadCourses();
    return () => { active = false; };
  }, []);

  const currentCourses = useMemo(() => courses.filter((course) => course.enrolled), [courses]);
  const availableCourses = useMemo(() => courses.filter((course) => !course.enrolled), [courses]);
  const filteredCourses = (items: StudentCourse[]) => items
    .filter((course) => `${course.course} ${course.id} ${course.description}`.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((course) => {
      if (activeTab === 'catalog' || progressFilter === 'all') return true;
      if (progressFilter === 'not-started') return course.progressPercent === 0;
      if (progressFilter === 'complete') return course.sessionCount > 0 && course.progressPercent === 100;
      return course.progressPercent > 0 && course.progressPercent < 100;
    })
    .sort((a, b) => {
      if (sortOrder === 'progress-desc') return b.progressPercent - a.progressPercent || a.course.localeCompare(b.course);
      if (sortOrder === 'progress-asc') return a.progressPercent - b.progressPercent || a.course.localeCompare(b.course);
      const nameOrder = a.course.localeCompare(b.course);
      return sortOrder === 'name-desc' ? -nameOrder : nameOrder;
    });

  const enroll = async (course: StudentCourse) => {
    setBusyCourseId(course.id);
    setError('');
    setNotice('');
    try {
      const response = await api.courses.selfEnroll({ course_id: course.id }) as {
        success?: boolean;
        message?: string;
      };
      if (!response.success) throw new Error(response.message ?? 'Unable to enroll in this course.');
      setCourses((current) => current.map((item) => item.id === course.id ? { ...item, enrolled: true } : item));
      setNotice(response.message ?? `Enrolled in ${course.course}.`);
      setActiveTab('my-courses');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to enroll in this course.');
    } finally {
      setBusyCourseId(null);
    }
  };

  const openCourse = (course: StudentCourse) => router.push(`/student/courses/${encodeURIComponent(course.id)}`);
  const shownCourses = filteredCourses(activeTab === 'my-courses' ? currentCourses : availableCourses);

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-900">
            <BookOpen className="h-3.5 w-3.5 text-amber-500" /> Academic Registry
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">My Courses</h1>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {studentName ? `${studentName} · Cohort ${cohort}` : 'Your courses and cohort-eligible course catalog.'}
          </p>
        </div>
        <div role="tablist" aria-label="Course enrollment sections" className="flex shrink-0 rounded-xl border border-slate-200 bg-slate-100 p-1">
          <button type="button" role="tab" aria-selected={activeTab === 'my-courses'} onClick={() => setActiveTab('my-courses')}
            className={`rounded-lg px-4 py-2 text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'my-courses' ? 'border border-slate-200/40 bg-white text-blue-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
            My Courses ({currentCourses.length})
          </button>
          <button type="button" role="tab" aria-selected={activeTab === 'catalog'} onClick={() => {
            setActiveTab('catalog');
            if (sortOrder.startsWith('progress')) setSortOrder('name-asc');
          }}
            className={`rounded-lg px-4 py-2 text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'catalog' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
            Eligible Courses ({availableCourses.length})
          </button>
        </div>
      </header>

      {notice && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800"><Check size={15} />{notice}</div>}
      {error && <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800"><ShieldAlert size={15} />{error}</div>}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)}
            placeholder={activeTab === 'catalog' ? 'Search eligible courses...' : 'Search your courses...'}
            aria-label="Search courses"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs font-bold text-slate-800 outline-none focus:border-slate-950" />
        </div>
        {activeTab === 'my-courses' && (
          <select value={progressFilter} onChange={(event) => setProgressFilter(event.target.value as typeof progressFilter)}
            aria-label="Filter courses by progress"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-slate-950">
            <option value="all">All progress</option>
            <option value="not-started">Not started</option>
            <option value="in-progress">In progress</option>
            <option value="complete">Complete</option>
          </select>
        )}
        <div className="relative">
          <ArrowDownUp className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)}
            aria-label="Sort courses"
            className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-xs font-bold text-slate-700 outline-none focus:border-slate-950">
            <option value="name-asc">Course name A–Z</option>
            <option value="name-desc">Course name Z–A</option>
            {activeTab === 'my-courses' && <option value="progress-desc">Progress: highest first</option>}
            {activeTab === 'my-courses' && <option value="progress-asc">Progress: lowest first</option>}
          </select>
        </div>
        {activeTab === 'catalog' && (
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-slate-500">
            <ShieldAlert className="h-3.5 w-3.5 text-blue-900" />
            Only courses for {supportedCohorts.includes(cohort) ? cohort : 'your assigned cohort'} are listed
          </div>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-sm font-medium text-slate-500">Loading your courses...</div>
      ) : shownCourses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <BookOpen className="mx-auto h-7 w-7 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700">
            {activeTab === 'catalog'
              ? search.trim() ? 'No eligible courses match your search.' : 'No additional courses are available for your cohort.'
              : search.trim() ? 'No courses match your search and progress filter.'
                : progressFilter !== 'all' ? 'No courses match this progress filter.'
                  : 'You are not enrolled in any courses yet.'}
          </p>
          {!search.trim() && progressFilter === 'all' && activeTab === 'my-courses' && <p className="mt-1 text-xs text-slate-500">Open Eligible Courses to find and enroll in courses assigned to {cohort || 'your cohort'}.</p>}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {shownCourses.map((course) => (
            <article key={course.id} className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-900/30 hover:shadow-md">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-wider text-blue-900">{course.id}</span>
                  <span className="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500">{course.cohortName}</span>
                </div>
                <h2 className="mt-4 text-base font-black uppercase leading-snug tracking-wide text-slate-900">{course.course}</h2>
                <p className="mt-2 line-clamp-3 min-h-12 text-xs leading-5 text-slate-600">{course.description || 'Course description has not been added yet.'}</p>
                <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <User className="h-4 w-4 text-slate-400" />
                  <span>Your assigned cohort: <strong className="text-slate-800">{course.cohortName}</strong></span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span>{course.sessionCount} scheduled sessions</span>
                </div>
                {course.enrolled && (
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                      <span className="font-bold text-slate-700">Session attendance progress</span>
                      <span className="font-black text-blue-900">{course.sessionCount > 0 ? `${course.progressPercent}%` : 'Not scheduled'}</span>
                    </div>
                    <div
                      role="progressbar"
                      aria-label={`${course.course} session attendance progress`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={course.progressPercent}
                      className="h-2 overflow-hidden rounded-full bg-slate-100"
                    >
                      <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${course.progressPercent}%` }} />
                    </div>
                    <p className="mt-1.5 text-[10px] text-slate-500">
                      {course.attendedSessionCount} of {course.sessionCount} sessions attended
                    </p>
                  </div>
                )}
              </div>
              {course.enrolled ? (
                <button type="button" onClick={() => openCourse(course)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-black uppercase tracking-wider text-blue-900 transition hover:border-blue-900 hover:bg-blue-900 hover:text-white">
                  Open course <ArrowRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button type="button" disabled={busyCourseId === course.id} onClick={() => void enroll(course)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                  {busyCourseId === course.id ? 'Enrolling...' : 'Enroll in course'} <ArrowRight className="h-3.5 w-3.5 text-amber-500" />
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
