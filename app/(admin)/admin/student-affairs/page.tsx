'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Filter, GraduationCap, Search, UserRound, Users } from 'lucide-react';
import { requestRhemaAttendance, requestRhemaSchedules, requestRhemaStudents, type RhemaAttendanceRecord, type RhemaSchedule } from '@/lib/rhema-schedule-api';

type CourseWatchlistRow = {
  key: string;
  code: string;
  title: string;
  cohort: string;
  students: number;
  sessions: number;
  present: number;
  absent: number;
  attendance: number;
  status: 'On track' | 'Watch list' | 'At risk';
};

const overallStats = [
  { label: 'Attendance rate', value: '—', note: 'Loading attendance records', tone: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
  { label: 'Students checked in', value: '—', note: 'Loading attendance records', tone: 'text-blue-700 bg-blue-50 border-blue-100' },
  { label: 'At-risk learners', value: '—', note: 'Below 80% attendance', tone: 'text-amber-700 bg-amber-50 border-amber-100' },
  { label: 'Sessions logged', value: '—', note: 'Completed scheduled sessions', tone: 'text-violet-700 bg-violet-50 border-violet-100' },
];

type SortColumn = 'code' | 'cohort' | 'students' | 'sessions' | 'present' | 'absent' | 'attendance';

function getCompletedSessions(schedules: RhemaSchedule[], now: number) {
  return [...new Map(schedules.flatMap((schedule) => schedule.sessions)
    .filter((session) => sessionHasPassed(session, now))
    .map((session) => [String(session.id), session])).values()];
}

function sessionHasPassed(session: RhemaSchedule['sessions'][number], now: number): boolean {
  const end = new Date(`${session.date}T${session.end || '23:59'}`).getTime();
  return Number.isFinite(end) && end < now;
}

function buildCourseWatchlist(
  schedules: RhemaSchedule[],
  enrollments: Record<string, string[]>,
  attendance: RhemaAttendanceRecord[],
  now: number,
): CourseWatchlistRow[] {
  const groups = new Map<string, { course: string; cohort: string; schedules: RhemaSchedule[] }>();
  schedules.forEach((schedule) => {
    const cohort = schedule.cohortName || String(schedule.cohort);
    const key = `${schedule.course.trim().toLowerCase()}|${cohort.trim().toLowerCase()}`;
    const group = groups.get(key) ?? { course: schedule.course, cohort, schedules: [] };
    group.schedules.push(schedule);
    groups.set(key, group);
  });

  return [...groups.entries()].map(([key, group]) => {
    const sessions = getCompletedSessions(group.schedules, now);
    const enrolledIds = [...new Set(group.schedules.flatMap((schedule) => enrollments[schedule.id] ?? []).map(String))];
    const studentIds = enrolledIds.length ? enrolledIds : [...new Set(attendance
      .filter((record) => record.course === group.course
        && (!record.profile_cohort || record.profile_cohort.toLowerCase() === group.cohort.toLowerCase()))
      .map((record) => String(record.student_id)))];
    const studentSessionTotal = studentIds.length * sessions.length;
    const present = studentIds.reduce((total, studentId) => total + sessions.filter((session) => attendance.some((record) =>
      String(record.student_id) === studentId
      && (String(record.schedule_id) === String(session.id)
        || (!record.schedule_id && record.course === group.course && record.date === session.date))
    )).length, 0);
    const rate = studentSessionTotal ? Math.min(100, Math.round((present / studentSessionTotal) * 100)) : 0;
    return {
      key,
      code: group.course,
      title: group.course,
      cohort: group.cohort,
      students: studentIds.length,
      sessions: sessions.length,
      present,
      absent: Math.max(0, studentSessionTotal - present),
      attendance: rate,
      status: rate >= 90 ? 'On track' as const : rate >= 70 ? 'Watch list' as const : 'At risk' as const,
    };
  }).sort((left, right) => left.code.localeCompare(right.code) || left.cohort.localeCompare(right.cohort));
}

function countAtRiskLearners(
  schedules: RhemaSchedule[],
  enrollments: Record<string, string[]>,
  attendance: RhemaAttendanceRecord[],
  now: number,
): number {
  const groups = new Map<string, RhemaSchedule[]>();
  schedules.forEach((schedule) => {
    const cohort = schedule.cohortName || String(schedule.cohort);
    const key = `${schedule.course.trim().toLowerCase()}|${cohort.trim().toLowerCase()}`;
    groups.set(key, [...(groups.get(key) ?? []), schedule]);
  });
  const atRisk = new Set<string>();
  groups.forEach((groupSchedules) => {
    const sessions = getCompletedSessions(groupSchedules, now);
    if (!sessions.length) return;
    const cohort = groupSchedules[0].cohortName || String(groupSchedules[0].cohort);
    const course = groupSchedules[0].course;
    const students = [...new Set(groupSchedules.flatMap((schedule) => enrollments[schedule.id] ?? []).map(String))];
    students.forEach((studentId) => {
      const present = sessions.filter((session) => attendance.some((record) =>
        String(record.student_id) === studentId
        && (String(record.schedule_id) === String(session.id)
          || (!record.schedule_id && record.course === course && record.date === session.date))
      )).length;
      if ((present / sessions.length) * 100 < 80) atRisk.add(`${cohort.toLowerCase()}|${studentId}`);
    });
  });
  return atRisk.size;
}

export default function StudentAffairsDashboardPage() {
  const [dashboardStats, setDashboardStats] = useState(overallStats);
  const [dashboardCourses, setDashboardCourses] = useState<CourseWatchlistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [cohortFilter, setCohortFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortColumn, setSortColumn] = useState<SortColumn>('attendance');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadDashboardData = useCallback(async (active: () => boolean) => {
    try {
      const [students, scheduleData, attendance] = await Promise.all([
        requestRhemaStudents(),
        requestRhemaSchedules(),
        requestRhemaAttendance(),
      ]);
      if (!active()) return;
      const now = Date.now();
      const rows = buildCourseWatchlist(scheduleData.schedules, scheduleData.enrollments, attendance, now);
      setDashboardCourses(rows);
      const totalPossible = rows.reduce((sum, course) => sum + course.present + course.absent, 0);
      const totalPresent = rows.reduce((sum, course) => sum + course.present, 0);
      const attendanceRate = totalPossible ? Math.round((totalPresent / totalPossible) * 100) : 0;
      const studentsCheckedIn = new Set(attendance
        .map((record) => String(record.student_id))).size;
      const atRiskLearners = countAtRiskLearners(scheduleData.schedules, scheduleData.enrollments, attendance, now);
      const completedSessions = rows.reduce((sum, course) => sum + course.sessions, 0);
      setDashboardStats([
        { ...overallStats[0], value: `${attendanceRate}%`, note: 'Across completed course sessions' },
        { ...overallStats[1], value: studentsCheckedIn.toLocaleString(), note: `${students.length.toLocaleString()} active students` },
        { ...overallStats[2], value: atRiskLearners.toLocaleString(), note: 'In courses below 80% attendance' },
        { ...overallStats[3], value: completedSessions.toLocaleString(), note: 'Completed scheduled course sessions' },
      ]);
      setLoadError('');
    } catch (error) {
      if (active()) setLoadError(error instanceof Error ? error.message : 'Unable to load live course attendance.');
    } finally {
      if (active()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const isMounted = () => mounted;
    const initialLoad = window.setTimeout(() => { void loadDashboardData(isMounted); }, 0);
    const refreshTimer = window.setInterval(() => { void loadDashboardData(isMounted); }, 60000);
    return () => {
      mounted = false;
      window.clearTimeout(initialLoad);
      window.clearInterval(refreshTimer);
    };
  }, [loadDashboardData]);

  const cohortOptions = useMemo(() => [...new Set(dashboardCourses.map((course) => course.cohort))]
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' })), [dashboardCourses]);
  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase();
    const direction = sortDirection === 'asc' ? 1 : -1;
    return dashboardCourses
      .filter((course) => cohortFilter === 'all' || course.cohort === cohortFilter)
      .filter((course) => statusFilter === 'all' || course.status === statusFilter)
      .filter((course) => !query || `${course.code} ${course.title} ${course.cohort}`.toLowerCase().includes(query))
      .sort((left, right) => {
        const a = left[sortColumn];
        const b = right[sortColumn];
        return typeof a === 'number' && typeof b === 'number'
          ? (a - b) * direction
          : String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }) * direction;
      });
  }, [cohortFilter, dashboardCourses, search, sortColumn, sortDirection, statusFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredCourses.length / pageSize));
  const visiblePage = Math.min(page, pageCount);
  const paginatedCourses = filteredCourses.slice((visiblePage - 1) * pageSize, visiblePage * pageSize);
  const firstVisibleRow = filteredCourses.length ? (visiblePage - 1) * pageSize + 1 : 0;
  const lastVisibleRow = Math.min(visiblePage * pageSize, filteredCourses.length);
  const pageWindowStart = Math.max(1, Math.min(visiblePage - 2, pageCount - 4));
  const pageNumbers = Array.from({ length: Math.min(5, pageCount) }, (_, index) => pageWindowStart + index);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-600">Student affairs</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Attendance intelligence dashboard</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/checkin"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-white shadow-sm transition hover:bg-red-800"
          >
            Check-in desk
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/admin/student-affairs/attendance"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-white shadow-sm transition hover:bg-slate-900"
          >
            Open attendance tracker
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((stat) => (
          <div key={stat.label} className={`rounded-2xl border p-5 ${stat.tone}`}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{stat.label}</p>
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <p className="mt-4 text-3xl font-black text-slate-900">{stat.value}</p>
            <p className="mt-2 text-xs font-medium text-slate-600">{stat.note}</p>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-label="Course attendance snapshot">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Course watchlist</p>
              <h2 className="mt-2 text-xl font-black text-slate-900">Course attendance snapshot</h2>
              <p className="mt-1 text-sm text-slate-500">Search, filter and sort live attendance by course and cohort.</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Live · refreshes every minute
            </span>
          </div>

          <div className="mb-4 grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 md:grid-cols-3">
            <label className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-500">
              <Search className="h-4 w-4 shrink-0" />
              <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search course or cohort" aria-label="Search course attendance" className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" />
            </label>
            <label className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-500">
              <Users className="h-4 w-4 shrink-0" />
              <select value={cohortFilter} onChange={(event) => { setCohortFilter(event.target.value); setPage(1); }} aria-label="Filter attendance by cohort" className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none">
                <option value="all">All cohorts</option>
                {cohortOptions.map((cohort) => <option key={cohort} value={cohort}>{cohort}</option>)}
              </select>
            </label>
            <label className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-500">
              <Filter className="h-4 w-4 shrink-0" />
              <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} aria-label="Filter attendance by status" className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none">
                <option value="all">All attendance levels</option>
                <option value="On track">On track (90%+)</option>
                <option value="Watch list">Watch list (70–89%)</option>
                <option value="At risk">At risk (below 70%)</option>
              </select>
            </label>
            <label className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-500 md:col-span-3">
              <span className="shrink-0 text-xs font-bold">Rows per page</span>
              <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} aria-label="Rows per page" className="min-w-0 rounded-lg bg-transparent px-2 py-1 text-sm text-slate-700 outline-none">
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </label>
          </div>

          {loadError ? <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">Live course attendance could not be loaded: {loadError}</p> : null}
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-[850px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                  <tr>
                    {([
                      ['code', 'Course'],
                      ['cohort', 'Cohort'],
                      ['students', 'Students'],
                      ['sessions', 'Sessions'],
                      ['present', 'Present'],
                      ['absent', 'Absent'],
                      ['attendance', 'Attendance'],
                    ] as const).map(([column, label]) => (
                      <th key={column} scope="col" aria-sort={sortColumn === column ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'} className="whitespace-nowrap px-4 py-3">
                        <button type="button" onClick={() => {
                          if (sortColumn === column) setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc');
                          else {
                            setSortColumn(column);
                            setSortDirection(column === 'code' || column === 'cohort' ? 'asc' : 'desc');
                          }
                          setPage(1);
                        }} className="inline-flex items-center gap-1.5 transition hover:text-red-700">
                          {label}{sortColumn === column ? <span aria-hidden="true">{sortDirection === 'asc' ? '↑' : '↓'}</span> : null}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && dashboardCourses.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">Loading live course attendance…</td></tr>
                  ) : filteredCourses.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">{dashboardCourses.length ? 'No courses match your search or filters.' : 'No course attendance data is available yet.'}</td></tr>
                  ) : paginatedCourses.map((course) => (
                    <tr key={course.key} className="transition-colors hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link href={`/admin/student-affairs/attendance?course=${encodeURIComponent(course.code)}`} className="font-bold text-slate-900 hover:text-red-700 hover:underline focus:outline-none focus:ring-2 focus:ring-red-500">
                          {course.title}
                        </Link>
                        <p className="mt-0.5 text-xs text-slate-500">{course.code}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{course.cohort}</td>
                      <td className="px-4 py-3 text-slate-700">{course.students}</td>
                      <td className="px-4 py-3 text-slate-700">{course.sessions}</td>
                      <td className="px-4 py-3 font-bold text-emerald-700">{course.present}</td>
                      <td className="px-4 py-3 font-bold text-red-700">{course.absent}</td>
                      <td className="px-4 py-3">
                        <div className="flex min-w-[170px] items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className={`h-full ${course.attendance >= 90 ? 'bg-emerald-500' : course.attendance >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${course.attendance}%` }} /></div>
                          <span className="w-10 text-right font-black text-slate-900">{course.attendance}%</span>
                          <span className={`whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-black uppercase ${course.status === 'On track' ? 'bg-emerald-50 text-emerald-700' : course.status === 'Watch list' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>{course.status}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
              <span>Showing {firstVisibleRow}–{lastVisibleRow} of {filteredCourses.length} matching records ({dashboardCourses.length} total)</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={visiblePage <= 1} aria-label="Previous page" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                {pageWindowStart > 1 ? <>
                  <button type="button" onClick={() => setPage(1)} aria-label="First page" className="hidden rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100 sm:inline-flex">1</button>
                  {pageWindowStart > 2 ? <span className="px-1">…</span> : null}
                </> : null}
                {pageNumbers.map((pageNumber) => (
                  <button key={pageNumber} type="button" onClick={() => setPage(pageNumber)} aria-current={visiblePage === pageNumber ? 'page' : undefined} aria-label={`Page ${pageNumber}`} className={`hidden min-w-9 rounded-lg border px-3 py-2 font-semibold sm:inline-flex sm:justify-center ${visiblePage === pageNumber ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'}`}>
                    {pageNumber}
                  </button>
                ))}
                {pageWindowStart + pageNumbers.length - 1 < pageCount ? <>
                  {pageWindowStart + pageNumbers.length < pageCount ? <span className="px-1">…</span> : null}
                  <button type="button" onClick={() => setPage(pageCount)} aria-label="Last page" className="hidden rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100 sm:inline-flex">{pageCount}</button>
                </> : null}
                <span className="whitespace-nowrap px-1 font-semibold text-slate-700">Page {visiblePage} of {pageCount}</span>
                <button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={visiblePage >= pageCount} aria-label="Next page" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40">
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              {loading && dashboardCourses.length > 0 ? <span className="w-full text-right">Refreshing live data…</span> : null}
            </div>
          </div>
        </section>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <ClipboardCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Alert queue</p>
              <h2 className="text-xl font-black text-slate-900">Follow-up required</h2>
            </div>
          </div>

          <p className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">Follow-up alerts will appear here when learner-level risk details are available.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/admin/student-affairs/attendance" className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700"><UserRound className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Student log</p>
              <h3 className="text-lg font-black text-slate-900">Individual attendance</h3>
            </div>
          </div>
        </Link>

        <Link href="/admin/student-affairs/attendance" className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><BookOpen className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Course report</p>
              <h3 className="text-lg font-black text-slate-900">Class-by-class progress</h3>
            </div>
          </div>
        </Link>

        <Link href="/admin/student-affairs/attendance" className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><Users className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Cohort report</p>
              <h3 className="text-lg font-black text-slate-900">Class performance cohort</h3>
            </div>
          </div>
        </Link>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-slate-900 p-6 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-red-200"><GraduationCap className="h-5 w-5" /></div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">School context</p>
            <h2 className="text-xl font-black">Attendance strategy aligned to course sessions</h2>
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
          This dashboard is based on the same course, session, cohort, and attendance records used in the class register schema. It supports student-level logs, course summaries, and cohort comparisons using the session data already defined in the system.
        </p>
      </div>
    </div>
  );
}
