'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRightLeft,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Filter,
  LogIn,
  LogOut,
  RefreshCw,
  Search,
  UserRound,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import { requestRhemaSchedules, requestRhemaStudents, type RhemaSchedule, type RhemaStudent } from '@/lib/rhema-schedule-api';

type AttendanceAction = 'check-in';
type AttendanceDeskPhase = 'closed' | 'checkin';
type AttendanceScanMode = 'campus' | 'course';
type AttendanceStatus = 'Absent' | 'Present' | 'Checked in' | 'Checked out';
type CheckInRow = {
  student_id: string;
  student_name: string;
  cohort: string;
  course_name: string;
  schedule_id: string | null;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  checkin_id: number | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  attendance_status: AttendanceStatus;
};
type ApiResponse<T> = { success?: boolean; message?: string; data?: T };
type SortColumn = 'student_name' | 'student_id' | 'cohort' | 'attendance_status' | 'checked_in_at' | 'checked_out_at';

function dateValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function displayTime(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function csvCell(value: string | number): string {
  const text = String(value);
  const safeText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

function downloadCsv(rows: CheckInRow[], from: string, to: string) {
  const heading = ['Session date', 'Course', 'Student ID', 'Student name', 'Cohort', 'Status', 'Check-in time', 'Check-out time'];
  const lines = [
    ['Rhema Bible School - Attendance report', '', '', '', '', '', '', ''],
    [`Date range: ${from} to ${to}`, '', '', '', '', '', '', ''],
    heading,
    ...rows.map((row) => [
      row.session_date,
      row.course_name,
      row.student_id,
      row.student_name,
      row.cohort,
      row.attendance_status,
      row.checked_in_at ? displayTime(row.checked_in_at) : '',
      row.checked_out_at ? displayTime(row.checked_out_at) : '',
    ]),
  ];
  const csv = `\uFEFF${lines.map((line) => line.map(csvCell).join(',')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `rhema-attendance-${from}${from === to ? '' : `-to-${to}`}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function StudentCheckInPage() {
  const today = dateValue(new Date());
  const [students, setStudents] = useState<RhemaStudent[]>([]);
  const [schedules, setSchedules] = useState<RhemaSchedule[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [scanMode, setScanMode] = useState<AttendanceScanMode>('campus');
  const [dayPhase, setDayPhase] = useState<AttendanceDeskPhase>('closed');
  const [dayControlLoading, setDayControlLoading] = useState(true);
  const [phaseSaving, setPhaseSaving] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [todayRows, setTodayRows] = useState<CheckInRow[]>([]);
  const [reportRows, setReportRows] = useState<CheckInRow[]>([]);
  const [search, setSearch] = useState('');
  const [reportSearch, setReportSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reportStatusFilter, setReportStatusFilter] = useState('all');
  const [reportCohortFilter, setReportCohortFilter] = useState('all');
  const [sortColumn, setSortColumn] = useState<SortColumn>('student_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [reportPage, setReportPage] = useState(1);
  const [reportPageSize, setReportPageSize] = useState(10);
  const [reportFrom, setReportFrom] = useState(today);
  const [reportTo, setReportTo] = useState(today);
  const [activeTab, setActiveTab] = useState<'check-in' | 'reports'>('check-in');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [showStudentMatches, setShowStudentMatches] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const studentInputRef = useRef<HTMLInputElement>(null);
  const scannerSubmitTimerRef = useRef<number | null>(null);
  const scannerLastKeyAtRef = useRef(0);
  const scannerRapidKeyCountRef = useRef(0);

  useEffect(() => () => {
    if (scannerSubmitTimerRef.current !== null) {
      window.clearTimeout(scannerSubmitTimerRef.current);
    }
  }, []);

  const matchingStudents = useMemo(() => {
    const query = studentId.trim().toLowerCase();
    if (!query) return [];
    return students
      .filter((student) => `${student.name} ${student.id} ${student.cohort}`.toLowerCase().includes(query))
      .slice(0, 8);
  }, [studentId, students]);
  const exactStudent = useMemo(() => {
    const query = studentId.trim().toLowerCase();
    if (!query) return undefined;
    const byId = students.find((student) => student.id.trim().toLowerCase() === query);
    if (byId) return byId;
    const matchingNames = students.filter((student) => student.name.trim().toLowerCase() === query);
    return matchingNames.length === 1 ? matchingNames[0] : undefined;
  }, [studentId, students]);

  const todayCourses = useMemo(() => schedules
    .filter((schedule) => schedule.sessions.some((session) => session.date === today))
    .sort((left, right) => left.course.localeCompare(right.course)), [schedules, today]);
  const activeCourse = todayCourses.find((schedule) => schedule.id === selectedCourseId);

  const loadTodayRows = useCallback(async () => {
    const response = await api.attendance.studentCheckIns({ from: today, to: today }) as ApiResponse<CheckInRow[]>;
    if (!response.success || !response.data) throw new Error(response.message || 'Unable to load attendance records.');
    setTodayRows(response.data);
  }, [today]);
  const loadDayControl = useCallback(async () => {
    const response = await api.attendance.dayControl() as ApiResponse<{ phase?: string }>;
    if (!response.success || !response.data || !['closed', 'checkin', 'sessions', 'checkout'].includes(response.data.phase || '')) {
      throw new Error(response.message || 'Unable to load the attendance desk status.');
    }
    setDayPhase(response.data.phase === 'closed' ? 'closed' : 'checkin');
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void Promise.all([requestRhemaStudents(), requestRhemaSchedules()])
        .then(([studentData, scheduleData]) => {
          if (!active) return;
          setStudents(studentData);
          setSchedules(scheduleData.schedules);
          setError('');
        })
        .catch((cause: unknown) => {
          if (active) setError(cause instanceof Error ? cause.message : 'Unable to load student and class records.');
        })
        .finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [today]);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        await Promise.all([loadTodayRows(), loadDayControl()]);
        if (active) setError('');
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to refresh attendance records.');
      } finally {
        if (active) setDayControlLoading(false);
      }
    };
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    const poll = window.setInterval(() => { void refresh(); }, 15000);
    return () => {
      active = false;
      window.clearTimeout(timer);
      window.clearInterval(poll);
    };
  }, [loadDayControl, loadTodayRows]);

  const handleAttendanceAction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (scannerSubmitTimerRef.current !== null) {
      window.clearTimeout(scannerSubmitTimerRef.current);
      scannerSubmitTimerRef.current = null;
    }
    const cleanedStudentId = studentId.trim();
    if (!cleanedStudentId) {
      setError('Enter or scan a student ID, or type the student name.');
      return;
    }
    if (!exactStudent) {
      setError('Select a matching student, or enter their exact name or ID.');
      setShowStudentMatches(true);
      studentInputRef.current?.focus();
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await api.attendance.saveStudentCheckIn({
        student_id: exactStudent.id,
        course_id: scanMode === 'course' ? selectedCourseId : null,
        schedule_mode: scanMode === 'course' ? 'scheduled' : 'general',
        action: 'check-in',
      }) as ApiResponse<{ action: AttendanceAction; schedule_id: string | null }>;
      if (!response.success) throw new Error(response.message || 'Unable to record this attendance action.');
      setNotice(response.message || 'Student attendance recorded.');
      setStudentId('');
      setShowStudentMatches(false);
      await loadTodayRows();
      studentInputRef.current?.focus();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to record attendance. Please try again.');
      studentInputRef.current?.focus();
    } finally {
      setSaving(false);
    }
  };

  const advanceDayPhase = async () => {
    const nextPhase: AttendanceDeskPhase = dayPhase === 'closed' ? 'checkin' : 'closed';
    setPhaseSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await api.attendance.setDayControl(nextPhase) as ApiResponse<{ phase?: AttendanceDeskPhase }>;
      if (!response.success || !response.data?.phase) throw new Error(response.message || 'Unable to change the attendance desk stage.');
      setDayPhase(response.data.phase);
      setNotice(`Attendance desk is now ${response.data.phase === 'closed' ? 'stopped' : 'active'}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to change the attendance desk stage.');
    } finally {
      setPhaseSaving(false);
    }
  };

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const direction = sortDirection === 'asc' ? 1 : -1;
    const rows = scanMode === 'course' && activeCourse
      ? todayRows.filter((row) => row.course_name === activeCourse.course
        && (!activeCourse.cohortName || row.cohort.toUpperCase() === activeCourse.cohortName.toUpperCase()))
      : todayRows;
    return rows
      .filter((row) => statusFilter === 'all' || row.attendance_status === statusFilter)
      .filter((row) => !query || `${row.student_id} ${row.student_name} ${row.cohort}`.toLowerCase().includes(query))
      .sort((left, right) => {
        const a = left[sortColumn] || '';
        const b = right[sortColumn] || '';
        return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }) * direction;
      });
  }, [activeCourse, scanMode, search, sortColumn, sortDirection, statusFilter, todayRows]);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visiblePage = Math.min(page, pageCount);
  const pageRows = filteredRows.slice((visiblePage - 1) * pageSize, visiblePage * pageSize);
  const filteredReportRows = useMemo(() => {
    const query = reportSearch.trim().toLowerCase();
    const direction = sortDirection === 'asc' ? 1 : -1;
    return reportRows
      .filter((row) => reportStatusFilter === 'all' || row.attendance_status === reportStatusFilter)
      .filter((row) => reportCohortFilter === 'all' || row.cohort === reportCohortFilter)
      .filter((row) => !query || `${row.student_id} ${row.student_name} ${row.cohort} ${row.course_name}`.toLowerCase().includes(query))
      .sort((left, right) => String(left[sortColumn] || '').localeCompare(String(right[sortColumn] || ''), undefined, { numeric: true, sensitivity: 'base' }) * direction);
  }, [reportCohortFilter, reportRows, reportSearch, reportStatusFilter, sortColumn, sortDirection]);
  const reportPageCount = Math.max(1, Math.ceil(filteredReportRows.length / reportPageSize));
  const visibleReportPage = Math.min(reportPage, reportPageCount);
  const reportPageRows = filteredReportRows.slice((visibleReportPage - 1) * reportPageSize, visibleReportPage * reportPageSize);
  const checkedInCount = todayRows.filter((row) => row.course_name === 'General check-in'
    && (row.attendance_status === 'Checked in' || row.attendance_status === 'Checked out')).length;
  const checkedOutCount = todayRows.filter((row) => row.course_name === 'General check-in'
    && row.attendance_status === 'Checked out').length;

  const loadReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reportFrom || !reportTo || reportFrom > reportTo) {
      setError('Choose a valid report start and end date.');
      return;
    }
    setReportLoading(true);
    setError('');
    try {
      const response = await api.attendance.studentCheckIns({ from: reportFrom, to: reportTo }) as ApiResponse<CheckInRow[]>;
      if (!response.success || !response.data) throw new Error(response.message || 'Unable to load this attendance report.');
      setReportRows(response.data);
      setReportPage(1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load the attendance report.');
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-8xl space-y-6 pb-12">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/admin/student-affairs" className="mb-3 inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-red-700">
            <ArrowLeft className="h-4 w-4" /> Student Affairs dashboard
          </Link>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-600">Student affairs · Attendance desk</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Student check-in &amp; attendance</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Record campus arrival or scan students during class. Course sessions are selected automatically from the timetable, and attendance at a student’s final class of the day also records campus check-out.</p>
        </div>
        <span className={`inline-flex items-center gap-2 self-start rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] sm:self-auto ${dayPhase === 'closed' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'}`}>
          <span className={`h-2 w-2 rounded-full ${dayPhase === 'closed' ? 'bg-slate-400' : 'animate-pulse bg-emerald-500'}`} /> {dayControlLoading ? 'Loading desk…' : dayPhase === 'closed' ? 'Desk stopped' : 'Desk active'}
        </span>
      </div>

      {(error || notice) ? <div role={error ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-sm font-semibold ${error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{error || notice}</div> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-600">Daily attendance controls · {today}</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">{dayControlLoading ? 'Loading attendance desk…' : `Desk ${dayPhase === 'closed' ? 'stopped' : 'active'}`}</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">The tablet can record campus arrivals and course attendance while the desk is active. Course attendance automatically checks a student out after their final scheduled course session of the day; there is no separate check-out stage.</p>
          </div>
          <button type="button" onClick={advanceDayPhase} disabled={dayControlLoading || loading || phaseSaving} className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-white disabled:cursor-wait disabled:opacity-50 ${dayPhase === 'closed' ? 'bg-red-700 hover:bg-red-800' : 'bg-slate-900 hover:bg-slate-800'}`}>
            {phaseSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {phaseSaving ? 'Updating…' : dayPhase === 'closed' ? 'Start attendance desk' : 'Stop attendance desk'}
          </button>
        </div>
        <p className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${dayPhase === 'closed' ? 'bg-slate-50 text-slate-600' : 'bg-emerald-50 text-emerald-800'}`}>
          {dayPhase === 'closed' ? 'Start the desk before recording attendance.' : 'Campus check-in and scheduled class attendance are available now.'}
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Attendance records today', value: todayRows.length, icon: Users, tone: 'bg-blue-50 text-blue-700' },
          { label: 'Checked in', value: checkedInCount, icon: LogIn, tone: 'bg-emerald-50 text-emerald-700' },
          { label: 'Checked out', value: checkedOutCount, icon: LogOut, tone: 'bg-violet-50 text-violet-700' },
        ].map(({ label, value, icon: Icon, tone }) => (
          <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
              <span className={`grid h-9 w-9 place-items-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></span>
            </div>
            <p className="mt-3 text-3xl font-black text-slate-900">{loading ? '—' : value}</p>
          </article>
        ))}
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {([
          ['check-in', 'Check-in desk'],
          ['reports', 'Attendance reports'],
        ] as const).map(([tab, label]) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`border-b-2 px-4 py-3 text-sm font-bold transition ${activeTab === tab ? 'border-red-600 text-red-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'check-in' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.5fr)]">
          <section className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-600">Attendance action</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">Record a student</h2>
              </div>
              <CalendarDays className="h-5 w-5 text-slate-400" />
            </div>
            <div className={`mb-5 flex items-center gap-3 rounded-xl p-3 ${dayPhase === 'closed' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-50 text-emerald-900'}`}>
              {scanMode === 'course' ? <CalendarDays className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
              <div><p className="text-sm font-black">{scanMode === 'course' ? 'Course attendance' : 'Campus check-in'}</p><p className="text-xs opacity-75">{dayPhase === 'closed' ? 'The attendance desk is stopped.' : scanMode === 'course' ? 'Choose the class; the active session is matched by timetable and scan time.' : 'Scan students as they arrive on campus.'}</p></div>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <button type="button" aria-pressed={scanMode === 'campus'} onClick={() => setScanMode('campus')} className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition ${scanMode === 'campus' ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>Campus check-in</button>
              <button type="button" aria-pressed={scanMode === 'course'} onClick={() => setScanMode('course')} className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition ${scanMode === 'course' ? 'border-blue-300 bg-blue-50 text-blue-900' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>Course attendance</button>
            </div>
            {scanMode === 'course' ? <label className="mb-4 block text-xs font-bold uppercase tracking-wide text-slate-600">Class / cohort <span className="text-red-600">*</span>
              <select required value={selectedCourseId} onChange={(event) => setSelectedCourseId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium normal-case tracking-normal text-slate-800 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100">
                <option value="">Select today’s class</option>
                {todayCourses.map((schedule) => (
                  <option key={schedule.id} value={schedule.id}>{schedule.course} · {schedule.cohortName || schedule.cohort}</option>
                ))}
              </select>
              <span className="mt-2 block text-[11px] font-medium normal-case tracking-normal text-slate-500">The current session switches automatically according to its scheduled time.</span>
            </label> : null}
            <form onSubmit={handleAttendanceAction}>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">Student name or ID
                <input
                  ref={studentInputRef}
                  autoFocus
                  value={studentId}
                  onChange={(event) => {
                    const value = event.target.value;
                    setStudentId(value);
                    setShowStudentMatches(true);
                    setError('');
                    const scannedStudent = students.find((student) => student.id.trim().toLowerCase() === value.trim().toLowerCase());
                    if (scannedStudent && scannerRapidKeyCountRef.current >= 4) {
                      if (scannerSubmitTimerRef.current !== null) window.clearTimeout(scannerSubmitTimerRef.current);
                      scannerSubmitTimerRef.current = window.setTimeout(() => {
                        scannerSubmitTimerRef.current = null;
                        studentInputRef.current?.form?.requestSubmit();
                      }, 120);
                      scannerRapidKeyCountRef.current = 0;
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      if (scannerSubmitTimerRef.current !== null) {
                        window.clearTimeout(scannerSubmitTimerRef.current);
                        scannerSubmitTimerRef.current = null;
                      }
                      scannerRapidKeyCountRef.current = 0;
                      return;
                    }
                    if (event.key.length !== 1) return;
                    const now = performance.now();
                    scannerRapidKeyCountRef.current = now - scannerLastKeyAtRef.current <= 80
                      ? scannerRapidKeyCountRef.current + 1
                      : 1;
                    scannerLastKeyAtRef.current = now;
                  }}
                  onFocus={() => setShowStudentMatches(true)}
                  onBlur={() => window.setTimeout(() => setShowStudentMatches(false), 150)}
                  placeholder="Type a name, enter an ID, or scan a card"
                  autoComplete="off"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={showStudentMatches && matchingStudents.length > 0}
                  aria-controls="rhema-attendance-student-matches"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-base font-semibold normal-case tracking-normal text-slate-900 outline-none placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
              </label>
              {showStudentMatches && matchingStudents.length > 0 ? (
                <div id="rhema-attendance-student-matches" role="listbox" aria-label="Matching students" className="mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  {matchingStudents.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      role="option"
                      aria-selected={exactStudent?.id === student.id}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setStudentId(student.id);
                        setShowStudentMatches(false);
                        setError('');
                        studentInputRef.current?.focus();
                      }}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-slate-900">{student.name}</span>
                        <span className="block truncate text-xs text-slate-500">{student.id} · {student.cohort}</span>
                      </span>
                      {exactStudent?.id === student.id ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : null}
                    </button>
                  ))}
                </div>
              ) : null}
              {exactStudent ? <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><UserRound className="h-3.5 w-3.5" />Ready: {exactStudent.name} · {exactStudent.id}</p> : null}
              <button disabled={saving || loading || dayControlLoading || dayPhase === 'closed' || !studentId.trim() || (scanMode === 'course' && !selectedCourseId)} className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-black text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${scanMode === 'course' ? 'bg-blue-700 hover:bg-blue-800' : 'bg-emerald-700 hover:bg-emerald-800'}`}>
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : scanMode === 'course' ? <CalendarDays className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                {saving ? 'Saving attendance…' : scanMode === 'course' ? 'Record course attendance' : 'Record campus check-in'}
              </button>
            </form>
            <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />Course attendance requires an open campus check-in. Attendance at the student’s final scheduled class of the day automatically records their campus check-out.</p>
          </section>

          <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Today&apos;s register</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">{activeCourse ? `${activeCourse.course} · ${activeCourse.cohortName || activeCourse.cohort}` : 'All today’s attendance'}</h2>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600"><Clock3 className="h-3.5 w-3.5" /> Auto-refreshes every 15s</span>
            </div>
            <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_220px]">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-500">
                <Search className="h-4 w-4 shrink-0" />
                <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Find student by name or ID" aria-label="Search students in attendance list" className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" />
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-500">
                <Filter className="h-4 w-4 shrink-0" />
                <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} aria-label="Filter check-in status" className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none">
                  <option value="all">All statuses</option><option value="Checked in">Checked in</option><option value="Checked out">Checked out</option><option value="Present">Attendance recorded</option><option value="Absent">Absent</option>
                </select>
              </label>
            </div>
            <AttendanceTable rows={pageRows} sortColumn={sortColumn} sortDirection={sortDirection} onSort={(column) => {
              if (column === sortColumn) setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc');
              else {
                setSortColumn(column);
                setSortDirection(column === 'checked_in_at' || column === 'checked_out_at' ? 'desc' : 'asc');
              }
              setPage(1);
            }} loading={loading} />
            <Pagination
              page={visiblePage}
              pageCount={pageCount}
              pageSize={pageSize}
              total={filteredRows.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
            />
          </section>
        </div>
      ) : (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-600">Download and review</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">Attendance report</h2>
            <p className="mt-1 text-sm text-slate-500">Build an attendance report from scheduled sessions and database attendance. Existing attendance marks and check-ins count as present; enrolled students with neither are listed as absent.</p>
          </div>
          <form onSubmit={loadReport} className="mb-5 grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-600">From
              <input type="date" value={reportFrom} max={reportTo} onChange={(event) => setReportFrom(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-slate-800" />
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-600">To
              <input type="date" value={reportTo} min={reportFrom} max={today} onChange={(event) => setReportTo(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-slate-800" />
            </label>
            <button disabled={reportLoading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${reportLoading ? 'animate-spin' : ''}`} />{reportLoading ? 'Loading…' : 'Generate report'}
            </button>
            <button type="button" disabled={filteredReportRows.length === 0} onClick={() => downloadCsv(filteredReportRows, reportFrom, reportTo)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-3 text-sm font-bold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40">
              <Download className="h-4 w-4" /> Download CSV
            </button>
          </form>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_200px_200px]">
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-500">
              <Search className="h-4 w-4 shrink-0" />
              <input value={reportSearch} onChange={(event) => { setReportSearch(event.target.value); setReportPage(1); }} placeholder="Find student, ID, course or cohort" aria-label="Search attendance report" className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" />
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-500">
              <Filter className="h-4 w-4 shrink-0" />
              <select value={reportStatusFilter} onChange={(event) => { setReportStatusFilter(event.target.value); setReportPage(1); }} aria-label="Filter report attendance status" className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none">
                <option value="all">All statuses</option><option value="Checked in">Checked in</option><option value="Checked out">Checked out</option><option value="Present">Attendance recorded</option><option value="Absent">Absent</option>
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-500">
              <Users className="h-4 w-4 shrink-0" />
              <select value={reportCohortFilter} onChange={(event) => { setReportCohortFilter(event.target.value); setReportPage(1); }} aria-label="Filter attendance report by cohort" className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none">
                <option value="all">All cohorts</option>{Array.from(new Set(reportRows.map((row) => row.cohort).filter(Boolean))).sort().map((cohort) => <option key={cohort} value={cohort}>{cohort}</option>)}
              </select>
            </label>
          </div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-500">
            <span>{filteredReportRows.length} of {reportRows.length} session attendance records · {reportFrom} to {reportTo}</span>
            <span>{reportCohortFilter === 'all' ? 'All cohorts' : `Cohort ${reportCohortFilter}`}</span>
          </div>
          <AttendanceTable rows={reportPageRows} sortColumn={sortColumn} sortDirection={sortDirection} onSort={(column) => {
            if (column === sortColumn) setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc');
            else { setSortColumn(column); setSortDirection('asc'); }
            setReportPage(1);
          }} loading={reportLoading} />
          <Pagination
            page={visibleReportPage}
            pageCount={reportPageCount}
            pageSize={reportPageSize}
            total={filteredReportRows.length}
            onPageChange={setReportPage}
            onPageSizeChange={(size) => { setReportPageSize(size); setReportPage(1); }}
          />
          <p className="mt-3 text-xs text-slate-500">The download includes only the rows matching the selected cohort, status, and search filters.</p>
        </section>
      )}

      <Link href="/admin/student-affairs/attendance" className="inline-flex items-center gap-2 text-sm font-bold text-red-700 hover:text-red-900">
        Open full attendance analytics <ArrowRightLeft className="h-4 w-4" />
      </Link>
    </div>
  );
}

function AttendanceTable({
  rows,
  sortColumn,
  sortDirection,
  onSort,
  loading,
}: {
  rows: CheckInRow[];
  sortColumn: SortColumn;
  sortDirection: 'asc' | 'desc';
  onSort: (column: SortColumn) => void;
  loading: boolean;
}) {
  const columns: Array<[SortColumn, string]> = [
    ['student_name', 'Student'],
    ['student_id', 'Student ID'],
    ['cohort', 'Cohort'],
    ['attendance_status', 'Status'],
    ['checked_in_at', 'Check-in'],
    ['checked_out_at', 'Check-out'],
  ];
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
            <tr>{columns.map(([column, label]) => <th key={column} scope="col" aria-sort={sortColumn === column ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'} className="whitespace-nowrap px-4 py-3">
              <button type="button" onClick={() => onSort(column)} className="inline-flex items-center gap-1.5 hover:text-red-700">{label}{sortColumn === column ? <span aria-hidden="true">{sortDirection === 'asc' ? '↑' : '↓'}</span> : null}</button>
            </th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && rows.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">Loading attendance records…</td></tr>
              : rows.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">No enrolled students or attendance records match this view.</td></tr>
                : rows.map((row) => <tr key={`${row.schedule_id}:${row.student_id}`} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><p className="font-bold text-slate-900">{row.student_name}</p><p className="text-xs text-slate-500">{row.course_name} · {row.session_date}</p></td>
                  <td className="px-4 py-3 font-medium text-slate-700">{row.student_id}</td>
                  <td className="px-4 py-3 text-slate-700">{row.cohort}</td>
                  <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${row.attendance_status === 'Checked out' ? 'bg-blue-50 text-blue-700' : row.attendance_status === 'Checked in' ? 'bg-emerald-50 text-emerald-700' : row.attendance_status === 'Present' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-800'}`}>{row.attendance_status}</span></td>
                  <td className="px-4 py-3 text-slate-700">{displayTime(row.checked_in_at)}</td>
                  <td className="px-4 py-3 text-slate-700">{displayTime(row.checked_out_at)}</td>
                </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Pagination({
  page,
  pageCount,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  return <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
    <div className="flex items-center gap-2">
      <span>Rows</span>
      <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))} aria-label="Rows per page" className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-700">
        <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option>
      </select>
      <span>Showing {first}–{last} of {total}</span>
    </div>
    <div className="flex items-center gap-2">
      <button type="button" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 disabled:opacity-40"><ChevronLeft className="h-4 w-4" />Previous</button>
      <span className="whitespace-nowrap font-semibold text-slate-700">Page {page} of {pageCount}</span>
      <button type="button" disabled={page >= pageCount} onClick={() => onPageChange(Math.min(pageCount, page + 1))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 disabled:opacity-40">Next<ChevronRight className="h-4 w-4" /></button>
    </div>
  </div>;
}
