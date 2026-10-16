'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckCheck,
  Clock3,
  Download,
  Eye,
  Filter,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Printer,
  Search,
  Send,
  Smartphone,
  TrendingUp,
  TrendingDown,
  Users,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { requestRhemaAttendance, requestRhemaSchedules, requestRhemaStudents, type RhemaAttendanceRecord, type RhemaSchedule, type RhemaSchedulesPayload } from '@/lib/rhema-schedule-api';
import { exportBrandedPdf } from '@/lib/branded-pdf';

type FocusTab = 'student' | 'course' | 'cohort';
type DeliveryChannel = 'sms' | 'whatsapp' | 'email';

type StudentReport = {
  id: string;
  name: string;
  cohort: string;
  course: string;
  attended: number;
  total: number;
  rate: number;
  lastSeen: string;
  status: 'On track' | 'Watch list' | 'At risk';
  term: string;
  phone: string;
  email: string;
};

type StudentCoursePerformance = {
  courseCode: string;
  courseName: string;
  term: string;
  attended: number;
  total: number;
  rate: number;
  status: 'On track' | 'Watch list' | 'At risk';
};

type StudentSessionLog = {
  courseId: string;
  course: string;
  sessionId: string;
  date: string;
  start: string;
  end: string;
  notes: string;
  classPeriod: string;
  status: 'Present' | 'Missed' | 'Upcoming';
  recordedAt: string;
  audioBought: boolean;
};

type CourseScheduleGroup = {
  id: string;
  course: string;
  cohortName: string;
  schedules: RhemaSchedule[];
};

type ScheduledClassSlot = {
  courseId: string;
  session: RhemaSchedule['sessions'][number];
  period: 'Morning' | 'Evening' | 'Daytime';
};

type AttendanceOpportunity = {
  date: string;
  slots: ScheduledClassSlot[];
};

type StudentAudioAccessResponse = {
  success: boolean;
  available: boolean;
  data: Array<{ student_id: string; rhema_session_id: string | null }>;
};

function isStudentAudioAccessResponse(value: unknown): value is StudentAudioAccessResponse {
  if (!value || typeof value !== 'object') return false;
  const response = value as Partial<StudentAudioAccessResponse>;
  return typeof response.success === 'boolean'
    && typeof response.available === 'boolean'
    && Array.isArray(response.data);
}

type CourseReport = {
  code: string;
  title: string;
  cohort: string;
  sessions: number;
  attendance: number;
  present: number;
  absent: number;
  term: string;
};

type CohortReport = {
  cohort: string;
  students: number;
  average: number;
  present: number;
  absent: number;
  risk: number;
  term: string;
};

type PerformanceInsight = {
  title: string;
  summary: string;
  objective: string;
  recommendedChannel: DeliveryChannel;
  message: string;
};

type TablePaginationProps = {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
};

type ReportingPeriod = 'daily' | 'weekly' | 'monthly' | 'termly';
type AcademicTerm = { term_id: number; start_date: string; end_date: string };
type ReportDateRange = { start: string; end: string; label: string };
type ReportPeriodToolbarProps = {
  period: ReportingPeriod;
  anchorDate: string;
  termId: string;
  terms: AcademicTerm[];
  periodLabel: string;
  termsError: string;
  exporting: boolean;
  onPeriodChange: (period: ReportingPeriod) => void;
  onAnchorDateChange: (date: string) => void;
  onTermChange: (termId: string) => void;
  onPrint: () => void;
  onDownload: () => void;
};

function isAcademicTermsResponse(value: unknown): value is { success: boolean; data: Array<{ term_id: number | string; start_date: string; end_date: string }> } {
  if (!value || typeof value !== 'object') return false;
  const response = value as { success?: unknown; data?: unknown };
  return response.success === true
    && Array.isArray(response.data)
    && response.data.every((term: unknown) => {
      if (!term || typeof term !== 'object') return false;
      const item = term as Record<string, unknown>;
      return (typeof item.term_id === 'number' || (typeof item.term_id === 'string' && /^\d+$/.test(item.term_id)))
        && typeof item.start_date === 'string'
        && typeof item.end_date === 'string';
    });
}

function localDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getClassPeriod(start: string, notes = ''): ScheduledClassSlot['period'] {
  const time = start.toLowerCase();
  if (/\bpm\b/.test(time)) return 'Evening';
  if (/\bam\b/.test(time)) return 'Morning';
  const hour = Number(time.match(/^(\d{1,2}):/)?.[1]);
  if (Number.isFinite(hour)) {
    if (hour < 12) return 'Morning';
    if (hour >= 16) return 'Evening';
    return 'Daytime';
  }
  const description = notes.toLowerCase();
  if (description.includes('evening')) return 'Evening';
  if (description.includes('morning')) return 'Morning';
  return 'Daytime';
}

function groupCourseSchedules(schedules: RhemaSchedule[]): CourseScheduleGroup[] {
  const groups = new Map<string, CourseScheduleGroup>();
  schedules.forEach((schedule) => {
    const cohortName = schedule.cohortName || String(schedule.cohort);
    const key = `${schedule.course.trim().toLowerCase()}|${cohortName.trim().toLowerCase()}`;
    const group = groups.get(key) ?? {
      id: key,
      course: schedule.course,
      cohortName,
      schedules: [],
    };
    group.schedules.push(schedule);
    groups.set(key, group);
  });
  return [...groups.values()];
}

function buildAttendanceOpportunities(schedules: RhemaSchedule[]): AttendanceOpportunity[] {
  const slotsByDate = new Map<string, ScheduledClassSlot[]>();
  schedules.forEach((schedule) => {
    schedule.sessions.forEach((session) => {
      const slots = slotsByDate.get(session.date) ?? [];
      slots.push({
        courseId: schedule.id,
        session,
        period: getClassPeriod(session.start, session.notes),
      });
      slotsByDate.set(session.date, slots);
    });
  });

  const opportunities: AttendanceOpportunity[] = [];
  slotsByDate.forEach((slots, date) => {
    const morning = slots.filter((slot) => slot.period === 'Morning').sort((a, b) => a.session.start.localeCompare(b.session.start));
    const evening = slots.filter((slot) => slot.period === 'Evening').sort((a, b) => a.session.start.localeCompare(b.session.start));
    const daytime = slots.filter((slot) => slot.period === 'Daytime');
    for (let index = 0; index < Math.max(morning.length, evening.length); index += 1) {
      opportunities.push({
        date,
        slots: [morning[index], evening[index]].filter((slot): slot is ScheduledClassSlot => Boolean(slot)),
      });
    }
    daytime.forEach((slot) => opportunities.push({ date, slots: [slot] }));
  });
  return opportunities.sort((a, b) => a.date.localeCompare(b.date)
    || a.slots[0].session.start.localeCompare(b.slots[0].session.start));
}

function findOpportunityAttendance(
  opportunity: AttendanceOpportunity,
  course: string,
  studentId: string,
  records: RhemaAttendanceRecord[],
): RhemaAttendanceRecord | undefined {
  const sessionIds = new Set(opportunity.slots.map((slot) => String(slot.session.id)));
  return records.find((record) => String(record.student_id) === studentId && sessionIds.has(String(record.schedule_id)))
    ?? records.find((record) => String(record.student_id) === studentId
      && !record.schedule_id
      && record.course === course
      && record.date === opportunity.date);
}

