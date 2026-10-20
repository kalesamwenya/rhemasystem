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

  return (
    <main className="space-y-6 pb-10">
      <header className="flex flex-col gap-4 border-b border-slate-200/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#58736b]">Rhema administration</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {profile ? `Welcome, ${profile.name}. Dashboard data refreshes automatically every minute.` : 'Loading your department workspace.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadDashboard()}
          disabled={loading}
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
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
          <section aria-label="Department summaries" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <article key={metric.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-500">{metric.label}</p>
                      {loading
                        ? <p className="mt-3 text-2xl font-black text-slate-400">Loading…</p>
                        : metric.error
                          ? <p className="mt-3 text-sm font-semibold text-amber-800">Unavailable</p>
                          : <p className="mt-3 text-2xl font-black text-slate-950">{metric.value?.toLocaleString()}</p>}
                    </div>
                    <span className="rounded-lg bg-[#edf3ef] p-2 text-[#31584c]"><Icon className="h-5 w-5" /></span>
                  </div>
                  {metric.error && <p className="mt-2 text-xs leading-5 text-amber-800">{metric.error}</p>}
                </article>
              );
            })}
            {!loading && metrics.length === 0 && !profileError && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">No dashboard summaries are configured for this account.</p>
            )}
          </section>

          <section aria-label="Live dashboard charts" className="grid gap-4 xl:grid-cols-2">
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-bold text-slate-900">Monthly record activity</h2>
              <p className="mt-1 text-xs text-slate-500">Records created in the last six calendar months across available department data.</p>
              {loading ? <div className="mt-4 h-64 animate-pulse rounded-lg bg-slate-100" /> : hasMonthlyActivity ? (
                <div className="mt-4 h-64" role="img" aria-label="Line chart showing monthly record activity">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyActivity} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="records" name="Records created" stroke="#31584c" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="mt-4 flex h-64 items-center justify-center rounded-lg bg-slate-50 px-4 text-center text-sm text-slate-500">
                  {availableMetrics.length ? 'No dated records are available for this chart.' : 'Chart data is unavailable because the department summaries could not be loaded.'}
                </p>
              )}
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-bold text-slate-900">Records by data source</h2>
              <p className="mt-1 text-xs text-slate-500">Current record totals from the live department APIs.</p>
              {loading ? <div className="mt-4 h-64 animate-pulse rounded-lg bg-slate-100" /> : availableMetrics.length ? (
                <div className="mt-4 h-64" role="img" aria-label="Bar chart showing record totals by data source">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={availableMetrics.map(({ label, value }) => ({ name: label, records: value ?? 0 }))} dataKey="records" nameKey="name" cx="50%" cy="48%" outerRadius={86} label={({ name, value }) => `${name}: ${value}`}>
                        {availableMetrics.map((metric, index) => <Cell key={metric.label} fill={['#31584c', '#c2413b', '#d49b2a', '#4778a8', '#7c5da8', '#30877a'][index % 6]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="mt-4 flex h-64 items-center justify-center rounded-lg bg-slate-50 px-4 text-center text-sm text-slate-500">
                  Chart data is unavailable because the department summaries could not be loaded.
                </p>
              )}
            </article>
          </section>

          {department === 'operations' && (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Operational summaries use available tasks, events, and schedules. Facility-management data is not available in the system.
            </p>
          )}

          <section aria-label="Department tools">
            <div className="mb-3">
              <h2 className="text-lg font-bold text-slate-900">Department tools</h2>
              <p className="mt-1 text-sm text-slate-500">Open a workspace available to your administrator role.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {links.filter((item) => profile && canAccessAdminModule(profile.admin_role, profile.department, item.module)).map((item) => (
                <Link
                  key={`${item.group}-${item.href}`}
                  href={item.href}
                  className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#91aaa0] hover:shadow-md"
                >
                  {item.group && <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#58736b]">{item.group}</p>}
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-bold text-slate-900">{item.label}</h3>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-[#31584c]" />
                  </div>
                  <p className="mt-2 text-sm leading-5 text-slate-600">{item.description}</p>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
