'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { api } from '@/lib/api';

type RosterRecord = { student_id: string; name: string; email: string | null; class: string; account_status: string; course_id: string; course_name: string; enrolled_at: string | null };

export default function LecturerClassRostersPage() {
  const [records, setRecords] = useState<RosterRecord[]>([]);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    (api.courses.lecturerRoster() as Promise<{ data?: RosterRecord[] }>)
      .then((response) => { if (active) setRecords(response.data ?? []); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Unable to load class rosters.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const courses = useMemo(() => Array.from(new Map(records.map((record) => [record.course_id, record.course_name])).entries()), [records]);
  const filtered = records.filter((student) =>
    (courseFilter === 'all' || student.course_id === courseFilter)
    && `${student.name} ${student.student_id} ${student.email ?? ''}`.toLowerCase().includes(search.trim().toLowerCase())
  );
  return (
    <div className="space-y-5">
      <header className="border-b border-slate-100 pb-5"><p className="text-[10px] font-black uppercase tracking-widest text-blue-900">Assigned course rosters</p><h1 className="mt-1 text-xl font-black text-slate-900">My students</h1><p className="mt-1 text-xs text-slate-500">Student records are limited to your assigned courses.</p></header>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row">
        <label className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student name, ID, or email" className="w-full rounded-xl bg-slate-50 py-2.5 pl-10 pr-3 text-xs outline-none focus:ring-2 focus:ring-blue-900/20" /></label>
        <select value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700"><option value="all">All assigned courses</option>{courses.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Student</th><th className="px-5 py-3">Student ID</th><th className="px-5 py-3">Class</th><th className="px-5 py-3">Course</th><th className="px-5 py-3">Status</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{filtered.map((student) => <tr key={`${student.course_id}-${student.student_id}`}><td className="px-5 py-3"><p className="font-bold text-slate-900">{student.name}</p><p className="text-xs text-slate-500">{student.email || 'No email recorded'}</p></td><td className="px-5 py-3 font-mono text-xs">{student.student_id}</td><td className="px-5 py-3 text-xs">{student.class}</td><td className="px-5 py-3 text-xs font-semibold">{student.course_name}</td><td className="px-5 py-3"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800">{student.account_status || 'Active'}</span></td></tr>)}</tbody>
        </table></div>
        {!filtered.length && <p className="p-8 text-center text-sm text-slate-500"><Users className="mx-auto mb-2 h-5 w-5" />{loading ? 'Loading enrolled students...' : records.length ? 'No students match your search.' : 'No students are enrolled in your assigned courses.'}</p>}
      </div>
    </div>
  );
}