function buildReportDateRange(period: ReportingPeriod, anchor: string, term?: AcademicTerm): ReportDateRange | null {
  if (period === 'termly') {
    if (!term) return null;
    return { start: term.start_date, end: term.end_date, label: `Term ${term.term_id} (${term.start_date} to ${term.end_date})` };
  }
  if (!anchor) return null;
  const date = new Date(`${anchor}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  if (period === 'daily') {
    const label = date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    return { start: anchor, end: anchor, label: `Daily report · ${label}` };
  }
  if (period === 'weekly') {
    const start = new Date(date);
    start.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start: localDateValue(start), end: localDateValue(end), label: `Week of ${localDateValue(start)}` };
  }
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    start: localDateValue(start),
    end: localDateValue(end),
    label: start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
  };
}

function TablePagination({ page, pageCount, total, pageSize, itemLabel, onPageChange }: TablePaginationProps) {
  const currentPage = Math.min(page, pageCount);
  const firstItem = total ? (currentPage - 1) * pageSize + 1 : 0;
  const lastItem = Math.min(currentPage * pageSize, total);

  return (
    <div className="attendance-no-print flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-semibold text-slate-500">
        Showing {firstItem}-{lastItem} of {total} {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-xs font-bold text-slate-700">Page {currentPage} / {pageCount}</span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
          disabled={currentPage >= pageCount}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function ReportPeriodToolbar({
  period,
  anchorDate,
  termId,
  terms,
  periodLabel,
  termsError,
  exporting,
  onPeriodChange,
  onAnchorDateChange,
  onTermChange,
  onPrint,
  onDownload,
}: ReportPeriodToolbarProps) {
  return (
    <>
      <style jsx global>{`
        @media print {
          body { background: #fff !important; }
          .attendance-report-controls, .attendance-no-print { display: none !important; }
          main { max-width: none !important; padding: 0 !important; }
          table { break-inside: auto; }
          tr { break-inside: avoid; }
        }
      `}</style>
      <section className="attendance-report-controls flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-xs font-bold text-slate-600">
            Report period
            <select
              value={period}
              onChange={(event) => onPeriodChange(event.target.value as ReportingPeriod)}
              className="min-w-36 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="termly">Termly</option>
            </select>
          </label>
          {period === 'termly' ? (
            <label className="grid gap-1 text-xs font-bold text-slate-600">
              Academic term
              <select
                value={termId}
                onChange={(event) => onTermChange(event.target.value)}
                disabled={terms.length === 0}
                className="min-w-52 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 disabled:opacity-60"
              >
                {terms.length === 0
                  ? <option value="">No academic terms available</option>
                  : terms.map((term) => <option key={term.term_id} value={term.term_id}>Term {term.term_id} · {term.start_date} to {term.end_date}</option>)}
              </select>
            </label>
          ) : (
            <label className="grid gap-1 text-xs font-bold text-slate-600">
              {period === 'daily' ? 'Report date' : period === 'weekly' ? 'Choose a date in the week' : period === 'monthly' ? 'Choose a date in the month' : 'Choose a date'}
              <input
                type="date"
                value={anchorDate}
                onChange={(event) => onAnchorDateChange(event.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
              />
            </label>
          )}
          <p className="pb-2 text-xs font-semibold text-slate-500">{periodLabel}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onPrint} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50">
            <Printer className="h-4 w-4" /> Print
          </button>
          <button type="button" onClick={onDownload} disabled={exporting} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white disabled:opacity-60">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download PDF
          </button>
        </div>
        {termsError && period === 'termly' && <p role="alert" className="w-full text-xs font-semibold text-red-700">{termsError}</p>}
      </section>
    </>
  );
}

const getStudentCoursesPerformance = (studentId: string, data: StudentReport[]): { [key: string]: StudentCoursePerformance[] } => {
  const records = data.filter(record => record.id === studentId);
  const grouped: { [key: string]: StudentCoursePerformance[] } = {};

  records.forEach(record => {
    if (!grouped[record.term]) grouped[record.term] = [];
    grouped[record.term].push({
      courseCode: record.course,
      courseName: record.course === 'PMS' ? 'Pastoral Ministry Studies' : record.course === 'TAE' ? 'Teaching and Education' : 'Service and Leadership',
      term: record.term,
      attended: record.attended,
      total: record.total,
      rate: record.rate,
      status: record.status,
    });
  });

  return grouped;
};

const calculateOverallPerformance = (studentId: string, data: StudentReport[]) => {
  const records = data.filter(record => record.id === studentId);
  if (records.length === 0) return { rate: 0, attended: 0, total: 0 };

  const attended = records.reduce((sum, r) => sum + r.attended, 0);
  const total = records.reduce((sum, r) => sum + r.total, 0);
  const rate = total > 0 ? Math.round((attended / total) * 100) : 0;

  return { rate, attended, total };
};

const buildPerformanceInsight = (record: StudentReport): PerformanceInsight => {
  if (record.rate >= 90) {
    return {
      title: 'Excellent attendance performance',
      summary: `${record.name} is tracking above the expected benchmark for ${record.course}.`,
      objective: 'Reinforce consistency by congratulating the learner and encouraging continued punctuality.',
      recommendedChannel: 'whatsapp',
      message: `Hello ${record.name}, this is a note from Student Affairs. Your attendance in ${record.course} has remained excellent at ${record.rate}%. Keep up the consistency and continue to attend all scheduled sessions.`,
    };
  }

  if (record.rate >= 70) {
    return {
      title: 'Progressing but needs reinforcement',
      summary: `${record.name} is within acceptable range but still has a few sessions to catch up on for ${record.course}.`,
      objective: 'Follow up with a brief check-in call to agree on a catch-up plan and address any barriers.',
      recommendedChannel: 'sms',
      message: `Hello ${record.name}, your attendance in ${record.course} is currently ${record.rate}%. Please aim to improve attendance by attending the next sessions and reaching out for support if you are facing barriers.`,
    };
  }

  return {
    title: 'High concern attendance pattern',
    summary: `${record.name} has a low attendance rate in ${record.course} and requires immediate support.`,
    objective: 'Schedule a personal callback, identify the cause, and agree on a support and recovery plan with the student and guardian.',
    recommendedChannel: 'email',
    message: `Dear ${record.name}, student affairs has noted a low attendance rate of ${record.rate}% in ${record.course}. We would like to support you and schedule a conversation to identify any barriers and agree on a follow-up plan.`,
  };
};

export default function AttendanceDashboardPage() {
  const [liveStudentData, setLiveStudentData] = useState<StudentReport[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<RhemaAttendanceRecord[]>([]);
  const [schedulePayload, setSchedulePayload] = useState<RhemaSchedulesPayload | null>(null);
  const [audioAccessKeys, setAudioAccessKeys] = useState<Set<string>>(new Set());
  const [audioAccessAvailable, setAudioAccessAvailable] = useState(true);
  const [attendanceAsOf, setAttendanceAsOf] = useState(0);
  const [attendanceLoadStatus, setAttendanceLoadStatus] = useState('');
  const [followupSyncError, setFollowupSyncError] = useState('');
  const [academicTerms, setAcademicTerms] = useState<AcademicTerm[]>([]);
  const [academicTermsError, setAcademicTermsError] = useState('');
  const [reportingPeriod, setReportingPeriod] = useState<ReportingPeriod>('weekly');
  const [reportAnchorDate, setReportAnchorDate] = useState(() => localDateValue(new Date()));
  const [selectedTermId, setSelectedTermId] = useState('');
  const [activeTab, setActiveTab] = useState<FocusTab>('student');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(() => {
    const courseFromUrl = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('course') : null;
    return courseFromUrl || 'All courses';
  });
  const [selectedCohort, setSelectedCohort] = useState('All cohorts');
  const [selectedRecord, setSelectedRecord] = useState<StudentReport | CourseReport | CohortReport | null>(null);
  const [selectedCourseReport, setSelectedCourseReport] = useState<CourseReport | null>(null);
  const [selectedCohortReport, setSelectedCohortReport] = useState<CohortReport | null>(null);
  const [studentLogTab, setStudentLogTab] = useState<'courses' | 'sessions'>('courses');
  const [courseSummarySearch, setCourseSummarySearch] = useState('');
  const [courseSummaryFilter, setCourseSummaryFilter] = useState<'all' | 'missed' | 'perfect' | 'below-75'>('all');
  const [courseSummarySort, setCourseSummarySort] = useState<'course' | 'sessions' | 'attended' | 'missed' | 'percentage'>('course');
  const [courseSummarySortDirection, setCourseSummarySortDirection] = useState<'asc' | 'desc'>('asc');
  const [sessionLogSearch, setSessionLogSearch] = useState('');
  const [sessionLogStatusFilter, setSessionLogStatusFilter] = useState<'all' | StudentSessionLog['status']>('all');
  const [sessionLogAudioFilter, setSessionLogAudioFilter] = useState<'all' | 'bought' | 'not-bought' | 'unknown'>('all');
  const [sessionLogSort, setSessionLogSort] = useState<'date' | 'course' | 'status'>('date');
  const [sessionLogSortDirection, setSessionLogSortDirection] = useState<'asc' | 'desc'>('desc');
  const [courseSummaryPage, setCourseSummaryPage] = useState(1);
  const [sessionLogPage, setSessionLogPage] = useState(1);
  const [reportTablePage, setReportTablePage] = useState(1);
  const [courseWatchlistPage, setCourseWatchlistPage] = useState(1);
  const [courseWatchlistPageSize, setCourseWatchlistPageSize] = useState(6);
  const [courseWatchlistSearch, setCourseWatchlistSearch] = useState('');
  const [courseWatchlistCohort, setCourseWatchlistCohort] = useState('All cohorts');
  const [courseWatchlistStatus, setCourseWatchlistStatus] = useState<'all' | 'on-track' | 'watch-list' | 'at-risk'>('all');
  const [courseWatchlistSort, setCourseWatchlistSort] = useState<'course' | 'cohort' | 'students' | 'sessions' | 'present' | 'absent' | 'attendance'>('attendance');
  const [courseWatchlistSortDirection, setCourseWatchlistSortDirection] = useState<'asc' | 'desc'>('asc');
  const [messageChannel, setMessageChannel] = useState<DeliveryChannel>('sms');
  const [followUpNote, setFollowUpNote] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState('');
  const [reportExportError, setReportExportError] = useState('');
  const [exportingReport, setExportingReport] = useState<'view' | 'download' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const reportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    api.terms.list()
      .then((response: unknown) => {
        if (!isAcademicTermsResponse(response)) throw new Error('The academic terms response was invalid.');
        const terms = response.data
          .map((term) => ({ ...term, term_id: Number(term.term_id) }))
          .sort((a, b) => b.term_id - a.term_id);
        setAcademicTerms(terms);
        const currentDate = localDateValue(new Date());
        const currentTerm = terms.find((term) => term.start_date <= currentDate && term.end_date >= currentDate);
        setSelectedTermId(String((currentTerm || terms[0])?.term_id ?? ''));
      })
      .catch((error: unknown) => setAcademicTermsError(error instanceof Error ? error.message : 'Unable to load academic terms.'));
  }, []);

  useEffect(() => {
    Promise.all([requestRhemaAttendance(), requestRhemaSchedules(), requestRhemaStudents(), api.attendance.studentAudioAccess()])
      .then(([records, scheduleData, studentData, audioResponse]) => {
        if (!isStudentAudioAccessResponse(audioResponse)) {
          throw new Error('Unable to load student audio purchase status.');
        }
        setAttendanceRecords(records);
        setSchedulePayload(scheduleData);
        setAttendanceAsOf(Date.now());
        setAudioAccessAvailable(audioResponse.available);
        setAudioAccessKeys(new Set(audioResponse.data
          .filter((access) => access.rhema_session_id !== null)
          .map((access) => `${access.student_id}:${access.rhema_session_id}`)));
        const missedFollowups = groupCourseSchedules(scheduleData.schedules).flatMap((course) => {
          const enrolledIds = [...new Set(course.schedules.flatMap((schedule) =>
            scheduleData.enrollments[schedule.id] ?? []))];
          return buildAttendanceOpportunities(course.schedules)
            .filter((opportunity) => Math.max(...opportunity.slots.map(({ session }) =>
              new Date(`${session.date}T${session.end || '23:59'}`).getTime())) < Date.now())
            .flatMap((opportunity) => {
              const hasAttendance = (studentId: string) => findOpportunityAttendance(opportunity, course.course, String(studentId), records);
              const sessionIds = opportunity.slots.map((slot) => String(slot.session.id));
              const courseIds = [...new Set(opportunity.slots.map((slot) => slot.courseId))];
              if (courseIds.length === 0) return [];
              return enrolledIds
                .filter((studentId) => !hasAttendance(String(studentId)))
                .map((studentId) => ({
                  student_id: String(studentId),
                  course_ids: courseIds,
                  date: opportunity.date,
                  session_ids: sessionIds,
                }));
            });
        });
        void (async () => {
          try {
            setFollowupSyncError('');
            for (let index = 0; index < missedFollowups.length; index += 200) {
              await api.attendance.syncMissedFollowups(missedFollowups.slice(index, index + 200));
            }
          } catch (error) {
            setFollowupSyncError(error instanceof Error ? error.message : 'Unable to send missed-session notifications.');
          }
        })();
        const studentMap = new Map(studentData.map((student) => [student.id, student]));
        const courseRows = scheduleData.schedules.flatMap((course) => {
          const enrolledIds = scheduleData.enrollments[course.id] ?? [];
          const recordIds = [...new Set(records.filter((record) => record.course === course.course).map((record) => String(record.student_id)))];
          const ids = enrolledIds.length ? enrolledIds : recordIds;
          return ids.map((id) => {
            const student = studentMap.get(String(id));
            const studentRecords = records.filter((record) => String(record.student_id) === String(id));
            const completedSessions = course.sessions.filter((session) => new Date(`${session.date}T${session.end || '23:59'}`).getTime() < Date.now());
            const attended = completedSessions.filter((session) => studentRecords.some((record) =>
              String(record.schedule_id) === String(session.id)
              || (!record.schedule_id && record.course === course.course && record.date === session.date)
            )).length;
            const total = completedSessions.length;
            const rate = total ? Math.min(100, Math.round((attended / total) * 100)) : 0;
            const lastSeen = studentRecords
              .filter((record) => record.course === course.course)
              .sort((a, b) => b.date.localeCompare(a.date))[0]?.date || 'Not yet recorded';
            return { id: String(id), name: student?.name || studentRecords[0]?.name || String(id), cohort: student?.cohort || studentRecords[0]?.profile_cohort || course.cohortName, course: course.course, attended, total, rate, lastSeen, status: rate >= 90 ? 'On track' as const : rate >= 70 ? 'Watch list' as const : 'At risk' as const, term: 'Current records', phone: '', email: '' };
          });
        });
        setLiveStudentData(courseRows);
        setAttendanceLoadStatus(`${courseRows.length} course performance records loaded from the database.`);
      })
      .catch((error: unknown) => setAttendanceLoadStatus(error instanceof Error ? error.message : 'Unable to load attendance records.'));
  }, []);

  const pageSize = 6;

  const activeAcademicTerm = academicTerms.find((term) => String(term.term_id) === selectedTermId);
  const reportDateRange = useMemo(
    () => buildReportDateRange(reportingPeriod, reportAnchorDate, activeAcademicTerm),
    [reportingPeriod, reportAnchorDate, activeAcademicTerm]
  );
  const reportData = useMemo(() => {
    if (!schedulePayload || !reportDateRange) return { students: [] as StudentReport[], courses: [] as CourseReport[], cohorts: [] as CohortReport[] };
    const courseGroups = groupCourseSchedules(schedulePayload.schedules);
    const students = courseGroups.flatMap((course) => {
      const opportunities = buildAttendanceOpportunities(course.schedules).filter((opportunity) =>
        opportunity.date >= reportDateRange.start
        && opportunity.date <= reportDateRange.end
        && Math.max(...opportunity.slots.map(({ session }) =>
          new Date(`${session.date}T${session.end || '23:59'}`).getTime())) < attendanceAsOf
      );
      if (opportunities.length === 0) return [];
      const enrolledIds = [...new Set(course.schedules.flatMap((schedule) =>
        schedulePayload.enrollments[schedule.id] ?? []))];
      const recordIds = [...new Set(attendanceRecords
        .filter((record) => record.course === course.course
          && (!record.profile_cohort || record.profile_cohort.toUpperCase() === course.cohortName.toUpperCase()))
        .map((record) => String(record.student_id)))];
      const studentIds = enrolledIds.length ? enrolledIds : recordIds;
      return studentIds.map((studentId) => {
        const matches = attendanceRecords.filter((record) => String(record.student_id) === String(studentId));
        const attended = opportunities.filter((opportunity) =>
          findOpportunityAttendance(opportunity, course.course, String(studentId), matches)).length;
        const total = opportunities.length;
        const rate = total ? Math.min(100, Math.round((attended / total) * 100)) : 0;
        const baseline = liveStudentData.find((student) => student.id === String(studentId));
        const name = matches[0]?.name || baseline?.name || String(studentId);
        const cohort = matches.find((record) => record.profile_cohort)?.profile_cohort || baseline?.cohort || course.cohortName;
        return {
          id: String(studentId),
          name,
          cohort,
          course: course.course,
          attended,
          total,
          rate,
          lastSeen: matches
            .filter((record) => record.course === course.course && record.date >= reportDateRange.start && record.date <= reportDateRange.end)
            .sort((a, b) => b.date.localeCompare(a.date))[0]?.date || 'Not yet recorded',
          status: rate >= 90 ? 'On track' as const : rate >= 70 ? 'Watch list' as const : 'At risk' as const,
          term: reportDateRange.label,
          phone: baseline?.phone || '',
          email: baseline?.email || '',
        };
      });
    });
    const courses = courseGroups.map((course) => {
      const opportunities = buildAttendanceOpportunities(course.schedules).filter((opportunity) =>
        opportunity.date >= reportDateRange.start
        && opportunity.date <= reportDateRange.end
        && Math.max(...opportunity.slots.map(({ session }) =>
          new Date(`${session.date}T${session.end || '23:59'}`).getTime())) < attendanceAsOf
      );
      const enrolledIds = [...new Set(course.schedules.flatMap((schedule) =>
        schedulePayload.enrollments[schedule.id] ?? []))];
      const studentIds = enrolledIds.length ? enrolledIds : [...new Set(attendanceRecords
        .filter((record) => record.course === course.course
          && (!record.profile_cohort || record.profile_cohort.toUpperCase() === course.cohortName.toUpperCase()))
        .map((record) => String(record.student_id)))];
      const present = studentIds.reduce((count, studentId) => count + opportunities.filter((opportunity) =>
        findOpportunityAttendance(opportunity, course.course, String(studentId), attendanceRecords)
      ).length, 0);
      const possible = opportunities.length * studentIds.length;
      const absent = Math.max(0, possible - present);
      return {
        code: course.course,
        title: course.course,
        cohort: course.cohortName,
        sessions: opportunities.length,
        attendance: present + absent ? Math.round((present / (present + absent)) * 100) : 0,
        present,
        absent,
        term: reportDateRange.label,
      };
    }).filter((course) => course.sessions > 0);
    const cohortMap = new Map<string, { students: Set<string>; present: number; absent: number; risk: number }>();
    students.forEach((student) => {
      const cohort = cohortMap.get(student.cohort) ?? { students: new Set<string>(), present: 0, absent: 0, risk: 0 };
      cohort.students.add(student.id);
      cohort.present += student.attended;
      cohort.absent += Math.max(0, student.total - student.attended);
      if (student.rate < 70) cohort.risk += 1;
      cohortMap.set(student.cohort, cohort);
    });
    const cohorts = [...cohortMap.entries()].map(([cohort, stats]) => ({
      cohort,
      students: stats.students.size,
      average: stats.present + stats.absent ? Math.round((stats.present / (stats.present + stats.absent)) * 100) : 0,
      present: stats.present,
      absent: stats.absent,
      risk: stats.risk,
      term: reportDateRange.label,
    }));
    return { students, courses, cohorts };
  }, [schedulePayload, reportDateRange, attendanceRecords, attendanceAsOf, liveStudentData]);

  const reportStudentData = reportData.students;
  const reportCourseData = reportData.courses;
  const reportCohortData = reportData.cohorts;
  const reportScopeLabel = reportDateRange?.label || (reportingPeriod === 'termly' ? 'Select an academic term' : 'Preparing report period');

  const filteredStudents = useMemo(() => {
    const grouped = new Map<string, StudentReport>();
    reportStudentData.forEach((student) => {
      const matchesCourse = selectedCourse === 'All courses' || student.course === selectedCourse;
      const matchesCohort = selectedCohort === 'All cohorts' || student.cohort === selectedCohort;
      if (!matchesCourse || !matchesCohort) return;
      const existing = grouped.get(student.id);
      if (existing) {
        existing.attended += student.attended;
        existing.total += student.total;
        existing.rate = existing.total ? Math.round((existing.attended / existing.total) * 100) : 0;
        existing.lastSeen = existing.lastSeen === 'Not yet recorded' || student.lastSeen > existing.lastSeen ? student.lastSeen : existing.lastSeen;
        existing.status = existing.rate >= 90 ? 'On track' : existing.rate >= 70 ? 'Watch list' : 'At risk';
      } else {
        grouped.set(student.id, { ...student, course: selectedCourse === 'All courses' ? 'All courses' : selectedCourse });
      }
    });
    const search = searchTerm.trim().toLowerCase();
    return [...grouped.values()].filter((student) => !search || student.name.toLowerCase().includes(search) || student.id.toLowerCase().includes(search));
  }, [searchTerm, selectedCourse, selectedCohort, reportStudentData]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage]);

  const displayedCourseData = useMemo(() => {
    if (selectedCourse === 'All courses') return reportCourseData;
    return reportCourseData.filter((course) => course.code === selectedCourse);
  }, [selectedCourse, reportCourseData]);

  const courseWatchlistRows = useMemo(() => {
    const search = courseWatchlistSearch.trim().toLowerCase();
    const rows = displayedCourseData
      .filter((course) => courseWatchlistCohort === 'All cohorts' || course.cohort === courseWatchlistCohort)
      .map((course) => {
        const students = reportStudentData.filter((student) => student.course === course.code && student.cohort === course.cohort).length;
        const status = course.attendance >= 90 ? 'on-track' as const : course.attendance >= 70 ? 'watch-list' as const : 'at-risk' as const;
        return { ...course, students, status };
      })
      .filter((course) => {
        const matchesSearch = !search || `${course.code} ${course.title} ${course.cohort}`.toLowerCase().includes(search);
        return matchesSearch && (courseWatchlistStatus === 'all' || course.status === courseWatchlistStatus);
      });
    const direction = courseWatchlistSortDirection === 'asc' ? 1 : -1;
    return rows.sort((left, right) => {
      const leftValue = courseWatchlistSort === 'course' ? `${left.code} ${left.title}` : left[courseWatchlistSort];
      const rightValue = courseWatchlistSort === 'course' ? `${right.code} ${right.title}` : right[courseWatchlistSort];
      if (typeof leftValue === 'number' && typeof rightValue === 'number') return (leftValue - rightValue) * direction;
      return String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true, sensitivity: 'base' }) * direction;
    });
  }, [
    displayedCourseData,
    reportStudentData,
    courseWatchlistSearch,
    courseWatchlistCohort,
    courseWatchlistStatus,
    courseWatchlistSort,
    courseWatchlistSortDirection,
  ]);
  const courseWatchlistPageCount = Math.max(1, Math.ceil(courseWatchlistRows.length / courseWatchlistPageSize));
  const paginatedCourseWatchlistRows = courseWatchlistRows.slice(
    (Math.min(courseWatchlistPage, courseWatchlistPageCount) - 1) * courseWatchlistPageSize,
    Math.min(courseWatchlistPage, courseWatchlistPageCount) * courseWatchlistPageSize,
  );
  const courseWatchlistCohorts = [...new Set(reportCourseData.map((course) => course.cohort))]
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }));

  const displayedCohortData = useMemo(() => {
    if (selectedCohort === 'All cohorts') return reportCohortData;
    return reportCohortData.filter((group) => group.cohort === selectedCohort);
  }, [selectedCohort, reportCohortData]);

  const currentStudentReport = useMemo(() => {
    if (!selectedRecord || !('id' in selectedRecord)) return null;
    const rows = reportStudentData.filter((row) =>
      row.id === selectedRecord.id
      && row.cohort === selectedRecord.cohort
      && (selectedRecord.course === 'All courses' || row.course === selectedRecord.course)
    );
    const attended = rows.reduce((sum, row) => sum + row.attended, 0);
    const total = rows.reduce((sum, row) => sum + row.total, 0);
    const rate = total ? Math.round((attended / total) * 100) : 0;
    const seenDates = rows.map((row) => row.lastSeen).filter((date) => date !== 'Not yet recorded').sort();
    const lastSeen = seenDates[seenDates.length - 1] || 'Not yet recorded';
    return {
      ...selectedRecord,
      attended,
      total,
      rate,
      lastSeen,
      term: reportScopeLabel,
      status: rate >= 90 ? 'On track' as const : rate >= 70 ? 'Watch list' as const : 'At risk' as const,
    };
  }, [selectedRecord, reportStudentData, reportScopeLabel]);

  const activeInsight = currentStudentReport ? buildPerformanceInsight(currentStudentReport) : null;
  const selectedStudentCourses = useMemo(() => {
    if (!selectedRecord || !('id' in selectedRecord) || !schedulePayload) return [];
    return groupCourseSchedules(schedulePayload.schedules).filter((group) =>
      group.schedules.some((course) =>
        (schedulePayload.enrollments[course.id] ?? []).some((studentId) => String(studentId) === selectedRecord.id)
        || attendanceRecords.some((record) => String(record.student_id) === selectedRecord.id
          && record.course === course.course
          && (!record.profile_cohort || record.profile_cohort.toUpperCase() === selectedRecord.cohort.toUpperCase()))
      )
      && group.schedules.some((course) => !course.cohortName
        || course.cohortName.toUpperCase() === selectedRecord.cohort.toUpperCase())
    );
  }, [selectedRecord, schedulePayload, attendanceRecords]);
  const selectedStudentSessionLog = useMemo<StudentSessionLog[]>(() => {
    if (!selectedRecord || !('id' in selectedRecord)) return [];
    const now = attendanceAsOf;
    return selectedStudentCourses.flatMap((course) => buildAttendanceOpportunities(course.schedules)
      .filter((opportunity) => !reportDateRange
        || (opportunity.date >= reportDateRange.start && opportunity.date <= reportDateRange.end))
      .map((opportunity) => {
      const attendance = findOpportunityAttendance(opportunity, course.course, selectedRecord.id, attendanceRecords);
      const attendedSlot = attendance
        ? opportunity.slots.find((slot) => String(slot.session.id) === String(attendance.schedule_id))
          ?? opportunity.slots.find((slot) => slot.period === getClassPeriod(attendance.time))
        : undefined;
      const latestEnd = Math.max(...opportunity.slots.map(({ session }) =>
        new Date(`${session.date}T${session.end || '23:59'}`).getTime()));
      const status: StudentSessionLog['status'] = attendance ? 'Present' : latestEnd < now ? 'Missed' : 'Upcoming';
      const periods = [...new Set(opportunity.slots.map((slot) => slot.period))];
      const classPeriod = attendedSlot?.period ?? (periods.length > 1 ? `${periods.join(' / ')} options` : periods[0] ?? 'Daytime');
      const displaySlot = attendedSlot ?? opportunity.slots[0];
      const sessionIds = opportunity.slots.map((slot) => slot.session.id);
      return {
        courseId: course.id,
        course: course.course,
        sessionId: sessionIds.join('|'),
        date: opportunity.date,
        start: attendedSlot?.session.start ?? opportunity.slots.map((slot) => slot.session.start).join(' / '),
        end: attendedSlot?.session.end ?? opportunity.slots.map((slot) => slot.session.end).join(' / '),
        notes: displaySlot.session.notes || 'Class session',
        classPeriod,
        status,
        recordedAt: attendance ? `${attendance.date}${attendance.time ? ` ${attendance.time}` : ''}` : '',
        audioBought: sessionIds.some((sessionId) => audioAccessKeys.has(`${selectedRecord.id}:${sessionId}`)),
      };
    })).sort((a, b) => `${b.date} ${b.start}`.localeCompare(`${a.date} ${a.start}`));
  }, [selectedRecord, selectedStudentCourses, attendanceRecords, attendanceAsOf, audioAccessKeys, reportDateRange]);

  const selectedCourseStudents = useMemo(() => {
    if (!selectedCourseReport) return [];
    return reportStudentData
      .filter((student) => student.course === selectedCourseReport.code && student.cohort === selectedCourseReport.cohort)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedCourseReport, reportStudentData]);

  const selectedCohortCourseRows = useMemo(() => {
    if (!selectedCohortReport) return [];
    const courses = new Map<string, { course: string; students: number; attended: number; missed: number; percentage: number }>();
    reportStudentData.filter((student) => student.cohort === selectedCohortReport.cohort).forEach((student) => {
      const row = courses.get(student.course) ?? { course: student.course, students: 0, attended: 0, missed: 0, percentage: 0 };
      row.students += 1;
      row.attended += student.attended;
      row.missed += Math.max(0, student.total - student.attended);
      courses.set(student.course, row);
    });
    return [...courses.values()]
      .map((row) => ({ ...row, percentage: row.attended + row.missed ? Math.round((row.attended / (row.attended + row.missed)) * 100) : 0 }))
      .sort((a, b) => a.course.localeCompare(b.course));
  }, [selectedCohortReport, reportStudentData]);

  const selectedCohortStudents = useMemo(() => {
    if (!selectedCohortReport) return [];
    const students = new Map<string, StudentReport>();
    reportStudentData.filter((student) => student.cohort === selectedCohortReport.cohort).forEach((student) => {
      const existing = students.get(student.id);
      if (existing) {
        existing.attended += student.attended;
        existing.total += student.total;
        existing.rate = existing.total ? Math.round((existing.attended / existing.total) * 100) : 0;
        existing.lastSeen = existing.lastSeen === 'Not yet recorded' || student.lastSeen > existing.lastSeen ? student.lastSeen : existing.lastSeen;
        existing.status = existing.rate >= 90 ? 'On track' : existing.rate >= 70 ? 'Watch list' : 'At risk';
      } else {
        students.set(student.id, {
          ...student,
          course: 'All courses',
        });
      }
    });
    return [...students.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedCohortReport, reportStudentData]);

  const selectedCoursePageCount = Math.max(1, Math.ceil(selectedCourseStudents.length / pageSize));
  const selectedCohortStudentPageCount = Math.max(1, Math.ceil(selectedCohortStudents.length / pageSize));
  const paginatedCourseStudents = selectedCourseStudents.slice(
    (Math.min(reportTablePage, selectedCoursePageCount) - 1) * pageSize,
    Math.min(reportTablePage, selectedCoursePageCount) * pageSize
  );
  const paginatedCohortStudents = selectedCohortStudents.slice(
    (Math.min(reportTablePage, selectedCohortStudentPageCount) - 1) * pageSize,
    Math.min(reportTablePage, selectedCohortStudentPageCount) * pageSize
  );

  const handleSendMessage = () => {
    if (!selectedRecord || !('id' in selectedRecord)) return;
    const insight = buildPerformanceInsight(selectedRecord);
    const params = new URLSearchParams({
      studentId: selectedRecord.id,
      studentName: selectedRecord.name,
      course: selectedRecord.course,
      channel: messageChannel,
      message: insight.message,
      objective: insight.objective,
    });

    setDeliveryStatus(`Opened communication workflow for ${selectedRecord.name} in the admin messaging system.`);
    window.location.href = `/admin/messages?${params.toString()}`;
  };

  const handleCreateFollowUpCall = () => {
    if (!selectedRecord || !('id' in selectedRecord)) return;
    const insight = buildPerformanceInsight(selectedRecord);
    setFollowUpNote(insight.objective);
    setDeliveryStatus(`Call follow-up objective prepared for ${selectedRecord.name}.`);
  };

  const exportStudentReport = async (mode: 'view' | 'download') => {
    if (!currentStudentReport) return;
    const selectedRecord = currentStudentReport;
    setExportingReport(mode);
    setReportExportError('');
    const studentRows = getStudentCoursesPerformance(selectedRecord.id, reportStudentData);
    const overall = calculateOverallPerformance(selectedRecord.id, reportStudentData);
    try {
      await exportBrandedPdf(() => ({
        title: 'Student Attendance Report',
        subtitle: `Attendance summary · ${reportScopeLabel}`,
        fileName: `Rhema-Attendance-Report-${selectedRecord.id}-${reportingPeriod}`,
        student: { name: selectedRecord.name, id: selectedRecord.id, cohort: selectedRecord.cohort },
        sections: [
          {
            title: 'Attendance summary',
            fields: [
              { label: 'Overall attendance', value: `${overall.rate}%` },
              { label: 'Sessions attended', value: String(overall.attended) },
              { label: 'Total sessions', value: String(overall.total) },
              { label: 'Report period', value: reportScopeLabel },
              { label: 'Email', value: selectedRecord.email },
              { label: 'Phone', value: selectedRecord.phone },
            ],
          },
          ...Object.entries(studentRows).map(([term, rows]) => ({
            title: term,
            columns: ['Course', 'Attended', 'Total', 'Rate', 'Status'],
            rows: rows.map((row) => [row.courseName, String(row.attended), String(row.total), `${row.rate}%`, row.status]),
          })),
          {
            title: 'Session attendance detail',
            columns: ['Course', 'Session', 'Date', 'Class period', 'Time', 'Attendance', 'Audio purchase', 'Recorded at'],
            rows: selectedStudentSessionLog.map((session) => [
              session.course,
              session.notes || 'Class session',
              session.date,
              session.classPeriod,
              `${session.start}–${session.end}`,
              session.status,
              session.status === 'Missed' ? (session.audioBought ? 'Audio bought' : audioAccessAvailable ? 'Not bought' : 'Unknown') : '—',
              session.recordedAt || '—',
            ]),
          },
        ],
      }), mode);
    } catch (reason) {
      setReportExportError(reason instanceof Error ? reason.message : 'Unable to prepare the attendance report PDF.');
    } finally {
      setExportingReport(null);
    }
  };

  const exportCurrentReport = async (mode: 'view' | 'download') => {
    setExportingReport(mode);
    setReportExportError('');
    try {
      const report = activeTab === 'student'
        ? {
          title: 'Student Attendance Report',
          subtitle: `Attendance summary by student and course · ${reportScopeLabel}`,
          fileName: `Rhema-Student-Attendance-Report-${reportingPeriod}`,
          sections: [{
            title: 'Student attendance',
            columns: ['Student ID', 'Student', 'Cohort', 'Course', 'Attended', 'Sessions', 'Rate', 'Status'],
            rows: reportStudentData.map((row) => [row.id, row.name, row.cohort, row.course, String(row.attended), String(row.total), `${row.rate}%`, row.status]),
          }],
        }
        : activeTab === 'course'
          ? {
            title: 'Course Attendance Report',
            subtitle: `Attendance performance by course · ${reportScopeLabel}`,
            fileName: `Rhema-Course-Attendance-Report-${reportingPeriod}`,
            sections: [{
              title: 'Course attendance',
              columns: ['Course', 'Title', 'Cohort', 'Sessions', 'Present', 'Absent', 'Rate'],
              rows: reportCourseData.map((row) => [row.code, row.title, row.cohort, String(row.sessions), String(row.present), String(row.absent), `${row.attendance}%`]),
            }],
          }
          : {
            title: 'Cohort Attendance Report',
            subtitle: `Attendance performance by cohort · ${reportScopeLabel}`,
            fileName: `Rhema-Cohort-Attendance-Report-${reportingPeriod}`,
            sections: [{
              title: 'Cohort attendance',
              columns: ['Cohort', 'Students', 'Average attendance', 'Present', 'Absent', 'At risk'],
              rows: reportCohortData.map((row) => [row.cohort, String(row.students), `${row.average}%`, String(row.present), String(row.absent), String(row.risk)]),
            }],
          };
      await exportBrandedPdf(() => report, mode);
    } catch (reason) {
      setReportExportError(reason instanceof Error ? reason.message : 'Unable to prepare the attendance report PDF.');
    } finally {
      setExportingReport(null);
    }
  };

  const exportSelectedCourseReport = async () => {
    if (!selectedCourseReport) return;
    setExportingReport('download');
    setReportExportError('');
    try {
      await exportBrandedPdf(() => ({
        title: `${selectedCourseReport.title} Attendance Report`,
        subtitle: `${selectedCourseReport.code} · Cohort ${selectedCourseReport.cohort} · ${reportScopeLabel}`,
        fileName: `Rhema-Course-${selectedCourseReport.code}-${reportingPeriod}`,
        sections: [{
          title: 'Student attendance performance',
          columns: ['Student ID', 'Student', 'Cohort', 'Attended', 'Missed', 'Total', 'Rate', 'Status'],
          rows: selectedCourseStudents.map((student) => [
            student.id,
            student.name,
            student.cohort,
            String(student.attended),
            String(Math.max(0, student.total - student.attended)),
            String(student.total),
            `${student.rate}%`,
            student.status,
          ]),
        }],
      }), 'download');
    } catch (error) {
      setReportExportError(error instanceof Error ? error.message : 'Unable to prepare the course attendance PDF.');
    } finally {
      setExportingReport(null);
    }
  };

  const exportSelectedCohortReport = async () => {
    if (!selectedCohortReport) return;
    setExportingReport('download');
    setReportExportError('');
    try {
      await exportBrandedPdf(() => ({
        title: `Cohort ${selectedCohortReport.cohort} Attendance Report`,
        subtitle: `Course and student performance · ${reportScopeLabel}`,
        fileName: `Rhema-Cohort-${selectedCohortReport.cohort}-${reportingPeriod}`,
        sections: [
          {
            title: 'Course performance',
            columns: ['Course', 'Students', 'Attended', 'Missed', 'Rate'],
            rows: selectedCohortCourseRows.map((course) => [
              course.course,
              String(course.students),
              String(course.attended),
              String(course.missed),
              `${course.percentage}%`,
            ]),
          },
          {
            title: 'Student performance',
            columns: ['Student ID', 'Student', 'Courses', 'Attended', 'Missed', 'Rate', 'Status'],
            rows: selectedCohortStudents.map((student) => [
              student.id,
              student.name,
              String(reportStudentData.filter((row) => row.id === student.id && row.cohort === selectedCohortReport.cohort).length),
              String(student.attended),
              String(Math.max(0, student.total - student.attended)),
              `${student.rate}%`,
              student.status,
            ]),
          },
        ],
      }), 'download');
    } catch (error) {
      setReportExportError(error instanceof Error ? error.message : 'Unable to prepare the cohort attendance PDF.');
    } finally {
      setExportingReport(null);
    }
  };

  const totalPresent = reportCourseData.reduce((sum, course) => sum + course.present, 0);
  const totalPossible = reportCourseData.reduce((sum, course) => sum + course.present + course.absent, 0);
  const overallAttendance = totalPossible ? Math.round((totalPresent / totalPossible) * 100) : 0;
  const atRiskLearners = reportCohortData.reduce((sum, cohort) => sum + cohort.risk, 0);
  const courseOptions = [...new Set(reportCourseData.map((course) => course.code))];
  const cohortOptions = [...new Set(reportCohortData.map((cohort) => cohort.cohort))];

  if (selectedCohortReport && !selectedRecord) {
    const cohortPresent = selectedCohortStudents.reduce((sum, student) => sum + student.attended, 0);
    const cohortMissed = selectedCohortStudents.reduce((sum, student) => sum + Math.max(0, student.total - student.attended), 0);
    const cohortAttendance = cohortPresent + cohortMissed ? Math.round((cohortPresent / (cohortPresent + cohortMissed)) * 100) : 0;

    return (
      <main className="mx-auto w-full max-w-7xl space-y-6 pb-12">
        <button
          type="button"
          onClick={() => setSelectedCohortReport(null)}
          className="attendance-no-print inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> Back to cohort reports
        </button>
        <ReportPeriodToolbar
          period={reportingPeriod}
          anchorDate={reportAnchorDate}
          termId={selectedTermId}
          terms={academicTerms}
          periodLabel={reportScopeLabel}
          termsError={academicTermsError}
          exporting={exportingReport !== null}
          onPeriodChange={(period) => { setReportingPeriod(period); setReportTablePage(1); }}
          onAnchorDateChange={(date) => { setReportAnchorDate(date); setReportTablePage(1); }}
          onTermChange={(termId) => { setSelectedTermId(termId); setReportTablePage(1); }}
          onPrint={() => window.print()}
          onDownload={() => void exportSelectedCohortReport()}
        />
        {reportExportError && <p role="alert" className="attendance-no-print rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{reportExportError}</p>}

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600">Cohort attendance report</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">Cohort {selectedCohortReport.cohort}</h1>
              <p className="mt-1 text-sm text-slate-500">Course attendance and individual student performance · {reportScopeLabel}</p>
            </div>
            <p className="text-3xl font-black text-slate-900">{cohortAttendance}%</p>
          </div>
        </section>

        <section aria-label="Cohort attendance summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Students', value: String(selectedCohortStudents.length), tone: 'text-blue-900 bg-blue-50' },
            { label: 'Courses', value: String(selectedCohortCourseRows.length), tone: 'text-violet-700 bg-violet-50' },
            { label: 'Present records', value: String(cohortPresent), tone: 'text-emerald-700 bg-emerald-50' },
            { label: 'Missed records', value: String(cohortMissed), tone: 'text-red-700 bg-red-50' },
          ].map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{metric.label}</p>
              <p className={`mt-3 inline-flex rounded-xl px-3 py-1 text-2xl font-black ${metric.tone}`}>{metric.value}</p>
            </div>
          ))}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-900">Course performance</h2>
            <p className="mt-1 text-sm text-slate-500">Attendance totals for each course in this cohort.</p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Course</th>
                    <th className="px-4 py-3">Students</th>
                    <th className="px-4 py-3">Attended</th>
                    <th className="px-4 py-3">Missed</th>
                    <th className="px-4 py-3">Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCohortCourseRows.map((course) => (
                    <tr key={course.course} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-bold text-slate-900">{course.course}</td>
                      <td className="px-4 py-3 text-slate-700">{course.students}</td>
                      <td className="px-4 py-3 font-bold text-emerald-700">{course.attended}</td>
                      <td className="px-4 py-3 font-bold text-red-700">{course.missed}</td>
                      <td className="px-4 py-3 font-black text-slate-900">{course.percentage}%</td>
                    </tr>
                  ))}
                  {selectedCohortCourseRows.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">No course attendance records were found for this cohort.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-900">Student performance</h2>
            <p className="mt-1 text-sm text-slate-500">Select a student to open their full attendance record.</p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Courses</th>
                    <th className="px-4 py-3">Attended</th>
                    <th className="px-4 py-3">Missed</th>
                    <th className="px-4 py-3">Attendance</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCohortStudents.map((student) => (
                    <tr
                      key={student.id}
                      onClick={() => { setStudentLogTab('courses'); setSelectedRecord(student); }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setStudentLogTab('courses');
                          setSelectedRecord(student);
                        }
                      }}
                      tabIndex={0}
                      className="cursor-pointer border-t border-slate-100 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                    >
                      <td className="px-4 py-3"><p className="font-bold text-slate-900">{student.name}</p><p className="text-xs text-slate-500">{student.id}</p></td>
                      <td className="px-4 py-3 text-slate-700">{reportStudentData.filter((row) => row.id === student.id && row.cohort === selectedCohortReport.cohort).length}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">{student.attended}</td>
                      <td className="px-4 py-3 font-semibold text-red-700">{Math.max(0, student.total - student.attended)}</td>
                      <td className="px-4 py-3 font-black text-slate-900">{student.rate}%</td>
                      <td className="px-4 py-3 text-slate-600">{student.status}</td>
                    </tr>
                  ))}
                  {selectedCohortStudents.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">No student attendance records were found for this cohort.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination
              page={reportTablePage}
              pageCount={selectedCohortStudentPageCount}
              total={selectedCohortStudents.length}
              pageSize={pageSize}
              itemLabel="students"
              onPageChange={setReportTablePage}
            />
          </div>
        </section>
      </main>
    );
  }

  if (selectedCourseReport && !selectedRecord) {
    const studentCount = selectedCourseStudents.length;
    const presentCount = selectedCourseStudents.reduce((sum, student) => sum + student.attended, 0);
    const possibleCount = selectedCourseStudents.reduce((sum, student) => sum + student.total, 0);
    const courseAttendance = possibleCount ? Math.round((presentCount / possibleCount) * 100) : 0;
    const currentCourseReport = reportCourseData.find((course) => course.code === selectedCourseReport.code);

    return (
      <main className="mx-auto w-full max-w-7xl space-y-6 pb-12">
        <button
          type="button"
          onClick={() => setSelectedCourseReport(null)}
          className="attendance-no-print inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> Back to course reports
        </button>
        <ReportPeriodToolbar
          period={reportingPeriod}
          anchorDate={reportAnchorDate}
          termId={selectedTermId}
          terms={academicTerms}
          periodLabel={reportScopeLabel}
          termsError={academicTermsError}
          exporting={exportingReport !== null}
          onPeriodChange={(period) => { setReportingPeriod(period); setReportTablePage(1); }}
          onAnchorDateChange={(date) => { setReportAnchorDate(date); setReportTablePage(1); }}
          onTermChange={(termId) => { setSelectedTermId(termId); setReportTablePage(1); }}
          onPrint={() => window.print()}
          onDownload={() => void exportSelectedCourseReport()}
        />
        {reportExportError && <p role="alert" className="attendance-no-print rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{reportExportError}</p>}

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600">Course attendance report</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">{selectedCourseReport.title}</h1>
              <p className="mt-1 text-sm text-slate-500">{selectedCourseReport.code} · Cohort {selectedCourseReport.cohort} · {reportScopeLabel}</p>
            </div>
            <p className="text-3xl font-black text-slate-900">{courseAttendance}%</p>
          </div>
        </section>

        <section aria-label="Course attendance summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Students enrolled', value: String(studentCount), tone: 'text-blue-900 bg-blue-50' },
            { label: 'Sessions held', value: String(currentCourseReport?.sessions ?? 0), tone: 'text-violet-700 bg-violet-50' },
            { label: 'Present records', value: String(presentCount), tone: 'text-emerald-700 bg-emerald-50' },
            { label: 'Missed records', value: String(Math.max(0, possibleCount - presentCount)), tone: 'text-red-700 bg-red-50' },
          ].map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{metric.label}</p>
              <p className={`mt-3 inline-flex rounded-xl px-3 py-1 text-2xl font-black ${metric.tone}`}>{metric.value}</p>
            </div>
          ))}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-900">Student attendance performance</h2>
            <p className="mt-1 text-sm text-slate-500">Select a student to open their full attendance record.</p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Cohort</th>
                    <th className="px-4 py-3">Attended</th>
                    <th className="px-4 py-3">Missed</th>
                    <th className="px-4 py-3">Attendance</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCourseStudents.map((student) => (
                    <tr
                      key={student.id}
                      onClick={() => { setStudentLogTab('courses'); setSelectedRecord(student); }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setStudentLogTab('courses');
                          setSelectedRecord(student);
                        }
                      }}
                      tabIndex={0}
                      className="cursor-pointer border-t border-slate-100 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                    >
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">{student.name}</p>
                        <p className="text-xs text-slate-500">{student.id}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{student.cohort}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">{student.attended}</td>
                      <td className="px-4 py-3 font-semibold text-red-700">{Math.max(0, student.total - student.attended)}</td>
                      <td className="px-4 py-3 font-black text-slate-900">{student.rate}%</td>
                      <td className="px-4 py-3 text-slate-600">{student.status}</td>
                    </tr>
                  ))}
                  {selectedCourseStudents.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">No active course enrollments were found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination
              page={reportTablePage}
              pageCount={selectedCoursePageCount}
              total={selectedCourseStudents.length}
              pageSize={pageSize}
              itemLabel="students"
              onPageChange={setReportTablePage}
            />
          </div>
        </section>
      </main>
    );
  }

  if (selectedRecord && 'id' in selectedRecord && activeInsight && currentStudentReport) {
    const selectedRecord = currentStudentReport;
    const completedSessions = selectedStudentSessionLog.filter((session) => session.status !== 'Upcoming');
    const presentSessions = completedSessions.filter((session) => session.status === 'Present').length;
    const missedSessions = completedSessions.filter((session) => session.status === 'Missed').length;
    const attendanceRate = completedSessions.length ? Math.round((presentSessions / completedSessions.length) * 100) : 0;
    const courseAttendanceRows = selectedStudentCourses.map((course) => {
      const sessions = selectedStudentSessionLog.filter((session) => session.courseId === course.id && session.status !== 'Upcoming');
      const attended = sessions.filter((session) => session.status === 'Present').length;
      const missed = sessions.filter((session) => session.status === 'Missed').length;
      return {
        course,
        sessions: sessions.length,
        attended,
        missed,
        percentage: sessions.length ? Math.round((attended / sessions.length) * 100) : 0,
      };
    });
    const normalizedCourseSearch = courseSummarySearch.trim().toLowerCase();
    const filteredCourseAttendanceRows = courseAttendanceRows
      .filter(({ course, missed, percentage }) => {
        const matchesSearch = !normalizedCourseSearch
          || course.course.toLowerCase().includes(normalizedCourseSearch)
          || course.id.toLowerCase().includes(normalizedCourseSearch);
        const matchesFilter = courseSummaryFilter === 'all'
          || (courseSummaryFilter === 'missed' && missed > 0)
          || (courseSummaryFilter === 'perfect' && percentage === 100)
          || (courseSummaryFilter === 'below-75' && percentage < 75);
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        const left = courseSummarySort === 'course' ? a.course.course.toLowerCase() : a[courseSummarySort];
        const right = courseSummarySort === 'course' ? b.course.course.toLowerCase() : b[courseSummarySort];
        const comparison = typeof left === 'string' && typeof right === 'string'
          ? left.localeCompare(right)
          : Number(left) - Number(right);
        return courseSummarySortDirection === 'asc' ? comparison : -comparison;
      });
    const normalizedSessionSearch = sessionLogSearch.trim().toLowerCase();
    const filteredStudentSessionLog = selectedStudentSessionLog
      .filter((session) => {
        const matchesSearch = !normalizedSessionSearch
          || session.course.toLowerCase().includes(normalizedSessionSearch)
          || session.notes.toLowerCase().includes(normalizedSessionSearch)
          || session.classPeriod.toLowerCase().includes(normalizedSessionSearch)
          || session.date.includes(normalizedSessionSearch)
          || session.status.toLowerCase().includes(normalizedSessionSearch);
        const matchesStatus = sessionLogStatusFilter === 'all' || session.status === sessionLogStatusFilter;
        const matchesAudio = sessionLogAudioFilter === 'all'
          || (sessionLogAudioFilter === 'bought' && session.audioBought)
          || (sessionLogAudioFilter === 'not-bought' && audioAccessAvailable && session.status === 'Missed' && !session.audioBought)
          || (sessionLogAudioFilter === 'unknown' && !audioAccessAvailable && session.status === 'Missed');
        return matchesSearch && matchesStatus && matchesAudio;
      })
      .sort((a, b) => {
        const left = sessionLogSort === 'course' ? a.course.toLowerCase() : sessionLogSort === 'status' ? a.status : a.date;
        const right = sessionLogSort === 'course' ? b.course.toLowerCase() : sessionLogSort === 'status' ? b.status : b.date;
        const comparison = left.localeCompare(right) || a.start.localeCompare(b.start);
        return sessionLogSortDirection === 'asc' ? comparison : -comparison;
      });
    const courseSummaryPageCount = Math.max(1, Math.ceil(filteredCourseAttendanceRows.length / pageSize));
    const currentCourseSummaryPage = Math.min(courseSummaryPage, courseSummaryPageCount);
    const paginatedCourseAttendanceRows = filteredCourseAttendanceRows.slice(
      (currentCourseSummaryPage - 1) * pageSize,
      currentCourseSummaryPage * pageSize
    );
    const sessionLogPageCount = Math.max(1, Math.ceil(filteredStudentSessionLog.length / pageSize));
    const currentSessionLogPage = Math.min(sessionLogPage, sessionLogPageCount);
    const paginatedStudentSessionLog = filteredStudentSessionLog.slice(
      (currentSessionLogPage - 1) * pageSize,
      currentSessionLogPage * pageSize
    );
    return (
      <main ref={reportRef} className="mx-auto w-full max-w-7xl space-y-6 pb-12">
        <div className="attendance-no-print flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSelectedRecord(null)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" /> Back to attendance registry
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={() => void exportStudentReport('view')} disabled={exportingReport !== null} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-slate-700 shadow-sm disabled:opacity-60">
              {exportingReport === 'view' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}View report PDF
            </button>
          </div>
        </div>

        {reportExportError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{reportExportError}</div>}
        {followupSyncError && (
          <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Missed-session notifications could not be synchronized: {followupSyncError} Apply the attendance follow-up database migration and try again.
            <a href="/admin/communications" className="ml-2 font-bold underline">Open communications follow-ups</a>
          </div>
        )}
        <ReportPeriodToolbar
          period={reportingPeriod}
          anchorDate={reportAnchorDate}
          termId={selectedTermId}
          terms={academicTerms}
          periodLabel={reportScopeLabel}
          termsError={academicTermsError}
          exporting={exportingReport !== null}
          onPeriodChange={(period) => { setReportingPeriod(period); setCourseSummaryPage(1); setSessionLogPage(1); }}
          onAnchorDateChange={(date) => { setReportAnchorDate(date); setCourseSummaryPage(1); setSessionLogPage(1); }}
          onTermChange={(termId) => { setSelectedTermId(termId); setCourseSummaryPage(1); setSessionLogPage(1); }}
          onPrint={() => window.print()}
          onDownload={() => void exportStudentReport('download')}
        />

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-2xl font-black text-red-700">
                {selectedRecord.name.charAt(0)}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600">Individual attendance log</p>
                <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">{selectedRecord.name}</h1>
                <p className="mt-1 text-sm text-slate-500">Student ID {selectedRecord.id} · Cohort {selectedRecord.cohort}</p>
              </div>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wide ${
              attendanceRate >= 90 ? 'bg-emerald-50 text-emerald-700' : attendanceRate >= 70 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
            }`}>
              {attendanceRate}% attendance
            </span>
          </div>
          <p className="mt-5 max-w-3xl text-sm leading-6 text-slate-600">{activeInsight.summary}</p>
          <p className="mt-2 text-xs text-slate-500">Missed means a scheduled session has ended without a present record. Future sessions remain marked as upcoming.</p>
        </section>

        <section aria-label="Attendance summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Courses', value: String(selectedStudentCourses.length), tone: 'text-blue-900 bg-blue-50' },
            { label: 'Present', value: String(presentSessions), tone: 'text-emerald-700 bg-emerald-50' },
            { label: 'Missed', value: String(missedSessions), tone: 'text-red-700 bg-red-50' },
            { label: 'Scheduled sessions', value: String(selectedStudentSessionLog.length), tone: 'text-violet-700 bg-violet-50' },
          ].map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{metric.label}</p>
              <p className={`mt-3 inline-flex rounded-xl px-3 py-1 text-2xl font-black ${metric.tone}`}>{metric.value}</p>
            </div>
          ))}
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-900">Attendance details</h2>
              <p className="mt-1 text-sm text-slate-500">Morning and evening options count as one course meeting; the session log shows the class period attended.</p>
            </div>
            <div role="tablist" aria-label="Attendance detail views" className="flex rounded-xl border border-slate-200 bg-white p-1">
              {(['courses', 'sessions'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={studentLogTab === tab}
                  onClick={() => setStudentLogTab(tab)}
                  className={`rounded-lg px-4 py-2 text-xs font-black uppercase tracking-wide ${
                    studentLogTab === tab ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tab === 'courses' ? 'Course summary' : 'Session log'}
                </button>
              ))}
            </div>
          </div>
          {schedulePayload === null ? (
            <div role={attendanceLoadStatus ? 'alert' : undefined} className={`rounded-2xl border p-8 text-center text-sm ${attendanceLoadStatus ? 'border-red-200 bg-red-50 text-red-800' : 'border-slate-200 bg-white text-slate-500'}`}>
              {attendanceLoadStatus || 'Loading course sessions and attendance records...'}
            </div>
          ) : studentLogTab === 'courses' ? (
            <>
            <div className="attendance-no-print grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500">
                <Search className="h-4 w-4 shrink-0" />
                <input
                  value={courseSummarySearch}
                  onChange={(event) => { setCourseSummarySearch(event.target.value); setCourseSummaryPage(1); }}
                  placeholder="Search course"
                  aria-label="Search courses"
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500">
                <Filter className="h-4 w-4 shrink-0" />
                <select value={courseSummaryFilter} onChange={(event) => { setCourseSummaryFilter(event.target.value as typeof courseSummaryFilter); setCourseSummaryPage(1); }} aria-label="Filter course attendance" className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none">
                  <option value="all">All attendance</option>
                  <option value="missed">Has missed sessions</option>
                  <option value="perfect">100% attendance</option>
                  <option value="below-75">Below 75%</option>
                </select>
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500">
                <span className="shrink-0 text-xs font-bold">Sort by</span>
                <select value={courseSummarySort} onChange={(event) => setCourseSummarySort(event.target.value as typeof courseSummarySort)} aria-label="Sort course summary" className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none">
                  <option value="course">Course</option>
                  <option value="sessions">Total sessions</option>
                  <option value="attended">Attended</option>
                  <option value="missed">Missed</option>
                  <option value="percentage">Attendance %</option>
                </select>
              </label>
              <button type="button" onClick={() => setCourseSummarySortDirection((direction) => direction === 'asc' ? 'desc' : 'asc')} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                {courseSummarySortDirection === 'asc' ? 'Ascending' : 'Descending'}
              </button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Course</th>
                      <th className="px-4 py-3">Total sessions</th>
                      <th className="px-4 py-3">Attended</th>
                      <th className="px-4 py-3">Missed</th>
                      <th className="px-4 py-3">Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCourseAttendanceRows.map(({ course, sessions, attended, missed, percentage }) => (
                      <tr key={course.id} className="border-t border-slate-100">
                        <td className="px-4 py-3"><p className="font-bold text-slate-900">{course.course}</p><p className="text-xs text-slate-500">{course.id}</p></td>
                        <td className="px-4 py-3 text-slate-700">{sessions}</td>
                        <td className="px-4 py-3 font-bold text-emerald-700">{attended}</td>
                        <td className="px-4 py-3 font-bold text-red-700">{missed}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${percentage}%` }} /></div>
                            <span className="font-black text-slate-900">{percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredCourseAttendanceRows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">{courseAttendanceRows.length === 0 ? 'No active course enrollments were found.' : 'No courses match the current search and filters.'}</td></tr>}
                  </tbody>
                </table>
              </div>
              <TablePagination
                page={currentCourseSummaryPage}
                pageCount={courseSummaryPageCount}
                total={filteredCourseAttendanceRows.length}
                pageSize={pageSize}
                itemLabel="courses"
                onPageChange={setCourseSummaryPage}
              />
            </div>
            </>
          ) : selectedStudentSessionLog.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No scheduled sessions were found for this student’s active course enrollments.</div>
          ) : (
            <>
            <div className="attendance-no-print grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-5">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 xl:col-span-2">
                <Search className="h-4 w-4 shrink-0" />
                <input
                  value={sessionLogSearch}
                  onChange={(event) => { setSessionLogSearch(event.target.value); setSessionLogPage(1); }}
                  placeholder="Search course, session, date or status"
                  aria-label="Search sessions"
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500">
                <Filter className="h-4 w-4 shrink-0" />
                <select value={sessionLogStatusFilter} onChange={(event) => { setSessionLogStatusFilter(event.target.value as typeof sessionLogStatusFilter); setSessionLogPage(1); }} aria-label="Filter session attendance" className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none">
                  <option value="all">All statuses</option>
                  <option value="Present">Present</option>
                  <option value="Missed">Missed</option>
                  <option value="Upcoming">Upcoming</option>
                </select>
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500">
                <select value={sessionLogAudioFilter} onChange={(event) => { setSessionLogAudioFilter(event.target.value as typeof sessionLogAudioFilter); setSessionLogPage(1); }} aria-label="Filter audio purchase status" className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none">
                  <option value="all">All audio status</option>
                  <option value="bought">Audio bought</option>
                  {audioAccessAvailable ? <option value="not-bought">Audio not bought</option> : <option value="unknown">Audio status unknown</option>}
                </select>
              </label>
              <div className="flex gap-2">
                <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500">
                  <span className="shrink-0 text-xs font-bold">Sort</span>
                  <select value={sessionLogSort} onChange={(event) => setSessionLogSort(event.target.value as typeof sessionLogSort)} aria-label="Sort session log" className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none">
                    <option value="date">Date</option>
                    <option value="course">Course</option>
                    <option value="status">Status</option>
                  </select>
                </label>
                <button type="button" aria-label={`Sort ${sessionLogSortDirection === 'asc' ? 'descending' : 'ascending'}`} onClick={() => setSessionLogSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc')} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                  {sessionLogSortDirection === 'asc' ? 'Ascending' : 'Descending'}
                </button>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {!audioAccessAvailable && <p className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">Audio purchase status is unavailable because audio access tables are not installed.</p>}
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Course</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Class attended</th>
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3">Attendance</th>
                      <th className="px-4 py-3">Audio purchase</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStudentSessionLog.map((session) => (
                      <tr key={`${session.courseId}-${session.sessionId}`} className="border-t border-slate-100">
                        <td className="px-4 py-3"><p className="font-bold text-slate-900">{session.course}</p><p className="text-xs text-slate-500">{session.notes || 'Class session'}</p></td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{new Date(`${session.date}T12:00:00`).toLocaleDateString()}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700">{session.classPeriod}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{session.start}–{session.end}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                            session.status === 'Present' ? 'bg-emerald-50 text-emerald-700' : session.status === 'Missed' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                          }`}>
                            {session.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {session.status === 'Missed' ? (
                            <span className={`text-xs font-bold ${session.audioBought ? 'text-emerald-700' : audioAccessAvailable ? 'text-amber-700' : 'text-slate-500'}`}>
                              {session.audioBought ? 'Audio bought' : audioAccessAvailable ? 'Not bought' : 'Unknown'}
                            </span>
                          ) : <span className="text-slate-400">—</span>}
                        </td>
                      </tr>
                    ))}
                    {filteredStudentSessionLog.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">No sessions match the current search and filters.</td></tr>}
                  </tbody>
                </table>
              </div>
              <TablePagination
                page={currentSessionLogPage}
                pageCount={sessionLogPageCount}
                total={filteredStudentSessionLog.length}
                pageSize={pageSize}
                itemLabel="sessions"
                onPageChange={setSessionLogPage}
              />
            </div>
            </>
          )}
        </section>
      </main>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="attendance-no-print flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-600">Student affairs</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Class attendance registry</h1>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void exportCurrentReport('view')} disabled={exportingReport !== null} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-slate-700 shadow-sm disabled:opacity-60">
            {exportingReport === 'view' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}View report PDF
          </button>
        </div>
      </div>
      {reportExportError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{reportExportError}</div>}
      <ReportPeriodToolbar
        period={reportingPeriod}
        anchorDate={reportAnchorDate}
        termId={selectedTermId}
        terms={academicTerms}
        periodLabel={reportScopeLabel}
        termsError={academicTermsError}
        exporting={exportingReport !== null}
        onPeriodChange={(period) => { setReportingPeriod(period); setCurrentPage(1); setReportTablePage(1); }}
        onAnchorDateChange={(date) => { setReportAnchorDate(date); setCurrentPage(1); setReportTablePage(1); }}
        onTermChange={(termId) => { setSelectedTermId(termId); setCurrentPage(1); setReportTablePage(1); }}
        onPrint={() => window.print()}
        onDownload={() => void exportCurrentReport('download')}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Overall attendance</p>
          <div className="mt-4 flex items-end justify-between">
            <p className="text-3xl font-black text-slate-900">{overallAttendance}%</p>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Live</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Students present</p>
          <div className="mt-4 flex items-end justify-between">
            <p className="text-3xl font-black text-slate-900">{totalPresent}</p>
            <CheckCheck className="h-5 w-5 text-emerald-600" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">At-risk learners</p>
          <div className="mt-4 flex items-end justify-between">
            <p className="text-3xl font-black text-slate-900">{atRiskLearners}</p>
            <Clock3 className="h-5 w-5 text-amber-600" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Sessions tracked</p>
          <div className="mt-4 flex items-end justify-between">
            <p className="text-3xl font-black text-slate-900">{reportCourseData.reduce((sum, course) => sum + course.sessions, 0)}</p>
            <CalendarDays className="h-5 w-5 text-violet-600" />
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="attendance-no-print flex flex-wrap gap-2">
            {(['student', 'course', 'cohort'] as FocusTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
                className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.2em] ${
                  activeTab === tab ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                {tab === 'student' ? 'Individual log' : tab === 'course' ? 'Course watchlist' : 'Cohort report'}
              </button>
            ))}
          </div>

          {activeTab !== 'course' && <div className="attendance-no-print flex flex-col gap-3 md:flex-row">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500">
              <Search className="h-4 w-4" />
              <input
                value={searchTerm}
                onChange={(event) => { setSearchTerm(event.target.value); setCurrentPage(1); }}
                placeholder="Search student"
                className="w-40 bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500">
              <Filter className="h-4 w-4" />
              <select value={selectedCourse} onChange={(event) => { setSelectedCourse(event.target.value); setCurrentPage(1); }} className="bg-transparent text-sm outline-none">
                <option>All courses</option>
                {courseOptions.map((course) => <option key={course}>{course}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500">
              <Users className="h-4 w-4" />
              <select value={selectedCohort} onChange={(event) => { setSelectedCohort(event.target.value); setCurrentPage(1); }} className="bg-transparent text-sm outline-none">
                <option>All cohorts</option>
                {cohortOptions.map((cohort) => <option key={cohort}>{cohort}</option>)}
              </select>
            </div>
          </div>}
        </div>

        {attendanceLoadStatus && <p className="mt-3 text-xs font-semibold text-slate-500">{attendanceLoadStatus}</p>}

        {activeTab === 'student' && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Cohort</th>
                    <th className="px-4 py-3">Attendance</th>
                    <th className="px-4 py-3">Last seen</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.map((student) => (
                    <tr
                      key={student.id}
                      onClick={() => setSelectedRecord(student)}
                      className="border-t border-slate-200 bg-white hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-xs font-black text-red-700">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{student.name}</p>
                            <p className="text-[11px] text-slate-500">{student.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">{student.cohort}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-900">{student.attended}/{student.total}</span>
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                            <div className="h-full rounded-full bg-red-600" style={{ width: `${student.rate}%` }} />
                          </div>
                          <span className="text-xs font-bold text-slate-600">{student.rate}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{student.lastSeen}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                          student.status === 'On track' ? 'bg-emerald-50 text-emerald-700' : student.status === 'Watch list' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {student.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-semibold text-slate-500">
                Showing {Math.min((currentPage - 1) * pageSize + 1, filteredStudents.length)}-{Math.min(currentPage * pageSize, filteredStudents.length)} of {filteredStudents.length} students
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="text-xs font-bold text-slate-700">Page {currentPage} / {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'course' && (
          <section className="mt-6 space-y-4" aria-label="Course attendance snapshot">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900">Course attendance snapshot</h2>
                <p className="mt-1 text-sm text-slate-500">Search, filter, and sort course performance. Select a row to open the student breakdown.</p>
              </div>
              <p className="text-xs font-semibold text-slate-500">{courseWatchlistRows.length} course {courseWatchlistRows.length === 1 ? 'record' : 'records'}</p>
            </div>
            <div className="attendance-no-print grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500">
                <Search className="h-4 w-4 shrink-0" />
                <input
                  value={courseWatchlistSearch}
                  onChange={(event) => { setCourseWatchlistSearch(event.target.value); setCourseWatchlistPage(1); }}
                  placeholder="Search course or cohort"
                  aria-label="Search course attendance"
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500">
                <Users className="h-4 w-4 shrink-0" />
                <select value={courseWatchlistCohort} onChange={(event) => { setCourseWatchlistCohort(event.target.value); setCourseWatchlistPage(1); }} aria-label="Filter course attendance by cohort" className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none">
                  <option>All cohorts</option>
                  {courseWatchlistCohorts.map((cohort) => <option key={cohort}>{cohort}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500">
                <Filter className="h-4 w-4 shrink-0" />
                <select value={courseWatchlistStatus} onChange={(event) => { setCourseWatchlistStatus(event.target.value as typeof courseWatchlistStatus); setCourseWatchlistPage(1); }} aria-label="Filter courses by attendance status" className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none">
                  <option value="all">All attendance levels</option>
                  <option value="on-track">On track (90%+)</option>
                  <option value="watch-list">Watch list (70–89%)</option>
                  <option value="at-risk">At risk (below 70%)</option>
                </select>
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500">
                <span className="shrink-0 text-xs font-bold">Rows</span>
                <select value={courseWatchlistPageSize} onChange={(event) => { setCourseWatchlistPageSize(Number(event.target.value)); setCourseWatchlistPage(1); }} aria-label="Course attendance rows per page" className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none">
                  <option value={6}>6 per page</option>
                  <option value={12}>12 per page</option>
                  <option value={24}>24 per page</option>
                </select>
              </label>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                    <tr>
                      {([
                        ['course', 'Course'],
                        ['cohort', 'Cohort'],
                        ['students', 'Students'],
                        ['sessions', 'Sessions'],
                        ['present', 'Present'],
                        ['absent', 'Absent'],
                        ['attendance', 'Attendance'],
                      ] as const).map(([key, label]) => (
                        <th key={key} scope="col" aria-sort={courseWatchlistSort === key ? (courseWatchlistSortDirection === 'asc' ? 'ascending' : 'descending') : 'none'} className="whitespace-nowrap px-4 py-3">
                          <button type="button" onClick={() => {
                            if (courseWatchlistSort === key) {
                              setCourseWatchlistSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc');
                            } else {
                              setCourseWatchlistSort(key);
                              setCourseWatchlistSortDirection(key === 'course' || key === 'cohort' ? 'asc' : 'desc');
                            }
                            setCourseWatchlistPage(1);
                          }} className="inline-flex items-center gap-1.5 hover:text-red-700">
                            {label}{courseWatchlistSort === key && <span aria-hidden="true">{courseWatchlistSortDirection === 'asc' ? '↑' : '↓'}</span>}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCourseWatchlistRows.map((course) => (
                      <tr
                        key={`${course.code}:${course.cohort}`}
                        onClick={() => { setSelectedCourseReport(course); setSelectedCohortReport(null); setSelectedRecord(null); setReportTablePage(1); }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedCourseReport(course);
                            setSelectedCohortReport(null);
                            setSelectedRecord(null);
                            setReportTablePage(1);
                          }
                        }}
                        tabIndex={0}
                        className="cursor-pointer border-t border-slate-100 transition-colors hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                      >
                        <td className="px-4 py-3"><p className="font-bold text-slate-900">{course.title}</p><p className="text-xs text-slate-500">{course.code}</p></td>
                        <td className="px-4 py-3 text-slate-700">{course.cohort}</td>
                        <td className="px-4 py-3 text-slate-700">{course.students}</td>
                        <td className="px-4 py-3 text-slate-700">{course.sessions}</td>
                        <td className="px-4 py-3 font-bold text-emerald-700">{course.present}</td>
                        <td className="px-4 py-3 font-bold text-red-700">{course.absent}</td>
                        <td className="px-4 py-3">
                          <div className="flex min-w-[145px] items-center gap-2">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${course.attendance >= 90 ? 'bg-emerald-500' : course.attendance >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${course.attendance}%` }} /></div>
                            <span className="w-10 text-right font-black text-slate-900">{course.attendance}%</span>
                            <span className={`whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide ${course.status === 'on-track' ? 'bg-emerald-50 text-emerald-700' : course.status === 'watch-list' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                              {course.status === 'on-track' ? 'On track' : course.status === 'watch-list' ? 'Watch list' : 'At risk'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {courseWatchlistRows.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">{reportCourseData.length === 0 ? 'No completed course attendance records were found for this reporting period.' : 'No courses match the current search and filters.'}</td></tr>}
                  </tbody>
                </table>
              </div>
              <TablePagination
                page={courseWatchlistPage}
                pageCount={courseWatchlistPageCount}
                total={courseWatchlistRows.length}
                pageSize={courseWatchlistPageSize}
                itemLabel="courses"
                onPageChange={setCourseWatchlistPage}
              />
            </div>
          </section>
        )}

        {activeTab === 'cohort' && (
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {displayedCohortData.map((group) => (
              <button
                key={group.cohort}
                type="button"
                onClick={() => { setSelectedCohortReport(group); setSelectedCourseReport(null); setSelectedRecord(null); setReportTablePage(1); }}
                aria-label={`Open attendance report for cohort ${group.cohort}`}
                className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
              >
                <div className="flex items-center justify-between gap-3 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-black text-white">
                      {group.cohort}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Cohort</p>
                      <p className="text-lg font-black text-slate-900">{group.cohort}</p>
                    </div>
                  </div>
                  <span className="text-xl font-black text-slate-900">{group.average}%</span>
                </div>

                <div className="space-y-3 text-sm text-slate-700">
                  <div className="flex items-center justify-between"><span>Students</span><span className="font-bold">{group.students}</span></div>
                  <div className="flex items-center justify-between"><span>Present</span><span className="font-bold text-emerald-700">{group.present}</span></div>
                  <div className="flex items-center justify-between"><span>Absent</span><span className="font-bold text-red-700">{group.absent}</span></div>
                  <div className="flex items-center justify-between"><span>At risk</span><span className="font-bold text-amber-700">{group.risk}</span></div>
                </div>
                <span className="mt-5 inline-flex text-xs font-black uppercase tracking-wide text-blue-900">View courses and student performance <ArrowLeft className="ml-2 h-4 w-4 rotate-180" /></span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedRecord && 'id' in selectedRecord && activeInsight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div ref={reportRef} className="bg-white w-full max-w-3xl rounded-[2rem] border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="border-b border-slate-200 bg-slate-50 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-xl font-black text-red-700">
                    {selectedRecord.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Student Report</p>
                    <h2 className="text-2xl font-black text-slate-900">{selectedRecord.name}</h2>
                    <p className="text-sm text-slate-500">ID: {selectedRecord.id} | Cohort: {selectedRecord.cohort} | Current term: {selectedRecord.term}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedRecord(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              <div className={`rounded-2xl border-2 p-5 ${selectedRecord.rate >= 90 ? 'border-emerald-200 bg-emerald-50' : selectedRecord.rate >= 70 ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${selectedRecord.rate >= 90 ? 'bg-emerald-100 text-emerald-700' : selectedRecord.rate >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                    {selectedRecord.rate >= 90 ? <TrendingUp className="h-5 w-5" /> : selectedRecord.rate >= 70 ? <TrendingDown className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <p className={`font-black text-sm ${selectedRecord.rate >= 90 ? 'text-emerald-900' : selectedRecord.rate >= 70 ? 'text-amber-900' : 'text-red-900'}`}>
                      {activeInsight.title}
                    </p>
                    <p className={`text-sm mt-2 ${selectedRecord.rate >= 90 ? 'text-emerald-800' : selectedRecord.rate >= 70 ? 'text-amber-800' : 'text-red-800'}`}>
                      {activeInsight.summary}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Overall</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">{calculateOverallPerformance(selectedRecord.id, reportStudentData).rate}%</p>
                  <p className="text-xs text-slate-500 mt-1">{calculateOverallPerformance(selectedRecord.id, reportStudentData).attended}/{calculateOverallPerformance(selectedRecord.id, reportStudentData).total} sessions</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Current course</p>
                  <p className="mt-2 text-lg font-black text-slate-900">{selectedRecord.course}</p>
                  <p className="text-xs text-slate-500 mt-1">{selectedRecord.attended}/{selectedRecord.total} sessions</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status</p>
                  <p className={`mt-2 text-sm font-black ${selectedRecord.status === 'On track' ? 'text-emerald-700' : selectedRecord.status === 'Watch list' ? 'text-amber-700' : 'text-red-700'}`}>
                    {selectedRecord.status}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Last seen {selectedRecord.lastSeen}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Performance by term</p>
                    <h3 className="mt-1 text-lg font-black text-slate-900">All courses</h3>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => void exportStudentReport('view')} disabled={exportingReport !== null} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-slate-700 disabled:opacity-60">
                      {exportingReport === 'view' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}View PDF
                    </button>
                    <button type="button" onClick={() => void exportStudentReport('download')} disabled={exportingReport !== null} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-white disabled:opacity-60">
                      {exportingReport === 'download' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}Download
                    </button>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-100 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                      <tr>
                        <th className="px-3 py-3">Course</th>
                        <th className="px-3 py-3">Term</th>
                        <th className="px-3 py-3">Attended</th>
                        <th className="px-3 py-3">Total</th>
                        <th className="px-3 py-3">Rate</th>
                        <th className="px-3 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(getStudentCoursesPerformance(selectedRecord.id, reportStudentData)).flatMap(([term, rows]) =>
                        rows.map((row) => (
                          <tr key={`${term}-${row.courseCode}`} className="border-t border-slate-200">
                            <td className="px-3 py-3 font-medium text-slate-800">{row.courseName}</td>
                            <td className="px-3 py-3 text-slate-600">{term}</td>
                            <td className="px-3 py-3 text-slate-800">{row.attended}</td>
                            <td className="px-3 py-3 text-slate-800">{row.total}</td>
                            <td className="px-3 py-3 font-bold text-slate-900">{row.rate}%</td>
                            <td className="px-3 py-3">
                              <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                                row.status === 'On track' ? 'bg-emerald-50 text-emerald-700' : row.status === 'Watch list' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                              }`}>
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3 border-t border-slate-200 pt-6">
                <h3 className="font-black text-slate-900 text-sm uppercase tracking-[0.1em]">Communication workflow</h3>
                <p className="text-xs text-slate-500">{activeInsight.objective}</p>

                <div className="flex gap-2">
                  {(['sms', 'whatsapp', 'email'] as DeliveryChannel[]).map((channel) => (
                    <button
                      key={channel}
                      onClick={() => setMessageChannel(channel)}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black uppercase tracking-[0.1em] transition-all ${
                        messageChannel === channel ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {channel === 'sms' && <Smartphone className="h-3.5 w-3.5" />}
                      {channel === 'whatsapp' && <MessageCircle className="h-3.5 w-3.5" />}
                      {channel === 'email' && <Mail className="h-3.5 w-3.5" />}
                      {channel.toUpperCase()}
                    </button>
                  ))}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Prepared message</p>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium italic">{activeInsight.message}</p>
                </div>

                {deliveryStatus && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-xs font-bold text-emerald-800">{deliveryStatus}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSendMessage}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-3 text-xs font-black tracking-[0.1em] uppercase text-white transition-all"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Open in communications
                  </button>
                  <button
                    onClick={handleCreateFollowUpCall}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-3 text-xs font-black tracking-[0.1em] uppercase text-slate-700 transition-all"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Call Follow-up
                  </button>
                </div>
              </div>

              {followUpNote && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700 mb-2">Follow-up Objective</p>
                  <p className="text-sm text-blue-800 leading-relaxed">{followUpNote}</p>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 bg-slate-50 p-4 flex gap-2">
              <button
                onClick={() => setSelectedRecord(null)}
                className="flex-1 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-black tracking-[0.1em] uppercase text-slate-700 transition-all"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedRecord(null);
                  setFollowUpNote('');
                  setDeliveryStatus('');
                }}
                className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-black tracking-[0.1em] uppercase text-white transition-all"
              >
                Complete & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
