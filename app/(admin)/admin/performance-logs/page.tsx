'use client';

import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock3, Search } from 'lucide-react';

type LogStatus = 'Healthy' | 'Warning' | 'Critical';

type LogEntry = {
  id: string;
  module: string;
  event: string;
  user: string;
  time: string;
  status: LogStatus;
};

const initialLogs: LogEntry[] = [
  { id: 'PL-101', module: 'Admissions', event: 'Bulk applicant export completed', user: 'M. Kasonde', time: '09:42 AM', status: 'Healthy' },
  { id: 'PL-102', module: 'Payments', event: 'Late fee sync delayed by 8 minutes', user: 'A. Chileshe', time: '10:18 AM', status: 'Warning' },
  { id: 'PL-103', module: 'Assessment', event: 'Exam submission backlog detected', user: 'J. Simukoko', time: '11:03 AM', status: 'Critical' },
  { id: 'PL-104', module: 'Communications', event: 'WhatsApp campaign delivered successfully', user: 'N. Banda', time: '12:10 PM', status: 'Healthy' },
  { id: 'PL-105', module: 'Library', event: 'Resource access spike for course packs', user: 'T. Nawa', time: '01:07 PM', status: 'Healthy' },
];

export default function PerformanceLogsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | LogStatus>('All');

  const filteredLogs = useMemo(() => {
    return initialLogs.filter((entry) => {
      const matchesStatus = statusFilter === 'All' || entry.status === statusFilter;
      const matchesSearch = `${entry.module} ${entry.event} ${entry.user}`.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [search, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">System monitoring</div>
          <h1 className="mt-1 text-2xl font-black uppercase tracking-tight text-slate-900">Performance Logs</h1>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm">
          <Clock3 className="h-4 w-4 text-slate-400" /> Last sync: 2 mins ago
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:w-[360px]">
            <Search className="h-4 w-4 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full border-0 bg-transparent text-sm outline-none" placeholder="Search module or event" />
          </div>

          <div className="flex gap-2">
            {(['All', 'Healthy', 'Warning', 'Critical'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${statusFilter === status ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Healthy', value: initialLogs.filter((log) => log.status === 'Healthy').length, tone: 'text-emerald-700 bg-emerald-50' },
          { label: 'Warnings', value: initialLogs.filter((log) => log.status === 'Warning').length, tone: 'text-amber-700 bg-amber-50' },
          { label: 'Critical', value: initialLogs.filter((log) => log.status === 'Critical').length, tone: 'text-rose-700 bg-rose-50' },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${card.tone}`}>{card.label}</div>
            <div className="mt-4 text-2xl font-black text-slate-900">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {filteredLogs.map((entry) => (
          <div key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{entry.id}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-600">{entry.module}</span>
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-900">{entry.event}</div>
                  <div className="mt-1 text-xs text-slate-500">Triggered by {entry.user} • {entry.time}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${entry.status === 'Healthy' ? 'bg-emerald-50 text-emerald-700' : entry.status === 'Warning' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                  {entry.status}
                </span>
                {entry.status === 'Critical' ? <AlertTriangle className="h-4 w-4 text-rose-600" /> : entry.status === 'Warning' ? <Clock3 className="h-4 w-4 text-amber-600" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
