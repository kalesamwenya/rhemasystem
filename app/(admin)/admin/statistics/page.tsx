'use client';

import { useEffect, useState } from 'react';
import { Activity, BookOpen, GraduationCap, TrendingUp, Users } from 'lucide-react';
import { api } from '@/lib/api';

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

export default function StatisticsPage() {
  const [liveOverview, setLiveOverview] = useState(overview);
  const [liveDepartments, setLiveDepartments] = useState(departments);
  const [liveAudit, setLiveAudit] = useState(audit);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void Promise.all([
        api.students.adminRoster(),
        api.courses.schedules(),
        api.attendance.list(),
      ]).then((
        [studentsResponse, schedulesResponse, attendanceResponse]:
          [{ data?: StatisticsStudent[] }, { data?: { schedules: StatisticsCourse[] } }, { data?: StatisticsAttendance[] }],
      ) => {
        if (!active) return;
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
      }).catch((error) => {
        console.error('Unable to load institution statistics.', error);
      });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Institution view</div>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Institution statistics</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {liveOverview.map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{item.label}</span>
              <TrendingUp className="h-4 w-4 text-slate-400" />
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
    </div>
  );
}
