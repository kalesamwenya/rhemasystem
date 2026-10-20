'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Activity, ArrowUpRight, CalendarDays, CheckSquare, CircleDollarSign, GraduationCap, LifeBuoy, RefreshCw, Users } from 'lucide-react';
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '@/lib/api';
import { canAccessAdminModule, type AdminModule } from '@/lib/admin-access';

interface DashboardProfile {
  admin_role: string;
  department: string;
  name: string;
}

interface Metric {
  label: string;
  value: number | null;
  error: string | null;
  icon: typeof Users;
  records: Record<string, unknown>[];
}

interface DepartmentLink {
  label: string;
  description: string;
  href: string;
  module: AdminModule;
}

const departmentLinks: Record<string, DepartmentLink[]> = {
  finance: [
    { label: 'Payments & ledgers', description: 'Review student payment records and receipts.', href: '/admin/payments', module: 'finance' },
    { label: 'Financial reports', description: 'Review finance summaries and reporting.', href: '/admin/financials', module: 'finance' },
    { label: 'Store purchases', description: 'Review store orders and payment status.', href: '/admin/store/purchases', module: 'store' },
    { label: 'Budgets', description: 'Manage departmental budgets.', href: '/admin/budgets', module: 'finance' },
  ],
  registrar: [
    { label: 'Student records', description: 'Review and maintain student records.', href: '/admin/students', module: 'students' },
    { label: 'Admissions', description: 'Manage admissions and enrolment.', href: '/admin/admissions', module: 'admissions' },
    { label: 'Attendance & follow-ups', description: 'Review attendance and student follow-ups.', href: '/admin/student-affairs', module: 'student-affairs' },
    { label: 'Events', description: 'Manage event registrations and attendance.', href: '/admin/events', module: 'events' },
  ],
  academic: [
    { label: 'Courses & assessments', description: 'Manage courses, grades and assessments.', href: '/admin/courses', module: 'academics' },
    { label: 'Academic schedule', description: 'Review course and class schedules.', href: '/admin/schedule', module: 'schedule' },
    { label: 'Library', description: 'Manage academic library resources.', href: '/admin/library', module: 'library' },
    { label: 'Student affairs', description: 'Review attendance and student support activity.', href: '/admin/student-affairs', module: 'student-affairs' },
  ],
  support: [
    { label: 'Help desk', description: 'Review and respond to support requests.', href: '/admin/help-desk', module: 'help-desk' },
    { label: 'Communications', description: 'Manage administrator communications.', href: '/admin/communications', module: 'communications' },
    { label: 'Contact messages', description: 'Review website contact enquiries.', href: '/admin/contact-messages', module: 'contact-messages' },
    { label: 'Media & site content', description: 'Manage social media and published content.', href: '/admin/social-media', module: 'social-media' },
  ],
  operations: [
    { label: 'Tasks', description: 'Coordinate and track operational work.', href: '/admin/tasks', module: 'tasks' },
    { label: 'Events', description: 'Coordinate events and registrations.', href: '/admin/events', module: 'events' },
    { label: 'Schedules', description: 'Review published schedules.', href: '/admin/schedule', module: 'schedule' },
  ],
};

const metricDefinitions: Record<string, Array<{ label: string; icon: typeof Users; load: () => Promise<unknown> }>> = {
  finance: [
    { label: 'Student payment records', icon: CircleDollarSign, load: () => api.students.adminPaymentLedger() },
    { label: 'Store purchases', icon: Activity, load: () => api.purchases.list() },
  ],
  registrar: [
    { label: 'Student records', icon: Users, load: () => api.students.adminRoster() },
    { label: 'Attendance records', icon: CalendarDays, load: () => api.attendance.list() },
  ],
  academic: [
    { label: 'Courses', icon: GraduationCap, load: () => api.courses.list() },
    { label: 'Scheduled classes', icon: CalendarDays, load: () => api.courses.schedules() },
  ],
  support: [
    { label: 'Help desk requests', icon: LifeBuoy, load: () => api.helpDesk.list() },
    { label: 'Contact messages', icon: Activity, load: () => api.chatbot.contactMessages() },
  ],
  operations: [
    { label: 'Operational tasks', icon: CheckSquare, load: () => api.tasks.list() },
    { label: 'Scheduled events', icon: CalendarDays, load: () => api.events.list() },
    { label: 'Published schedules', icon: Activity, load: () => api.courses.schedules() },
  ],
};

