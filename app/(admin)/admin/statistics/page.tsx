'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, BarChart3, BookOpen, Eye, GraduationCap, RefreshCw, TrendingUp, Users } from 'lucide-react';
import { api } from '@/lib/api';

type Period = 7 | 30 | 365;
type StatisticsStudent = { class: string; payment_status: string };
type StatisticsCourse = { sessions: Array<unknown> };
type StatisticsAttendance = { profile_cohort?: string };

const overview = [
  { label: 'Enrollment', value: '4,876', delta: '+11.4%', tone: 'text-emerald-700 bg-emerald-50' },
  { label: 'Active Students', value: '4,120', delta: '+6.7%', tone: 'text-blue-700 bg-blue-50' },
  { label: 'Completion Rate', value: '91.2%', delta: '+3.1%', tone: 'text-violet-700 bg-violet-50' },
  { label: 'Fee Collection', value: 'K 2.8M', delta: '+14.8%', tone: 'text-amber-700 bg-amber-50' },
];

const departments = [
  { name: 'ICT', students: 980, completion: 94 },
  { name: 'Business', students: 870, completion: 89 },
  { name: 'Engineering', students: 760, completion: 92 },
  { name: 'Health Sci', students: 690, completion: 90 },
  { name: 'Education', students: 620, completion: 87 },
];

const audit = [
  { label: 'Attendance', value: '96%', status: 'Strong' },
  { label: 'Assignments', value: '88%', status: 'On track' },
  { label: 'Exams', value: '84%', status: 'Monitoring' },
  { label: 'Retention', value: '93%', status: 'Stable' },
];

type AnalyticsDashboard = {
  success: boolean;
  days: Period;
  summary: {
    unique_visitors: number;
    page_views: number;
    actions: number;
  };
  trend: Array<{ day: string; visitors: number; page_views: number }>;
  top_pages: Array<{ page_path: string; page_views: number; visitors: number }>;
  locations: Array<{
    city_name: string | null;
    region_name: string | null;
    country_code: string | null;
    country_name: string | null;
    latitude: number | string;
    longitude: number | string;
    visitors: number | string;
    page_views: number | string;
  }>;
  location_database_loaded: boolean;
  recent: Array<{
    event_type: 'page_view' | 'action';
    page_path: string;
    action_type: 'navigation' | 'button' | null;
    created_at: string;
  }>;
};

const numberFormat = new Intl.NumberFormat();

function formatDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDateTime(value: string) {
  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function StatisticsPage() {
  const [liveOverview, setLiveOverview] = useState(overview);
  const [liveDepartments, setLiveDepartments] = useState(departments);
  const [liveAudit, setLiveAudit] = useState(audit);
  const [days, setDays] = useState<Period>(30);
  const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void Promise.all([
        api.students.adminRoster(),
        api.courses.schedules(),
        api.attendance.list(),
      ]).then((
        [studentsResponse, schedulesResponse, attendanceResponse]:
          [{ data?: StatisticsStudent[] }, { data?: { schedules: StatisticsCourse[] } }, { data?: StatisticsAttendance[] }],
      ) => {
        const students = studentsResponse.data || [];
        const schedules = schedulesResponse.data?.schedules || [];
        const attendance = attendanceResponse.data || [];
        const scheduled = schedules.reduce((sum, course) => sum + course.sessions.length, 0);
        const attendanceRate = scheduled && students.length
          ? Math.round((attendance.length / (scheduled * students.length)) * 100)
          : 0;
        setLiveOverview([
          { ...overview[0], value: students.length.toLocaleString(), delta: 'Database total' },
          { ...overview[1], value: students.filter((student) => student.payment_status !== 'Blocked').length.toLocaleString(), delta: 'Active records' },
          { ...overview[2], value: `${attendanceRate}%`, delta: 'Attendance coverage' },
          { ...overview[3], value: scheduled.toLocaleString(), delta: 'Scheduled sessions' },
        ]);
        const groups = [...new Set(students.map((student) => student.class))];
        setLiveDepartments(groups.map((group) => {
          const groupStudents = students.filter((student) => student.class === group);
          return {
            name: group,
            students: groupStudents.length,
            completion: groupStudents.length
              ? Math.min(100, Math.round((attendance.filter((record) => record.profile_cohort === group).length / Math.max(1, groupStudents.length)) * 100))
              : 0,
          };
        }));
        setLiveAudit([
          { ...audit[0], value: `${attendanceRate}%`, status: attendanceRate >= 80 ? 'Strong' : 'Monitoring' },
          ...audit.slice(1),
        ]);
      }).catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      const response = await api.websiteAnalytics.dashboard(days) as AnalyticsDashboard;
      if (!response.success || !response.summary || !Array.isArray(response.trend)
        || !Array.isArray(response.top_pages) || !Array.isArray(response.locations)
        || !Array.isArray(response.recent)) {
        throw new Error('The website analytics response was incomplete.');
      }
      setDashboard(response);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load website analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh, refreshKey]);

  const maxVisitors = Math.max(1, ...((dashboard?.trend || []).map((item) => item.visitors)));
  const maxLocationVisitors = Math.max(1, ...((dashboard?.locations || []).map((item) => Number(item.visitors))));
  const summaryCards = [
    { label: 'Unique visitors', value: dashboard?.summary.unique_visitors ?? 0, icon: Users, tone: 'bg-blue-50 text-blue-700' },
    { label: 'Page views', value: dashboard?.summary.page_views ?? 0, icon: Eye, tone: 'bg-violet-50 text-violet-700' },
    { label: 'Website actions', value: dashboard?.summary.actions ?? 0, icon: Activity, tone: 'bg-emerald-50 text-emerald-700' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Public website</div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Website statistics</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Anonymous visitor counts, popular pages, and broad navigation/button activity. Form contents and visitor IDs are not shown.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="analytics-period" className="sr-only">Date range</label>
          <select
            id="analytics-period"
            value={days}
            onChange={(event) => setDays(Number(event.target.value) as Period)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={365}>Last year</option>
          </select>
          <button
            type="button"
            onClick={() => setRefreshKey((current) => current + 1)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">{error}</div>
          <button type="button" onClick={() => setRefreshKey((current) => current + 1)} className="shrink-0 font-bold underline">Retry</button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {summaryCards.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${tone}`}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </span>
            <div className="mt-3 text-2xl font-black text-slate-900">{numberFormat.format(value)}</div>
          </div>
        ))}
      </div>

      {loading && !dashboard ? (
        <p role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading website statistics…</p>
      ) : (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Daily visitors</h2>
              <p className="mt-1 text-xs text-slate-500">Distinct anonymous browser IDs that viewed a public page each day.</p>
            </div>
            {!dashboard?.trend.length ? (
              <p className="py-12 text-center text-sm text-slate-500">No visitor activity for this period yet.</p>
            ) : (
              <div className="mt-6 flex h-52 items-end gap-1 overflow-x-auto pb-7">
                {dashboard.trend.map((item) => (
                  <div key={item.day} className="group relative flex h-full min-w-3 flex-1 flex-col justify-end">
                    <div
                      className="w-full rounded-t-md bg-blue-600 transition-colors group-hover:bg-blue-700"
                      style={{ height: `${Math.max(2, (item.visitors / maxVisitors) * 100)}%` }}
                      title={`${formatDate(item.day)}: ${numberFormat.format(item.visitors)} visitors`}
                    />
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] text-slate-400">
                      {dashboard.trend.length <= 14 || item.day.endsWith('-01') ? formatDate(item.day) : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Most visited pages</h2>
              {!dashboard?.top_pages.length ? (
                <p className="py-10 text-center text-sm text-slate-500">No page views recorded for this period.</p>
              ) : (
                <div className="mt-4 divide-y divide-slate-100">
                  {dashboard.top_pages.map((page) => (
                    <div key={page.page_path} className="flex items-center justify-between gap-4 py-3">
                      <span className="min-w-0 truncate font-mono text-sm text-slate-700">{page.page_path}</span>
                      <span className="shrink-0 text-right text-xs text-slate-500">
                        <strong className="text-slate-900">{numberFormat.format(Number(page.page_views))}</strong> views
                        <span className="mx-1.5 text-slate-300">·</span>
                        {numberFormat.format(Number(page.visitors))} visitors
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Visitor locations</h2>
              <p className="mt-1 text-xs text-slate-500">Approximate IP-based locations. Points indicate city or region, not a visitor’s exact address.</p>
              {!dashboard?.location_database_loaded ? (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  The local GeoIP database has not been imported yet. Follow the setup instructions in the PHP API logs README to enable the map.
                </p>
              ) : !dashboard.locations.length ? (
                <p className="py-10 text-center text-sm text-slate-500">No mapped visitor locations for this period.</p>
              ) : (
                <>
                  <div className="mt-4 overflow-hidden rounded-xl border border-sky-100 bg-sky-50">
                    <svg viewBox="0 0 1000 500" role="img" aria-label="Approximate map of visitor locations" className="block w-full">
                      <path d="M90 130 150 85 230 70 290 98 310 135 275 155 260 190 225 205 210 250 180 280 155 245 145 205 115 180Z M280 285 325 300 350 345 340 395 315 440 295 405 300 360Z M440 115 485 90 550 95 590 115 650 100 720 110 765 140 820 145 865 180 845 210 800 205 775 235 740 220 710 250 670 240 635 260 600 240 570 210 535 205 510 180 475 175 450 150Z M485 225 530 235 555 270 545 320 525 355 505 330 495 290 470 260Z M760 300 810 285 850 305 875 345 850 375 810 370 780 345Z" fill="#dbeafe" stroke="#93c5fd" strokeWidth="2" />
                      {Array.from({ length: 7 }, (_, index) => (
                        <line key={`lat-${index}`} x1="0" x2="1000" y1={(index + 1) * 62.5} y2={(index + 1) * 62.5} stroke="#bfdbfe" strokeDasharray="5 7" />
                      ))}
                      {Array.from({ length: 11 }, (_, index) => (
                        <line key={`lon-${index}`} y1="0" y2="500" x1={(index + 1) * (1000 / 12)} x2={(index + 1) * (1000 / 12)} stroke="#bfdbfe" strokeDasharray="5 7" />
                      ))}
                      {dashboard.locations.map((location, index) => {
                        const latitude = Number(location.latitude);
                        const longitude = Number(location.longitude);
                        const x = ((longitude + 180) / 360) * 1000;
                        const y = ((90 - latitude) / 180) * 500;
                        const visitors = Number(location.visitors);
                        const title = [location.city_name, location.region_name, location.country_name].filter(Boolean).join(', ');
                        return (
                          <circle
                            key={`${location.country_code}-${location.city_name}-${location.region_name}-${index}`}
                            cx={x}
                            cy={y}
                            r={Math.min(20, 6 + (visitors / maxLocationVisitors) * 14)}
                            fill="#dc2626"
                            fillOpacity="0.78"
                            stroke="white"
                            strokeWidth="2"
                          >
                            <title>{`${title || 'Unknown location'}: ${numberFormat.format(visitors)} visitors`}</title>
                          </circle>
                        );
                      })}
                    </svg>
                  </div>
                  <div className="mt-3 max-h-48 divide-y divide-slate-100 overflow-y-auto">
                    {dashboard.locations.slice(0, 10).map((location, index) => (
                      <div key={`${location.country_code}-${location.city_name}-${index}`} className="flex items-center justify-between gap-3 py-2 text-xs">
                        <span className="min-w-0 truncate text-slate-700">
                          {[location.city_name, location.region_name, location.country_name].filter(Boolean).join(', ') || location.country_code || 'Unknown location'}
                        </span>
                        <span className="shrink-0 font-bold text-slate-900">{numberFormat.format(Number(location.visitors))} visitors</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Recent website activity</h2>
              {!dashboard?.recent.length ? (
                <p className="py-10 text-center text-sm text-slate-500">No website activity recorded for this period.</p>
              ) : (
                <div className="mt-4 max-h-[28rem] divide-y divide-slate-100 overflow-y-auto">
                  {dashboard.recent.map((item, index) => (
                    <div key={`${item.created_at}-${index}`} className="flex items-start justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800">
                          {item.event_type === 'page_view' ? 'Page viewed' : `${item.action_type === 'navigation' ? 'Navigation' : 'Button'} selected`}
                        </div>
                        <div className="mt-1 truncate font-mono text-xs text-slate-500">{item.page_path}</div>
                      </div>
                      <time className="shrink-0 text-right text-[10px] text-slate-400">{formatDateTime(item.created_at)}</time>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <p className="text-xs leading-5 text-slate-500">
            Visitor counts use a random first-party browser ID and are estimates, not verified individual identities. Approximate city/region is looked up locally from the request IP; raw IP addresses are discarded and never stored. Analytics data is retained for up to one year.
          </p>
        </>
      )}

      <section className="space-y-6 border-t border-slate-200 pt-6">
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Institution view</div>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">Institution statistics</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {liveOverview.map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{item.label}</span>
                <BarChart3 className="h-4 w-4 text-slate-400" />
              </div>
              <div className="mt-4 text-2xl font-black text-slate-900">{item.value}</div>
              <div className={`mt-2 inline-flex rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${item.tone}`}>{item.delta}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-900">Department performance</span>
              </div>
              <span className="text-[10px] font-bold text-slate-500">Updated today</span>
            </div>
            <div className="space-y-4">
              {liveDepartments.map((department) => (
                <div key={department.name}>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                    <span className="font-bold">{department.name}</span>
                    <span>{department.students} students</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-red-600 via-blue-600 to-emerald-500" style={{ width: `${department.completion}%` }} />
                  </div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Completion {department.completion}%</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-900">Operational health</span>
            </div>
            <div className="space-y-3">
              {liveAudit.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">{item.label}</div>
                    <div className="text-lg font-black text-slate-900">{item.value}</div>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700">{item.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900"><Users className="h-4 w-4 text-blue-600" /> <span className="text-xs font-black uppercase tracking-wider">Student growth</span></div>
            <div className="mt-4 text-3xl font-black text-slate-900">+742</div>
            <div className="mt-1 text-xs text-slate-500">Compared with last term</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900"><BookOpen className="h-4 w-4 text-violet-600" /> <span className="text-xs font-black uppercase tracking-wider">Course activity</span></div>
            <div className="mt-4 text-3xl font-black text-slate-900">1,468</div>
            <div className="mt-1 text-xs text-slate-500">Lessons and materials accessed</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900"><GraduationCap className="h-4 w-4 text-amber-600" /> <span className="text-xs font-black uppercase tracking-wider">Graduation outlook</span></div>
            <div className="mt-4 text-3xl font-black text-slate-900">82%</div>
            <div className="mt-1 text-xs text-slate-500">Intended completion rate</div>
          </div>
        </div>
      </section>
    </div>
  );
}
