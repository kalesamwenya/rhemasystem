'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Activity, ArrowUpRight, Banknote, CalendarDays, CheckSquare, CircleDollarSign, FileSpreadsheet, GraduationCap, LifeBuoy, RefreshCw, Users, Wallet } from 'lucide-react';
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '@/lib/api';
import { isMediaOrItDepartment } from '@/lib/admin-access';
import WebsiteStatistics from '@/components/admin/WebsiteStatistics';

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

function formatFinancialTotal(records: Record<string, unknown>[], include: (record: Record<string, unknown>) => boolean): string {
  const totals = new Map<string, number>();
  records.filter(include).forEach((record) => {
    const amount = Number(record.amount);
    const currency = typeof record.currency === 'string' && record.currency ? record.currency : 'ZMW';
    if (Number.isFinite(amount)) totals.set(currency, (totals.get(currency) ?? 0) + amount);
  });
  if (!totals.size) return new Intl.NumberFormat('en-ZM', { style: 'currency', currency: 'ZMW' }).format(0);
  return [...totals.entries()].map(([currency, amount]) => {
    try {
      return new Intl.NumberFormat('en-ZM', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(2)}`;
    }
  }).join(' · ');
}

const metricDefinitions: Record<string, Array<{ label: string; icon: typeof Users; load: () => Promise<unknown> }>> = {
  finance: [
    { label: 'Student finance ledger', icon: CircleDollarSign, load: () => api.students.adminPaymentLedger() },
    { label: 'Budget allocations', icon: FileSpreadsheet, load: () => api.finance.budgets() },
    { label: 'Expenditure records', icon: Banknote, load: () => api.finance.expenditures() },
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
    { label: 'Contact messages', icon: Activity, load: () => api.contactMessages.list() },
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
  if (role === 'owner' || role === 'administrator' || role === 'it') return 'director';
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
  const isMediaItAdmin = profile
    ? profile.admin_role.toLowerCase() === 'it' || isMediaOrItDepartment(profile.department)
    : false;
  const availableMetrics = metrics.filter((metric) => metric.value !== null);
  const studentLedger = metrics.find((metric) => metric.label === 'Student finance ledger')?.records ?? [];
  const budgetRecords = metrics.find((metric) => metric.label === 'Budget allocations')?.records ?? [];
  const expenditureRecords = metrics.find((metric) => metric.label === 'Expenditure records')?.records ?? [];
  const financeLinks = [
    { label: 'Student accounts & payment ledger', href: '/admin/payments', icon: CircleDollarSign },
    { label: 'Financial reports', href: '/admin/financials', icon: Activity },
    { label: 'Budgets', href: '/admin/budgets', icon: FileSpreadsheet },
    { label: 'Expenditures', href: '/admin/expenditures', icon: Banknote },
    { label: 'Activity access requests', href: '/admin/activity-requests', icon: Wallet },
    { label: 'Store purchases', href: '/admin/store/purchases', icon: ArrowUpRight },
  ];
  const financeSummaries = [
    {
      label: 'Confirmed payments',
      value: formatFinancialTotal(studentLedger, (record) => record.entry_type === 'payment' && record.status === 'paid'),
      detail: 'Verified student payments in the ledger',
      icon: CircleDollarSign,
      source: metrics.find((metric) => metric.label === 'Student finance ledger'),
    },
    {
      label: 'Posted charges',
      value: formatFinancialTotal(studentLedger, (record) => record.entry_type === 'charge' && record.status === 'posted'),
      detail: 'Student charges recorded as posted',
      icon: Activity,
      source: metrics.find((metric) => metric.label === 'Student finance ledger'),
    },
    {
      label: 'Payments awaiting confirmation',
      value: formatFinancialTotal(studentLedger, (record) => record.entry_type === 'payment' && record.status === 'pending'),
      detail: `${studentLedger.filter((record) => record.entry_type === 'payment' && record.status === 'pending').length.toLocaleString()} pending ledger transactions`,
      icon: Wallet,
      source: metrics.find((metric) => metric.label === 'Student finance ledger'),
    },
    {
      label: 'Active budget allocations',
      value: formatFinancialTotal(budgetRecords, (record) => record.status === 'active'),
      detail: `${budgetRecords.filter((record) => record.status === 'active').length.toLocaleString()} active budgets`,
      icon: FileSpreadsheet,
      source: metrics.find((metric) => metric.label === 'Budget allocations'),
    },
    {
      label: 'Pending expenditures',
      value: formatFinancialTotal(expenditureRecords, (record) => record.status === 'pending'),
      detail: `${expenditureRecords.filter((record) => record.status === 'pending').length.toLocaleString()} awaiting review`,
      icon: Banknote,
      source: metrics.find((metric) => metric.label === 'Expenditure records'),
    },
    {
      label: 'Paid expenditures',
      value: formatFinancialTotal(expenditureRecords, (record) => record.status === 'paid'),
      detail: `${expenditureRecords.filter((record) => record.status === 'paid').length.toLocaleString()} recorded as paid`,
      icon: CircleDollarSign,
      source: metrics.find((metric) => metric.label === 'Expenditure records'),
    },
  ];
  const monthlyActivity = getMonthlyActivity(availableMetrics);
  const hasMonthlyActivity = availableMetrics.some((metric) => metric.records.some((record) => {
    const timestamp = record.created_at ?? record.createdAt;
    return typeof timestamp === 'string' && !Number.isNaN(new Date(timestamp.replace(' ', 'T')).getTime());
  }));
  return (
    <main className="pb-8">
      <div className="grid items-start gap-5">
        <div className="min-w-0 space-y-5">
          {/* {isMediaItAdmin ? (
            <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#31584c]">Rhema · Admin workspace</p>
                <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950">Media &amp; IT Dashboard</h1>
                <p className="mt-1 text-xs text-slate-500">{profile ? `${profile.department} workspace` : 'Loading your department workspace.'}</p>
              </div>
              <button
                type="button"
                onClick={() => void loadDashboard()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0f4c5c] focus:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh data
              </button>
            </header>
          ) : (
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
          )} */}

          {profileError && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <p className="font-semibold">Dashboard could not be loaded</p>
              <p className="mt-1">{profileError}</p>
            </div>
          )}

          {department && (
            <>
              {department === 'finance' ? (
                <section aria-label="Finance department dashboard" className="space-y-8">
                  <header className="flex flex-wrap items-end justify-between gap-6 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-red-700">Finance department</p>
                      <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Financial overview</h1>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Student collections, posted charges, budget allocations, and expenditure activity.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void loadDashboard()}
                      disabled={loading}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                      Refresh finances
                    </button>
                  </header>
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {financeSummaries.map((summary) => {
                      const Icon = summary.icon;
                      return (
                        <article key={summary.label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-slate-600">{summary.label}</p>
                              {loading ? (
                                <div className="mt-4 h-8 w-36 animate-pulse rounded bg-slate-100" />
                              ) : summary.source?.error ? (
                                <p className="mt-2 text-sm font-bold text-amber-800">Unavailable</p>
                              ) : (
                                <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">{summary.value}</p>
                              )}
                            </div>
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-800"><Icon className="h-5 w-5" /></span>
                          </div>
                          <p className="mt-3 text-sm leading-5 text-slate-500">{summary.source?.error || summary.detail}</p>
                        </article>
                      );
                    })}
                  </div>
                  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-label="Finance workspace links">
                    <div className="mb-6">
                      <h2 className="text-lg font-black text-slate-900">Finance workspaces</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-500">Open the detailed records and workflows for follow-up and reconciliation.</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {financeLinks.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link key={item.href} href={item.href} className="flex min-h-16 items-center justify-between gap-4 rounded-xl border border-slate-200 px-5 py-4 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-900">
                            <span className="flex items-center gap-3"><Icon className="h-5 w-5 shrink-0" />{item.label}</span>
                            <ArrowUpRight className="h-4 w-4 shrink-0" />
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                </section>
              ) : isMediaItAdmin ? (
                <section aria-label="Department summaries" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-5 py-3">
                    <h2 className="text-sm font-bold text-slate-900">Workspace summary</h2>
                    <p className="mt-0.5 text-xs text-slate-500">Live totals across your available systems.</p>
                  </div>
                  {metrics.length ? (
                    <dl className="grid grid-cols-2 gap-px bg-slate-200 md:grid-cols-4">
                      {metrics.map((metric) => (
                        <div key={metric.label} className="min-w-0 bg-white px-4 py-3.5">
                          <dt className="truncate text-xs font-semibold text-slate-600">{metric.label}</dt>
                          {loading
                            ? <dd className="mt-2 h-7 w-16 animate-pulse rounded bg-slate-100" />
                            : metric.error
                              ? <dd className="mt-1 text-xs font-semibold text-amber-800" title={metric.error}>Unavailable</dd>
                              : <dd className="mt-1 text-2xl font-black tracking-tight text-[#10283a]">{metric.value?.toLocaleString()}</dd>}
                        </div>
                      ))}
                    </dl>
                  ) : !loading && !profileError ? (
                    <p className="p-4 text-sm text-slate-600">No dashboard summaries are configured for this account.</p>
                  ) : null}
                </section>
              ) : (
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
              )}

              {!isMediaItAdmin && department !== 'finance' && <section aria-label="Live dashboard charts" className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
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
              </section>}

              {isMediaItAdmin && (
                <section aria-label="Website visitor analytics">
                  <WebsiteStatistics summaryOnly />
                </section>
              )}

              {department === 'operations' && (
                <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                  Operational summaries use available tasks, events, and schedules. Facility-management data is not available in the system.
                </p>
              )}

            </>
          )}
        </div>

      </div>
    </main>
  );
}