const departmentTitles: Record<string, string> = {
  finance: 'Accounts',
  registrar: 'Student Affairs',
  academic: 'Academic Dean',
  support: 'Media & IT',
  operations: 'Operations',
};

function departmentForRole(role: string): string | null {
  if (role === 'owner' || role === 'administrator') return 'director';
  return departmentTitles[role] ? role : null;
}

function extractRecords(response: unknown): Record<string, unknown>[] {
  const recognizedKeys = ['data', 'students', 'payments', 'records', 'items', 'events', 'tasks', 'purchases', 'courses', 'schedules', 'tickets', 'requests', 'messages', 'logs', 'registrations'];
  const findArray = (value: unknown, depth = 0): unknown[] | null => {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== 'object' || depth > 2) return null;
    const record = value as Record<string, unknown>;
    for (const key of recognizedKeys) {
      if (Array.isArray(record[key])) return record[key] as unknown[];
    }
    for (const key of recognizedKeys) {
      if (record[key] && typeof record[key] === 'object') {
        const nested = findArray(record[key], depth + 1);
        if (nested) return nested;
      }
    }
    return null;
  };

  const records = findArray(response);
  if (!records) throw new Error('The API response did not contain a record list.');
  if (records.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) {
    throw new Error('The API returned an invalid record list.');
  }
  return records as Record<string, unknown>[];
}

function getMonthlyActivity(metrics: Metric[]) {
  const currentMonth = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 5 + index, 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      month: date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
      records: 0,
    };
  });
  const byMonth = new Map(months.map((month) => [month.key, month]));
  for (const metric of metrics) {
    for (const record of metric.records) {
      const timestamp = record.created_at ?? record.createdAt;
      if (typeof timestamp !== 'string') continue;
      const parsed = new Date(timestamp.replace(' ', 'T'));
      if (Number.isNaN(parsed.getTime())) continue;
      const month = byMonth.get(`${parsed.getFullYear()}-${parsed.getMonth()}`);
      if (month) month.records += 1;
    }
  }
  return months;
}

