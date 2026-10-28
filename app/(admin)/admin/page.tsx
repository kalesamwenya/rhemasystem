'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Activity, ArrowUpRight, CalendarDays, CheckSquare, CircleDollarSign, GraduationCap, LifeBuoy, RefreshCw, Search, Users } from 'lucide-react';
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '@/lib/api';
import { canAccessAdminModule, isMediaOrItDepartment, type AdminModule } from '@/lib/admin-access';

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
    { label: 'Website content', description: 'Edit public pages and published website content.', href: '/admin/site-content', module: 'social-media' },
    { label: 'Social media', description: 'Plan and manage social media posts.', href: '/admin/social-media', module: 'social-media' },
    { label: 'Website chatbot', description: 'Manage chatbot answers and contact leads.', href: '/admin/chatbot', module: 'chatbot' },
  ],
  operations: [
    { label: 'Tasks', description: 'Coordinate and track operational work.', href: '/admin/tasks', module: 'tasks' },
    { label: 'Events', description: 'Coordinate events and registrations.', href: '/admin/events', module: 'events' },
    { label: 'Schedules', description: 'Review published schedules.', href: '/admin/schedule', module: 'schedule' },
  ],
};

const mediaItLinks: DepartmentLink[] = [
  { label: 'Website content', description: 'Edit public pages and published website content.', href: '/admin/site-content', module: 'social-media' },
  { label: 'Social media', description: 'Plan and manage social media posts.', href: '/admin/social-media', module: 'social-media' },
  { label: 'Website chatbot', description: 'Manage chatbot answers and contact leads.', href: '/admin/chatbot', module: 'chatbot' },
  { label: 'Website contact messages', description: 'Review incoming website enquiries.', href: '/admin/contact-messages', module: 'contact-messages' },
  { label: 'Communications', description: 'Open the internal communications workspace.', href: '/admin/communications', module: 'communications' },
];

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
  const [toolQuery, setToolQuery] = useState('');

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
  const isMediaItAdmin = profile ? isMediaOrItDepartment(profile.department) : false;
  const title = isMediaItAdmin
    ? 'Media & IT Dashboard'
    : department === 'director' ? 'Director Dashboard' : department ? `${departmentTitles[department]} Dashboard` : 'Administrator Dashboard';
  const roleLinks = department === 'director'
    ? Object.entries(departmentLinks).flatMap(([role, items]) => items.map((item) => ({ ...item, group: departmentTitles[role] })))
    : department ? (departmentLinks[department] ?? []).map((item) => ({ ...item, group: '' })) : [];
  const links = [...roleLinks, ...(isMediaItAdmin ? mediaItLinks.map((item) => ({ ...item, group: 'Media & IT' })) : [])]
    .filter((item, index, all) => all.findIndex((candidate) => candidate.href === item.href) === index);
  const accessibleLinks = links.filter((item) => profile && canAccessAdminModule(profile.admin_role, profile.department, item.module));
  const filteredLinks = accessibleLinks.filter((item) =>
    `${item.label} ${item.description}`.toLowerCase().includes(toolQuery.trim().toLowerCase())
  );
  const availableMetrics = metrics.filter((metric) => metric.value !== null);
  const monthlyActivity = getMonthlyActivity(availableMetrics);
  const hasMonthlyActivity = availableMetrics.some((metric) => metric.records.some((record) => {
    const timestamp = record.created_at ?? record.createdAt;
    return typeof timestamp === 'string' && !Number.isNaN(new Date(timestamp.replace(' ', 'T')).getTime());
  }));
  return (
    <main className="pb-8">
      <div className="grid items-start gap-5">
        <div className="min-w-0 space-y-5">
          <header className="relative isolate overflow-hidden rounded-3xl bg-[#10283a] px-5 py-6 text-white shadow-lg shadow-slate-900/10 sm:px-8 sm:py-8">
            <div aria-hidden="true" className="absolute -right-12 -top-28 -z-10 h-72 w-72 rounded-full border-[34px] border-white/10" />
            <div aria-hidden="true" className="absolute -bottom-28 right-40 -z-10 h-48 w-48 rounded-full border-[26px] border-amber-300/10" />
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Rhema · Admin workspace</p>
                <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-4xl">{profile ? `Welcome, ${profile.name.split(' ')[0]}` : title}</h1>
                <p className="mt-2 text-sm leading-6 text-slate-100">{profile ? `${title.replace(' Dashboard', '')} workspace · ${profile.department}` : 'Loading your department workspace.'}</p>
              </div>
              <button
                type="button"
                onClick={() => void loadDashboard()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white px-4 py-2.5 text-sm font-bold text-[#10283a] transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 focus:ring-offset-[#10283a] disabled:cursor-wait disabled:opacity-70"
              >
                <RefreshCw className={`h-4 w-4 text-[#10283a] ${loading ? 'animate-spin' : ''}`} />
                Refresh data
              </button>
            </div>
            <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-white">{loading ? 'Updating summaries…' : `${availableMetrics.length} live summaries`}</span>
              <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-white">Auto-refreshes every minute</span>
            </div>
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
                {metrics.map((metric, index) => {
                  const Icon = metric.icon;
                  const iconStyles = [
                    'bg-rose-100 text-rose-800',
                    'bg-emerald-100 text-emerald-900',
                    'bg-amber-100 text-amber-900',
                  ];
                  return (
                    <article key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-700">{metric.label}</p>
                          {loading
                            ? <div className="mt-3 h-8 w-20 animate-pulse rounded-lg bg-slate-100" />
                            : metric.error
                              ? <p className="mt-3 text-sm font-bold text-amber-900">Unavailable</p>
                              : <p className="mt-2 text-4xl font-black tracking-tight text-[#10283a]">{metric.value?.toLocaleString()}</p>}
                        </div>
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconStyles[index % iconStyles.length]}`}><Icon className="h-5 w-5" /></span>
                      </div>
                      {metric.error && <p className="mt-2 text-xs leading-5 text-amber-900">{metric.error}</p>}
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
                          <Line type="monotone" dataKey="records" name="Records created" stroke="#0f4c5c" strokeWidth={3} dot={{ r: 3, fill: '#b42318', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#b42318' }} />
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
                            {availableMetrics.map((metric, index) => <Cell key={metric.label} fill={['#0f4c5c', '#b42318', '#8a5a00', '#216e4e', '#6b3fa0', '#475569'][index % 6]} />)}
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
                        <span className="flex min-w-0 items-center gap-2 text-slate-700"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: ['#0f4c5c', '#b42318', '#8a5a00', '#216e4e', '#6b3fa0', '#475569'][index % 6] }} /> <span className="truncate">{metric.label}</span></span>
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
                    <h2 className="text-lg font-bold text-slate-950">Workspace options</h2>
                    <p className="mt-1 text-sm text-slate-700">Quick access to tools available for your role and department.</p>
                  </div>
                </div>
                <label className="mb-4 flex max-w-md items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-700 shadow-sm focus-within:border-[#0f4c5c] focus-within:ring-2 focus-within:ring-[#0f4c5c]/20">
                  <Search className="h-4 w-4 shrink-0 text-slate-600" aria-hidden="true" />
                  <span className="sr-only">Filter workspace options</span>
                  <input
                    type="search"
                    value={toolQuery}
                    onChange={(event) => setToolQuery(event.target.value)}
                    placeholder="Search your workspace options"
                    className="w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-500"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredLinks.map((item) => (
                    <Link
                      key={`${item.group}-${item.href}`}
                      href={item.href}
                      className="group rounded-2xl border border-slate-300 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#0f4c5c] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#0f4c5c] focus:ring-offset-2"
                    >
                      {item.group && <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-red-800">{item.group}</p>}
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-bold text-slate-900">{item.label}</h3>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#0f4c5c]" />
                      </div>
                      <p className="mt-2 text-sm leading-5 text-slate-700">{item.description}</p>
                    </Link>
                  ))}
                  {filteredLinks.length === 0 && (
                    <p className="rounded-xl border border-slate-300 bg-white p-4 text-sm font-medium text-slate-700 sm:col-span-2 xl:col-span-3">
                      {toolQuery ? 'No workspace options match your search.' : 'No workspace options are available for this account.'}
                    </p>
                  )}
                </div>
              </section>
            </>
          )}
        </div>

      </div>
    </main>
  );
}
