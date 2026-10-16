'use client';

import React, { useState } from 'react';
import { 
  Users, ShieldAlert, Activity, Calendar, DollarSign, 
  CheckCircle, AlertCircle, ArrowUpRight, ArrowDownRight, 
  TrendingUp, Layers, RefreshCw, GraduationCap, Percent, Award, Medal
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar
} from 'recharts';

// --- MOCK DATA ---
const financialPerformanceData = [
  { month: 'Jan', revenue: 180000, registrations: 920 },
  { month: 'Feb', revenue: 220000, registrations: 1100 },
  { month: 'Mar', revenue: 210000, registrations: 1050 },
  { month: 'Apr', revenue: 290000, registrations: 1340 },
  { month: 'May', revenue: 342850, registrations: 1482 },
];

const premiumDistributionData = [
  { name: 'Undergrad Programs', value: 185000, color: '#2563eb' },
  { name: 'Postgrad Seminars', value: 98000, color: '#0d9488' },
  { name: 'Professional Certs', value: 59850, color: '#f59e0b' },
];

const studentPerformanceData = [
  { month: 'Jan', gpa: 3.1, attendance: 88, completion: 82 },
  { month: 'Feb', gpa: 3.2, attendance: 90, completion: 84 },
  { month: 'Mar', gpa: 3.4, attendance: 92, completion: 86 },
  { month: 'Apr', gpa: 3.5, attendance: 93, completion: 91 },
  { month: 'May', gpa: 3.7, attendance: 95, completion: 94 },
];

const departmentPerformance = [
  { department: 'Engineering', score: 92 },
  { department: 'Business', score: 88 },
  { department: 'ICT', score: 96 },
  { department: 'Education', score: 81 },
  { department: 'Health Sci', score: 86 },
];

const topStudents = [
  { rank: 1, name: 'Bwalya Chanda', id: 'ST-2026-044', department: 'ICT', gpa: '3.98', status: 'Dean\'s List', reward: 'Full Merit Award' },
  { rank: 2, name: 'Kunda Musonda', id: 'ST-2026-112', department: 'Engineering', gpa: '3.92', status: 'Dean\'s List', reward: 'Research Grant' },
  { rank: 3, name: 'Mapalo Phiri', id: 'ST-2026-095', department: 'Health Sci', gpa: '3.89', status: 'Dean\'s List', reward: 'Clinical Honors' },
  { rank: 4, name: 'Nalavwe Soko', id: 'ST-2026-201', department: 'Business', gpa: '3.85', status: 'Honors Track', reward: 'Corporate Placement' },
];

const operationalStatsCards = [
  { title: 'Active Registrations', value: '1,482', change: '+12.3%', isPositive: true, subtitle: 'vs previous month', icon: Users, color: 'text-blue-600 bg-blue-50 border-blue-100/70' },
  { title: 'Gross Premium Volume', value: 'K342,850', change: '+8.1%', isPositive: true, subtitle: 'Current term collections', icon: DollarSign, color: 'text-emerald-600 bg-emerald-50 border-emerald-100/70' },
  { title: 'Course Engagement Rate', value: '94.2%', change: '-1.4%', isPositive: false, subtitle: 'System-wide activity log', icon: Activity, color: 'text-amber-600 bg-amber-50 border-amber-100/70' },
  { title: 'Bursar Clearances Pending', value: '28', change: 'Requires Action', isPositive: false, subtitle: 'Flagged transaction ledgers', icon: ShieldAlert, color: 'text-red-600 bg-red-50 border-red-100/70' },
];

const academicStatsCards = [
  { title: 'Average GPA', value: '3.7', change: '+0.4', isPositive: true, subtitle: 'Term over term shift', icon: GraduationCap, color: 'text-indigo-600 bg-indigo-50 border-indigo-100/70' },
  { title: 'Attendance Rate', value: '95%', change: '+3.2%', isPositive: true, subtitle: 'Consistent daily tracking', icon: Percent, color: 'text-teal-600 bg-teal-50 border-teal-100/70' },
  { title: 'Course Completion', value: '94%', change: '+5.1%', isPositive: true, subtitle: 'Final evaluation clears', icon: Award, color: 'text-purple-600 bg-purple-50 border-purple-100/70' },
  { title: 'Academic Risk Cases', value: '14', change: '-2 Cases', isPositive: true, subtitle: 'SST support pipelines', icon: AlertCircle, color: 'text-rose-600 bg-rose-50 border-rose-100/70' },
];