export default function AdminDashboard() {
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setProfileError('');
    try {
      const session = await api.adminSession() as { user?: DashboardProfile };
      const adminProfile = session.user;
      if (!adminProfile?.admin_role || !adminProfile.department) {
        throw new Error('The administrator session did not include a role and department.');
      }
      setProfile(adminProfile);
      const department = departmentForRole(adminProfile.admin_role);
      const definitions = department === 'director'
        ? [...metricDefinitions.finance.slice(0, 1), ...metricDefinitions.registrar.slice(0, 1), ...metricDefinitions.academic.slice(0, 1), ...metricDefinitions.support.slice(0, 1), ...metricDefinitions.operations.slice(0, 2)]
        : department ? metricDefinitions[department] ?? [] : [];
      const results = await Promise.all(definitions.map(async (definition) => {
        try {
          const records = extractRecords(await definition.load());
          return { label: definition.label, icon: definition.icon, value: records.length, error: null, records };
        } catch (error) {
          return {
            label: definition.label,
            icon: definition.icon,
            value: null,
            error: error instanceof Error ? error.message : 'Could not load this summary.',
            records: [],
          };
        }
      }));
      setMetrics(results);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Could not load your administrator dashboard.');
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadDashboard(), 0);
    const refreshInterval = window.setInterval(() => void loadDashboard(), 60_000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(refreshInterval);
    };
  }, [loadDashboard]);

  const department = profile ? departmentForRole(profile.admin_role) : null;
  const title = department === 'director' ? 'Director Dashboard' : department ? `${departmentTitles[department]} Dashboard` : 'Administrator Dashboard';
  const links = department === 'director'
    ? Object.entries(departmentLinks).flatMap(([role, items]) => items.map((item) => ({ ...item, group: departmentTitles[role] })))
    : department ? (departmentLinks[department] ?? []).map((item) => ({ ...item, group: '' })) : [];
  const availableMetrics = metrics.filter((metric) => metric.value !== null);
  const monthlyActivity = getMonthlyActivity(availableMetrics);
  const hasMonthlyActivity = availableMetrics.some((metric) => metric.records.some((record) => {
    const timestamp = record.created_at ?? record.createdAt;
    return typeof timestamp === 'string' && !Number.isNaN(new Date(timestamp.replace(' ', 'T')).getTime());
  }));
  const today = new Date();
  const firstWeekday = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const calendarCells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];

  return (
    <main className="pb-8">
      <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0 space-y-5">
          <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 sm:px-7">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">Rhema · Admin workspace</p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{profile ? `Hello, ${profile.name.split(' ')[0]}` : title}</h1>
              <p className="mt-1.5 text-sm text-slate-500">{profile ? `Your ${department === 'director' ? 'leadership' : departmentTitles[department ?? ''] ?? 'department'} overview is ready.` : 'Loading your department workspace.'}</p>
            </div>
            <button
              type="button"
              onClick={() => void loadDashboard()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#9ab2a6] hover:bg-[#f6f8f6] disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 text-[#31584c] ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </header>

          {profileError && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <p className="font-semibold">Dashboard could not be loaded</p>
              <p className="mt-1">{profileError}</p>
            </div>
          )}

          {department && (
            <>
              <section aria-label="Department summaries" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {metrics.map((metric, index) => {
                  const Icon = metric.icon;
                  const iconStyles = [
                    'bg-[#fbe9e7] text-red-700',
                    'bg-[#e8f1ec] text-[#31584c]',
                    'bg-[#f6efe3] text-[#9a6a19]',
                  ];
                  return (
                    <article key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 sm:p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-500">{metric.label}</p>
                          {loading
                            ? <div className="mt-3 h-8 w-20 animate-pulse rounded-lg bg-slate-100" />
                            : metric.error
                              ? <p className="mt-3 text-sm font-semibold text-amber-800">Unavailable</p>
                              : <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{metric.value?.toLocaleString()}</p>}
                        </div>
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconStyles[index % iconStyles.length]}`}><Icon className="h-5 w-5" /></span>
                      </div>
                      {metric.error && <p className="mt-2 text-xs leading-5 text-amber-800">{metric.error}</p>}
                    </article>
                  );
                })}
                {!loading && metrics.length === 0 && !profileError && (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">No dashboard summaries are configured for this account.</p>
                )}
              </section>

              <section aria-label="Live dashboard charts" className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
                <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-bold text-slate-900">Activity overview</h2>
                      <p className="mt-1 text-xs text-slate-500">Records created over the past six months.</p>
                    </div>
                    <span className="rounded-lg bg-[#e8f1ec] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#31584c]">Live data</span>
                  </div>
                  {loading ? <div className="mt-4 h-56 animate-pulse rounded-xl bg-slate-50" /> : hasMonthlyActivity ? (
                    <div className="mt-4 h-56" role="img" aria-label="Line chart showing monthly record activity">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyActivity} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
                          <CartesianGrid stroke="#e9eeeb" strokeDasharray="4 5" vertical={false} />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#68746e' }} />
                          <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#68746e' }} />
                          <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#dce3de', fontSize: 12 }} />
                          <Line type="monotone" dataKey="records" name="Records created" stroke="#173b3a" strokeWidth={3} dot={{ r: 3, fill: '#b91c1c', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#b91c1c' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="mt-4 flex h-56 items-center justify-center rounded-xl bg-slate-50 px-4 text-center text-sm text-slate-500">
                      {availableMetrics.length ? 'No dated records are available for this chart.' : 'Chart data is unavailable because the department summaries could not be loaded.'}
                    </p>
                  )}
                </article>
                <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                  <h2 className="font-bold text-slate-900">Records by source</h2>
                  <p className="mt-1 text-xs text-slate-500">Current totals from department systems.</p>
                  {loading ? <div className="mt-4 h-56 animate-pulse rounded-xl bg-slate-50" /> : availableMetrics.length ? (
                    <div className="mt-4 h-56" role="img" aria-label="Pie chart showing record totals by data source">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={availableMetrics.map(({ label, value }) => ({ name: label, records: value ?? 0 }))} dataKey="records" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={78} paddingAngle={3}>
                            {availableMetrics.map((metric, index) => <Cell key={metric.label} fill={['#173b3a', '#b91c1c', '#c99b4b', '#668c7b', '#8a6d5b', '#7c8791'][index % 6]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#dce3de', fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="mt-4 flex h-56 items-center justify-center rounded-xl bg-slate-50 px-4 text-center text-sm text-slate-500">
                      Chart data is unavailable because the department summaries could not be loaded.
                    </p>
                  )}
                  <div className="mt-2 grid gap-2">
                    {availableMetrics.map((metric, index) => (
                      <div key={metric.label} className="flex items-center justify-between gap-3 text-xs">
                        <span className="flex min-w-0 items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: ['#173b3a', '#b91c1c', '#c99b4b', '#668c7b', '#8a6d5b', '#7c8791'][index % 6] }} /> <span className="truncate">{metric.label}</span></span>
                        <span className="font-bold text-slate-900">{metric.value?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </article>
              </section>

              {department === 'operations' && (
                <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                  Operational summaries use available tasks, events, and schedules. Facility-management data is not available in the system.
                </p>
              )}

              <section aria-label="Department tools">
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Your department tools</h2>
                    <p className="mt-1 text-sm text-slate-500">Quick access to the workspaces available to your role.</p>
                  </div>
                  <span className="hidden text-xs font-medium text-slate-400 sm:block">{links.length} workspaces</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {links.filter((item) => profile && canAccessAdminModule(profile.admin_role, profile.department, item.module)).map((item) => (
                    <Link
                      key={`${item.group}-${item.href}`}
                      href={item.href}
                      className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#9ab2a6] hover:bg-[#fcfdfc] sm:p-5"
                    >
                      {item.group && <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-red-700">{item.group}</p>}
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-bold text-slate-900">{item.label}</h3>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#31584c]" />
                      </div>
                      <p className="mt-2 text-sm leading-5 text-slate-500">{item.description}</p>
                    </Link>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>

        <aside className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-1">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Signed in as</p>
                <h2 className="mt-1 font-bold text-slate-900">Administrator</h2>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fbe9e7] text-red-700"><Users className="h-4 w-4" /></span>
            </div>
            <div className="my-5 flex flex-col items-center border-y border-slate-100 py-5 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-[#e8f1ec] bg-[#173b3a] text-lg font-black text-white">
                {profile?.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AD'}
              </div>
              <p className="mt-3 font-bold text-slate-900">{profile?.name || 'Loading profile…'}</p>
              <p className="mt-1 text-xs text-slate-500">{profile?.department}</p>
              <span className="mt-3 rounded-full bg-[#e8f1ec] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#31584c]">{title.replace(' Dashboard', '')}</span>
            </div>
            <p className="text-center text-[11px] leading-5 text-slate-500">Your access is tailored to your department. Dashboard data refreshes automatically every minute.</p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-red-700">Today</p>
                <h2 className="mt-1 font-bold text-slate-900">{today.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
              </div>
              <CalendarDays className="h-5 w-5 text-[#31584c]" />
            </div>
            <div className="grid grid-cols-7 gap-y-2 text-center">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <span key={`${day}-${index}`} className="pb-1 text-[10px] font-bold text-slate-400">{day}</span>)}
              {calendarCells.map((day, index) => day
                ? <span key={index} className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[11px] ${day === today.getDate() ? 'bg-[#173b3a] font-bold text-white' : 'text-slate-600'}`}>{day}</span>
                : <span key={`blank-${index}`} />)}
            </div>
            <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">Use your department schedule for class and event details.</p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:col-span-2 2xl:col-span-1">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Get started</p>
                <h2 className="mt-1 font-bold text-slate-900">Quick links</h2>
              </div>
              <ArrowUpRight className="h-4 w-4 text-red-700" />
            </div>
            <div className="divide-y divide-slate-100">
              {links.filter((item) => profile && canAccessAdminModule(profile.admin_role, profile.department, item.module)).slice(0, 4).map((item) => (
                <Link key={`quick-${item.href}`} href={item.href} className="group flex items-center justify-between gap-3 py-3 text-sm font-medium text-slate-600 transition hover:text-[#173b3a]">
                  <span className="truncate">{item.label}</span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-red-700" />
                </Link>
              ))}
              {!links.length && <p className="py-3 text-xs text-slate-500">Department workspaces will appear here when available.</p>}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
