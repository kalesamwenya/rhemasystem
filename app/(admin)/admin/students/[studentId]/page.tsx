'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  Mail,
  ShieldAlert,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';
import { api } from '@/lib/api';

type Student = {
  student_id: string;
  name: string;
  class: string;
  email?: string;
  avatar?: string;
  payment_status: string;
  account_status?: string;
};

type AttendanceSummary = {
  totalSessions: number;
  attended: number;
  absent: number;
  percentage: number;
  morning: { attended: number };
  evening: { attended: number };
};

type Grade = {
  course_id: string;
  course_name: string;
  item_name: string;
  item_type: string;
  maximum_grade: number;
  grade: number | null;
  feedback: string;
};

type AttendanceRecord = {
  course_name: string;
  session_date: string;
  start_time: string | null;
  attendance_status: string;
  checked_in_at: string | null;
};

type ServiceHour = {
  id: number;
  term_id: number;
  service_date: string;
  hours: number | string;
  ministry: string;
  supervisor: string;
  comments: string;
};

type ServiceProgress = {
  term_id: number;
  completed_hours: number;
  base_required_hours: number;
  penalty_hours: number;
  required_hours: number;
  remaining_hours: number;
  status: string;
};

type Violation = {
  id: number;
  details: string;
  incident_date: string;
  incident_time: string;
  term_id: number;
  violation_count: number;
  flagged: boolean | number;
};

type LateSlip = {
  id: number;
  course_name: string;
  session_date: string;
  late_seconds: number;
  reasons: string;
  submitted_at: string;
};

type Finance = {
  total_charges: number;
  total_paid: number;
  amount_due: number;
  liabilities_due: number;
  total_account_due: number;
  currency: string;
};

type SectionErrors = Partial<Record<'profile' | 'grades' | 'attendance' | 'service' | 'slips' | 'finance', string>>;

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function SectionError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      {message}
    </p>
  );
}

function EmptyState({ children }: { children: string }) {
  return <p className="py-6 text-center text-sm text-slate-500">{children}</p>;
}

