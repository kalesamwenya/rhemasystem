'use client';

import { AlertTriangle, BarChart3, CheckCircle2, Compass, Gauge, Target } from 'lucide-react';

const insights = [
  { title: 'High-risk sections', value: '7', message: 'Need early intervention in first-year cohorts.', tone: 'text-rose-700 bg-rose-50' },
  { title: 'Top performing cohort', value: 'ICT-202', message: 'Highest completion and exam consistency.', tone: 'text-emerald-700 bg-emerald-50' },
  { title: 'Operational bottleneck', value: 'Admissions', message: 'Processing delays increased by 18%.', tone: 'text-amber-700 bg-amber-50' },
];

const recommendations = [
  'Increase faculty outreach for final-year projects and mentorship.',
  'Schedule an audit on late fee processing and reconciliation.',
  'Publish a targeted retention drive for first-semester students.',
  'Automate reminders for assessment submissions and resource access.',
];

export default function AnalysisPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Decision support</div>
        <h1 className="mt-1 text-2xl font-black uppercase tracking-tight text-slate-900">Analysis</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {insights.map((item) => (
          <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${item.tone}`}>{item.title}</div>
            <div className="mt-4 text-3xl font-black text-slate-900">{item.value}</div>
            <p className="mt-2 text-sm text-slate-600">{item.message}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Gauge className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-900">Operational analysis</span>
          </div>

          <div className="space-y-4">
            {[
              { label: 'Enrollment conversion', status: 'Strong', percent: 82 },
              { label: 'Course utilisation', status: 'Stable', percent: 74 },
              { label: 'Support response time', status: 'Improving', percent: 68 },
              { label: 'Assessment readiness', status: 'Needs action', percent: 56 },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                  <span className="font-bold">{item.label}</span>
                  <span>{item.status}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500" style={{ width: `${item.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Target className="h-4 w-4 text-violet-600" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-900">Recommended actions</span>
          </div>
          <div className="space-y-3">
            {recommendations.map((item, i) => (
              <div key={item} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[9px] font-black text-white">{i + 1}</div>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-900">Positive signals</span>
          </div>
          <ul className="space-y-2 text-sm text-slate-700">
            <li>• Attendance is above target in 4 of 6 departments.</li>
            <li>• Fee collection improved following automated reminders.</li>
            <li>• Faculty engagement in course review is trending upward.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-900">Watchlist</span>
          </div>
          <ul className="space-y-2 text-sm text-slate-700">
            <li>• Some support queues are still delayed during peak periods.</li>
            <li>• Assessment completion levels are inconsistent across two faculties.</li>
            <li>• Conversion from applicants to registered students needs review.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