const pendingApprovals = [
  { id: 'TX-9082', student: 'Chileshe Mulenga', item: 'Bursar Ledger Clearance', amount: 'K4,250', status: 'Pending Review', date: 'Today, 10:14 AM' },
  { id: 'TX-9081', student: 'Mwansa Mwape', item: 'Engineering Enrollment', amount: 'K8,500', status: 'Under Verification', date: 'Today, 08:45 AM' },
  { id: 'TX-9079', student: 'Taonga Nyirenda', item: 'Resource Access Permit', amount: 'K650', status: 'Pending Review', date: 'Yesterday' },
];

export default function TabbedDashboard() {
  const [activeTab, setActiveTab] = useState<'operational' | 'academic'>('operational');
  const [chartMetric, setChartMetric] = useState<'revenue' | 'registrations'>('revenue');

  const hideScrollbarStyle: React.CSSProperties = {
    msOverflowStyle: 'none',  
    scrollbarWidth: 'none',   
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none !important;
        }
      `}} />

      <div 
        className="h-[calc(100vh-theme(spacing.16))] overflow-y-auto no-scrollbar space-y-6 pr-1 pb-12 animate-in fade-in duration-300"
        style={hideScrollbarStyle}
      >
        
        {/* Editorial Welcome Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase sm:text-2xl">System Control Panel</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">Cross-sectional analytics and institutional telemetry streams.</p>
          </div>
          <div className="flex items-center gap-2 border-b border-[#cbd6d0] bg-transparent px-1 py-2 shrink-0 self-start sm:self-center">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-700 tracking-wide">May 2026 Term</span>
          </div>
        </div>

        {/* Modern Minimalist Tab Switcher */}
        <div className="flex max-w-md border-b border-[#cbd6d0] p-0.5">
          <button
            onClick={() => setActiveTab('operational')}
            className={`flex-1 py-2 text-center text-xs font-black tracking-wider uppercase rounded-lg transition-all ${
              activeTab === 'operational'
                ? 'bg-[#173b3a] text-white'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Operational Analytics
          </button>
          <button
            onClick={() => setActiveTab('academic')}
            className={`flex-1 py-2 text-center text-xs font-black tracking-wider uppercase rounded-lg transition-all ${
              activeTab === 'academic'
                ? 'bg-[#173b3a] text-white'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Academic Performance
          </button>
        </div>

        {/* VIEW CONDITIONAL RENDERING */}
        {activeTab === 'operational' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Operational Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {operationalStatsCards.map((card, i) => {
                const Icon = card.icon;
                return (
                  <div key={i} className="admin-paper flex flex-col justify-between p-5 transition-colors duration-200 hover:border-[#9ab2a6] group">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate">{card.title}</span>
                      <div className={`h-8 w-8 rounded-xl border flex items-center justify-center shrink-0 ${card.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    
                    <div className="mt-4 flex items-baseline gap-2.5">
                      <span className="text-2xl font-black text-slate-900 tracking-tight">{card.value}</span>
                      <span className={`inline-flex items-center gap-0.5 text-[10px] font-black tracking-wide px-1.5 py-0.5 rounded-md ${
                        card.isPositive 
                          ? 'text-emerald-700 bg-emerald-50' 
                          : typeof card.change === 'string' && card.change.includes('Action')
                            ? 'text-red-700 bg-red-50 animate-pulse'
                            : 'text-amber-700 bg-amber-50'
                      }`}>
                        {card.isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {card.change}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">{card.subtitle}</p>
                  </div>
                );
              })}
            </div>

            {/* Analytics Graphs */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="admin-paper flex flex-col p-5 lg:col-span-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 mb-5">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-slate-400" />
                    <h2 className="text-xs font-black text-slate-900 tracking-wider uppercase">System Intake Velocity</h2>
                  </div>
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg self-start sm:self-center">
                    <button 
                      onClick={() => setChartMetric('revenue')}
                      className={`px-2.5 py-1 text-[10px] font-black tracking-wide rounded-md transition-all ${
                        chartMetric === 'revenue' ? 'bg-[#173b3a] text-white' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Volume (ZMW)
                    </button>
                    <button 
                      onClick={() => setChartMetric('registrations')}
                      className={`px-2.5 py-1 text-[10px] font-black tracking-wide rounded-md transition-all ${
                        chartMetric === 'registrations' ? 'bg-[#173b3a] text-white' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Registrations
                    </button>
                  </div>
                </div>

                <div className="h-64 w-full text-[11px] font-mono">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={financialPerformanceData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={chartMetric === 'revenue' ? '#10b981' : '#2563eb'} stopOpacity={0.15}/>
                          <stop offset="95%" stopColor={chartMetric === 'revenue' ? '#10b981' : '#2563eb'} stopOpacity={0.01}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} axisLine={false} dy={8} />
                      <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(val) => chartMetric === 'revenue' ? `K${val / 1000}k` : val} />
                      <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }} formatter={(value: unknown) => [chartMetric === 'revenue' && typeof value === 'number' ? `K${value.toLocaleString()}` : String(value), chartMetric === 'revenue' ? 'Premium Volume' : 'Accounts Added']} />
                      <Area type="monotone" dataKey={chartMetric} stroke={chartMetric === 'revenue' ? '#10b981' : '#2563eb'} strokeWidth={2.5} fillOpacity={1} fill="url(#colorMetric)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Allocation Mix */}
              <div className="admin-paper flex flex-col justify-between p-5">
                <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-2">
                  <Layers className="h-4 w-4 text-slate-400" />
                  <h2 className="text-xs font-black text-slate-900 tracking-wider uppercase">Allocation Mix</h2>
                </div>
                <div className="h-44 w-full relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={premiumDistributionData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                        {premiumDistributionData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(value: unknown) => [`K${typeof value === 'number' ? value.toLocaleString() : String(value)}`, 'Share Value']} contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute text-center flex flex-col justify-center pointer-events-none">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Segmented</span>
                    <span className="text-base font-black text-slate-900 tracking-tight mt-0.5">K342.8k</span>
                  </div>
                </div>
                <div className="space-y-1.5 pt-2 border-t border-slate-50">
                  {premiumDistributionData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-600 truncate max-w-[140px]">{item.name}</span>
                      </div>
                      <span className="text-slate-900 font-bold tracking-mono text-[11px]">{((item.value / 342850) * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Critical Ledger Stream Table */}
            <div className="admin-paper flex flex-col overflow-hidden">
              <div className="flex items-center justify-between gap-4 border-b border-[#dce3de] bg-[#f6f7f4] p-5">
                <div className="flex items-center gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-blue-600" />
                  <h2 className="text-xs font-black text-slate-900 tracking-wider uppercase">Critical Verification Stream</h2>
                </div>
                <button className="flex items-center gap-1.5 text-[10px] font-black tracking-wider uppercase text-blue-600 hover:text-blue-800 transition-colors">
                  <RefreshCw className="h-3 w-3" /> Refresh Streams
                </button>
              </div>
              <div className="divide-y divide-slate-100 overflow-x-auto no-scrollbar" style={hideScrollbarStyle}>
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-50/30 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                      <th className="py-3 px-5">ID Ref</th>
                      <th className="py-3 px-4">Operator/Account</th>
                      <th className="py-3 px-4">Action Item</th>
                      <th className="py-3 px-4 text-right">Volume</th>
                      <th className="py-3 px-5 text-right">Operations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-600">
                    {pendingApprovals.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-5 font-bold text-slate-900 tracking-mono">{row.id}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">{row.student}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span>{row.item}</span>
                            <span className="text-[9px] text-slate-400 mt-0.5">{row.date}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900">{row.amount}</td>
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors border border-transparent hover:border-emerald-200/60" title="Approve Entry">
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-200/60" title="Flag/Reject">
                              <AlertCircle className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Academic Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {academicStatsCards.map((card, i) => {
                const Icon = card.icon;
                return (
                  <div key={i} className="admin-paper flex flex-col justify-between p-5 transition-colors duration-200 hover:border-[#9ab2a6] group">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate">{card.title}</span>
                      <div className={`h-8 w-8 rounded-xl border flex items-center justify-center shrink-0 ${card.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2.5">
                      <span className="text-2xl font-black text-slate-900 tracking-tight">{card.value}</span>
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-black tracking-wide px-1.5 py-0.5 rounded-md text-emerald-700 bg-emerald-50">
                        <ArrowUpRight className="h-3 w-3" />
                        {card.change}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">{card.subtitle}</p>
                  </div>
                );
              })}
            </div>

            {/* Academic Progress Matrix Graphs */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Line Progression */}
              <div className="admin-paper p-5 lg:col-span-2">
                <div className="flex items-center gap-2 mb-5 border-b border-slate-100 pb-4">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Academic Progression Trend</h3>
                </div>
                <div className="h-72 text-[11px] font-mono">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={studentPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} stroke="#94a3b8" />
                      <YAxis tickLine={false} axisLine={false} stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                      <Line type="monotone" dataKey="gpa" name="Average GPA" stroke="#2563eb" strokeWidth={3} />
                      <Line type="monotone" dataKey="attendance" name="Attendance %" stroke="#10b981" strokeWidth={3} />
                      <Line type="monotone" dataKey="completion" name="Completion %" stroke="#f59e0b" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Department Rankings Bar Chart */}
              <div className="admin-paper p-5">
                <div className="flex items-center gap-2 mb-5 border-b border-slate-100 pb-4">
                  <Layers className="h-4 w-4 text-violet-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Department Rankings</h3>
                </div>
                <div className="h-72 text-[11px] font-mono">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentPerformance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="department" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                      <Bar dataKey="score" name="Performance Score" radius={[8, 8, 0, 0]} fill="#7c3aed" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Best Performing Students Table Section */}
            <div className="admin-paper flex flex-col overflow-hidden">
              <div className="flex items-center justify-between gap-4 border-b border-[#dce3de] bg-[#f6f7f4] p-5">
                <div className="flex items-center gap-2.5">
                  <Medal className="h-4 w-4 text-amber-500" />
                  <h2 className="text-xs font-black text-slate-900 tracking-wider uppercase">Top Performing Scholars</h2>
                </div>
                <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 bg-slate-200/50 px-2.5 py-1 rounded-md">
                  Dean&apos;s Honor Roll
                </span>
              </div>
              <div className="divide-y divide-slate-100 overflow-x-auto no-scrollbar" style={hideScrollbarStyle}>
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-50/30 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                      <th className="py-3 px-5 w-16">Rank</th>
                      <th className="py-3 px-4">Student Name / ID</th>
                      <th className="py-3 px-4">Faculty/Department</th>
                      <th className="py-3 px-4 text-center">Cumulative GPA</th>
                      <th className="py-3 px-5 text-right">Academic Status / Reward</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-600">
                    {topStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-5">
                          <span className={`h-6 w-6 rounded-lg flex items-center justify-center text-[11px] font-black tracking-mono border ${
                            student.rank === 1 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            student.rank === 2 ? 'bg-slate-50 text-slate-700 border-slate-200' :
                            'bg-orange-50 text-orange-700 border-orange-100'
                          }`}>
                            0{student.rank}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{student.name}</span>
                            <span className="text-[10px] font-mono text-slate-400 mt-0.5">{student.id}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-600">{student.department}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                            {student.gpa}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black uppercase tracking-wide text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-sm">
                              {student.status}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium mt-1">{student.reward}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}