export default function AdminStudentDetailPage() {
  const params = useParams<{ studentId: string }>();
  const studentId = params.studentId;
  const [student, setStudent] = useState<Student | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [serviceHours, setServiceHours] = useState<ServiceHour[]>([]);
  const [serviceProgress, setServiceProgress] = useState<ServiceProgress[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [lateSlips, setLateSlips] = useState<LateSlip[]>([]);
  const [finance, setFinance] = useState<Finance | null>(null);
  const [sectionErrors, setSectionErrors] = useState<SectionErrors>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 366);
    const dateParam = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    async function load() {
      setLoading(true);
      setNotFound(false);
      const results = await Promise.allSettled([
        api.students.get(studentId) as Promise<{ data?: { student: Student; attendance: AttendanceSummary } }>,
        api.students.adminGrades(studentId) as Promise<{ data?: Grade[] }>,
        api.attendance.studentCheckIns({ student_id: studentId, from: dateParam(from), to: dateParam(now) }) as Promise<{ data?: AttendanceRecord[] }>,
        api.serviceHours.list({ student_id: studentId }) as Promise<{ data?: ServiceHour[]; term_progress?: ServiceProgress[] }>,
        api.attendance.manageStudentSlips({ student_id: studentId }) as Promise<{ data?: { violations: Violation[]; late_slips: LateSlip[] } }>,
        api.students.adminStudentFinance(studentId) as Promise<{ data?: Finance }>,
      ]);
      if (!active) return;

      const errors: SectionErrors = {};
      const [profileResult, gradeResult, attendanceResult, serviceResult, slipsResult, financeResult] = results;

      if (profileResult.status === 'fulfilled' && profileResult.value.data?.student) {
        setStudent(profileResult.value.data.student);
        setAttendanceSummary(profileResult.value.data.attendance || null);
      } else {
        errors.profile = profileResult.status === 'rejected'
          ? messageOf(profileResult.reason, 'Unable to load the student profile.')
          : 'Student profile data was not returned.';
        setNotFound(profileResult.status === 'rejected' && /not found/i.test(messageOf(profileResult.reason, '')));
      }

      if (gradeResult.status === 'fulfilled' && Array.isArray(gradeResult.value.data)) {
        setGrades(gradeResult.value.data);
      } else {
        errors.grades = gradeResult.status === 'rejected' ? messageOf(gradeResult.reason, 'Unable to load grades.') : 'Academic performance data was not returned.';
      }

      if (attendanceResult.status === 'fulfilled' && Array.isArray(attendanceResult.value.data)) {
        setAttendanceRecords(attendanceResult.value.data);
      } else {
        errors.attendance = attendanceResult.status === 'rejected' ? messageOf(attendanceResult.reason, 'Unable to load attendance records.') : 'Attendance records were not returned.';
      }

      if (serviceResult.status === 'fulfilled' && Array.isArray(serviceResult.value.data)) {
        setServiceHours(serviceResult.value.data);
        setServiceProgress(serviceResult.value.term_progress || []);
      } else {
        errors.service = serviceResult.status === 'rejected' ? messageOf(serviceResult.reason, 'Unable to load church service hours.') : 'Service hour records were not returned.';
      }

      if (slipsResult.status === 'fulfilled' && slipsResult.value.data) {
        setViolations(slipsResult.value.data.violations || []);
        setLateSlips(slipsResult.value.data.late_slips || []);
      } else {
        errors.slips = slipsResult.status === 'rejected' ? messageOf(slipsResult.reason, 'Unable to load conduct records.') : 'Conduct records were not returned.';
      }

      if (financeResult.status === 'fulfilled' && financeResult.value.data) {
        setFinance(financeResult.value.data);
      } else {
        errors.finance = financeResult.status === 'rejected' ? messageOf(financeResult.reason, 'Unable to load finance details.') : 'Finance details were not returned.';
      }
      setSectionErrors(errors);
      setLoading(false);
    }

    void load();
    return () => { active = false; };
  }, [studentId]);

  const gradedItems = useMemo(() => grades.filter((item) => item.grade !== null && item.maximum_grade > 0), [grades]);
  const averageScore = useMemo(() => {
    if (!gradedItems.length) return null;
    return gradedItems.reduce((sum, item) => sum + (item.grade! / item.maximum_grade) * 100, 0) / gradedItems.length;
  }, [gradedItems]);
  const totalServiceHours = useMemo(
    () => serviceHours.reduce((sum, entry) => sum + Number(entry.hours || 0), 0),
    [serviceHours],
  );

  if (loading) {
    return <main className="flex min-h-[60vh] items-center justify-center gap-3 text-sm font-semibold text-slate-600"><Loader2 className="h-5 w-5 animate-spin" />Loading student profile…</main>;
  }

  if (!student) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <Link href="/admin/students" className="inline-flex items-center gap-2 text-sm font-bold text-blue-900"><ArrowLeft className="h-4 w-4" />Back to students</Link>
        <div className="mt-6 rounded-2xl border border-red-200 bg-white p-6 text-sm text-red-800">
          {notFound ? 'This student could not be found.' : sectionErrors.profile || 'Unable to load this student profile.'}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <Link href="/admin/students" className="inline-flex items-center gap-2 text-sm font-bold text-blue-900 hover:text-red-700"><ArrowLeft className="h-4 w-4" />Back to students</Link>

      <header className="rounded-3xl bg-slate-950 p-6 text-white shadow-lg sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10"><UserRound className="h-8 w-8" /></div>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-200">Student record · {student.student_id}</p>
              <h1 className="mt-1 truncate text-2xl font-black sm:text-3xl">{student.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-300">
                <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" />{student.class || 'No cohort assigned'}</span>
                {student.email && <span className="inline-flex items-center gap-1.5"><Mail className="h-4 w-4" />{student.email}</span>}
              </div>
            </div>
          </div>
          <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wide ${student.account_status?.toLowerCase() === 'active' ? 'bg-emerald-400/15 text-emerald-200' : 'bg-amber-400/15 text-amber-200'}`}>
            {student.account_status || 'Status unavailable'}
          </span>
        </div>
        <SectionError message={sectionErrors.profile} />
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between text-slate-500"><span className="text-xs font-black uppercase tracking-wide">Attendance</span><CalendarDays className="h-5 w-5" /></div><p className="mt-3 text-3xl font-black text-slate-900">{attendanceSummary?.percentage ?? '—'}{attendanceSummary && '%'}</p><p className="mt-1 text-xs text-slate-500">{attendanceSummary ? `${attendanceSummary.attended} present · ${attendanceSummary.absent} absent · ${attendanceSummary.totalSessions} sessions` : 'Summary unavailable'}</p><SectionError message={sectionErrors.profile} /></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between text-slate-500"><span className="text-xs font-black uppercase tracking-wide">Academic average</span><BookOpen className="h-5 w-5" /></div><p className="mt-3 text-3xl font-black text-slate-900">{averageScore === null ? '—' : `${averageScore.toFixed(1)}%`}</p><p className="mt-1 text-xs text-slate-500">{gradedItems.length} graded items · no GPA calculation</p><SectionError message={sectionErrors.grades} /></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between text-slate-500"><span className="text-xs font-black uppercase tracking-wide">Church service</span><Clock3 className="h-5 w-5" /></div><p className="mt-3 text-3xl font-black text-slate-900">{totalServiceHours.toFixed(1)} hrs</p><p className="mt-1 text-xs text-slate-500">{serviceHours.length} recorded entries</p><SectionError message={sectionErrors.service} /></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between text-slate-500"><span className="text-xs font-black uppercase tracking-wide">Account balance</span><Wallet className="h-5 w-5" /></div><p className="mt-3 text-2xl font-black text-slate-900">{finance ? formatMoney(finance.total_account_due, finance.currency) : '—'}</p><p className="mt-1 text-xs text-slate-500">{finance ? `${formatMoney(finance.total_paid, finance.currency)} paid · ${student.payment_status || 'status unavailable'}` : 'Finance summary unavailable'}</p><SectionError message={sectionErrors.finance} /></article>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-black text-slate-900">Academic performance</h2><p className="mt-1 text-xs text-slate-500">Published course and assignment grades</p></div><BookOpen className="h-5 w-5 text-blue-900" /></div>
          <SectionError message={sectionErrors.grades} />
          {grades.length === 0 ? <EmptyState>{sectionErrors.grades ? 'Grades could not be loaded.' : 'No grades recorded yet.'}</EmptyState> : (
            <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="py-2 pr-3">Course / assessment</th><th className="py-2 pr-3">Score</th><th className="py-2">Feedback</th></tr></thead><tbody className="divide-y divide-slate-100">{grades.map((item, index) => <tr key={`${item.course_id}-${item.item_name}-${index}`}><td className="py-3 pr-3"><p className="font-bold text-slate-800">{item.item_name || item.course_name}</p><p className="mt-0.5 text-xs text-slate-500">{item.course_name}</p></td><td className="whitespace-nowrap py-3 pr-3 font-semibold text-slate-700">{item.grade === null ? 'Not graded' : `${item.grade} / ${item.maximum_grade}`}</td><td className="max-w-[200px] py-3 text-xs text-slate-600">{item.feedback || '—'}</td></tr>)}</tbody></table></div>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-black text-slate-900">Church work hours</h2><p className="mt-1 text-xs text-slate-500">20 hours per term across four terms; missing a target adds a 20-hour penalty to the next term</p></div><Clock3 className="h-5 w-5 text-blue-900" /></div>
          <SectionError message={sectionErrors.service} />
          {serviceProgress.length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-2">{serviceProgress.map((term) => <div key={term.term_id} className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-black text-slate-700">Term {term.term_id} · {term.status.replace('_', ' ')}</p><p className="mt-1 text-sm font-bold text-slate-900">{term.completed_hours} / {term.required_hours} hours</p>{term.penalty_hours > 0 && <p className="mt-1 text-xs font-bold text-amber-800">{term.penalty_hours} penalty hours owed from previous term</p>}<p className="text-xs text-slate-500">{term.remaining_hours} hours owing</p></div>)}</div>}
          {serviceHours.length === 0 ? <EmptyState>{sectionErrors.service ? 'Service hours could not be loaded.' : 'No service hours recorded yet.'}</EmptyState> : (
            <div className="mt-4 space-y-2">{serviceHours.slice(0, 8).map((entry) => <div key={entry.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-100 p-3"><div><p className="text-sm font-bold text-slate-800">{entry.ministry || 'Service activity'}</p><p className="mt-1 text-xs text-slate-500">Term {entry.term_id} · {formatDate(entry.service_date)}{entry.supervisor ? ` · Supervisor: ${entry.supervisor}` : ''}</p>{entry.comments && <p className="mt-1 text-xs text-slate-600">{entry.comments}</p>}</div><span className="whitespace-nowrap rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-900">{Number(entry.hours).toFixed(1)} hrs</span></div>)}</div>
          )}
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-black text-slate-900">Attendance</h2><p className="mt-1 text-xs text-slate-500">Detailed check-ins over the last 12 months</p></div><CalendarDays className="h-5 w-5 text-blue-900" /></div>
          <SectionError message={sectionErrors.attendance} />
          {attendanceRecords.length === 0 ? <EmptyState>{sectionErrors.attendance ? 'Attendance records could not be loaded.' : 'No detailed attendance records for this period.'}</EmptyState> : (
            <div className="mt-4 max-h-[440px] space-y-2 overflow-y-auto">{attendanceRecords.slice(0, 50).map((record, index) => <div key={`${record.session_date}-${record.course_name}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{record.course_name}</p><p className="mt-1 text-xs text-slate-500">{formatDate(record.session_date)}{record.start_time ? ` · ${record.start_time}` : ''}{record.checked_in_at ? ` · Checked in ${record.checked_in_at}` : ''}</p></div><span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-700">{record.attendance_status}</span></div>)}</div>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-black text-slate-900">Code violations</h2><p className="mt-1 text-xs text-slate-500">Recorded conduct incidents</p></div><ShieldAlert className="h-5 w-5 text-amber-700" /></div>
          <SectionError message={sectionErrors.slips} />
          {violations.length === 0 ? <EmptyState>{sectionErrors.slips ? 'Conduct records could not be loaded.' : 'No code violations recorded.'}</EmptyState> : (
            <div className="mt-4 space-y-3">{violations.map((violation) => <div key={violation.id} className="rounded-xl border border-amber-100 bg-amber-50/50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-black text-slate-800">Incident · {formatDate(violation.incident_date)}</p><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${violation.flagged ? 'bg-red-100 text-red-800' : 'bg-white text-amber-800'}`}>{violation.flagged ? 'Flagged' : `${violation.violation_count} this term`}</span></div><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{violation.details || 'No incident details supplied.'}</p><p className="mt-2 text-xs text-slate-500">Term {violation.term_id}{violation.incident_time ? ` · ${violation.incident_time}` : ''}</p></div>)}</div>
          )}
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-black text-slate-900">Late slips</h2><p className="mt-1 text-xs text-slate-500">Submitted late-arrival records</p></div><AlertTriangle className="h-5 w-5 text-amber-700" /></div>
          <SectionError message={sectionErrors.slips} />
          {lateSlips.length === 0 ? <EmptyState>{sectionErrors.slips ? 'Late slips could not be loaded.' : 'No late slips recorded.'}</EmptyState> : (
            <div className="mt-4 space-y-2">{lateSlips.map((slip) => <div key={slip.id} className="rounded-xl border border-slate-100 p-3"><div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-bold text-slate-800">{slip.course_name}</p><span className="text-xs font-bold text-amber-800">{Math.floor(Number(slip.late_seconds) / 60)} min late</span></div><p className="mt-1 text-xs text-slate-500">{formatDate(slip.session_date)} · Submitted {formatDate(slip.submitted_at)}</p>{slip.reasons && <p className="mt-2 text-xs text-slate-600">{slip.reasons}</p>}</div>)}</div>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-black text-slate-900">Finance summary</h2><p className="mt-1 text-xs text-slate-500">Student charges, payments, and outstanding amounts</p></div><Wallet className="h-5 w-5 text-blue-900" /></div>
          <SectionError message={sectionErrors.finance} />
          {!finance ? <EmptyState>{sectionErrors.finance ? 'Finance details could not be loaded.' : 'No finance summary available.'}</EmptyState> : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">{[
              ['Total charges', finance.total_charges],
              ['Total paid', finance.total_paid],
              ['Tuition due', finance.amount_due],
              ['Other liabilities', finance.liabilities_due],
            ].map(([label, amount]) => <div key={String(label)} className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-1 text-lg font-black text-slate-900">{formatMoney(Number(amount), finance.currency)}</p></div>)}</div>
          )}
        </article>
      </section>

      <p className="flex items-center justify-center gap-2 pb-4 text-xs text-slate-500"><CheckCircle2 className="h-4 w-4" />Student information is shown from the current academic and finance records.</p>
    </main>
  );
}
