'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  ArrowLeft, Search, Plus, Calendar, FileText, CheckCircle2, 
  AlertCircle, Clock, ChevronRight, BarChart3, Filter, MoreVertical,
  ArrowUpRight, DownloadCloud, UserCheck
} from 'lucide-react';
import { api } from '@/lib/api';

type GradeItem = { id: string | number; courseid: string | number; itemtype?: string; itemmodule?: string; itemname?: string; grademax?: string | number; grademin?: string | number; hidden?: string | number; timemodified?: string | number };
type Grade = { itemid: string | number; userid: string | number; rawgrade?: string | number | null; finalgrade?: string | number | null };
type MoodleCourse = { id: string | number; shortname?: string; fullname?: string };
type Assessment = { id: string; dbId: string | number; title: string; type: string; dueDate: string; weight: string; status: string; submissionsCount: number; totalEnrolled: number; gradedCount: number; avgScore: string; courseId: string | number };

const formatDate = (value?: string | number) => value ? new Date(Number(value) > 1000000000 ? Number(value) * 1000 : value).toISOString().slice(0, 10) : 'Not scheduled';
const classification = (item: GradeItem) => item.itemmodule ? item.itemmodule.replace(/^./, (letter) => letter.toUpperCase()) : item.itemtype === 'manual' ? 'Manual Assessment' : 'Grade Item';

export default function CourseAssessmentsDashboard() {
  const params = useParams();
  const courseCode = typeof params?.code === 'string' ? params.code.toLowerCase() : '';
  const formalCode = courseCode.toUpperCase() || 'ICT-1010';

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentCourseId, setCurrentCourseId] = useState<string | number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [formFields, setFormFields] = useState({ title: '', type: 'assign', weight: '10' });

  const loadAssessments = async () => {
    setLoading(true);
    try {
      const [itemsResponse, gradesResponse, coursesResponse] = await Promise.all([
        api.grades.items(),
        api.grades.list(),
        api.moodle.courses(),
      ]) as [{ data?: GradeItem[] }, { data?: Grade[] }, { data?: MoodleCourse[] }];
      const course = (coursesResponse.data ?? []).find((item) => String(item.shortname ?? '').toLowerCase() === courseCode);
      setCurrentCourseId(course?.id ?? null);
      const courseItems = (itemsResponse.data ?? []).filter((item) => !course || String(item.courseid) === String(course.id));
      const grades = gradesResponse.data ?? [];
      setAssessments(courseItems.map((item) => {
        const itemGrades = grades.filter((grade) => String(grade.itemid) === String(item.id));
        const scored = itemGrades.filter((grade) => grade.finalgrade !== null && grade.finalgrade !== undefined && grade.finalgrade !== '');
        const average = scored.length ? scored.reduce((sum, grade) => sum + Number(grade.finalgrade), 0) / scored.length : 0;
        return {
          id: `ASM-${item.id}`,
          dbId: item.id,
          title: item.itemname || 'Untitled assessment',
          type: classification(item),
          dueDate: formatDate(item.timemodified),
          weight: `${Math.round((Number(item.grademax ?? 0) / Math.max(1, Number(item.grademax ?? 0))) * 100)}%`,
          status: Number(item.hidden) === 1 ? 'Closed' : 'Open',
          submissionsCount: itemGrades.length,
          totalEnrolled: itemGrades.length,
          gradedCount: scored.length,
          avgScore: scored.length ? `${Math.round(average / Math.max(1, Number(item.grademax ?? 100)) * 100)}%` : 'N/A',
          courseId: item.courseid,
        };
      }));
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load assessments from the database.');
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAssessments(); }, [courseCode]);

  const filteredAssessments = useMemo(() => assessments
    .filter((assessment) => filterType === 'All' || assessment.type === filterType)
    .filter((assessment) => `${assessment.title} ${assessment.id}`.toLowerCase().includes(searchQuery.toLowerCase())), [assessments, filterType, searchQuery]);

  // Compute operational aggregates
  const totalWeight = assessments.reduce((acc, curr) => acc + parseInt(curr.weight, 10), 0);
  const activePendingGrading = assessments.reduce((acc, curr) => acc + (curr.submissionsCount - curr.gradedCount), 0);

  const handleProvision = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const course = currentCourseId;
    if (!course || !formFields.title.trim()) return;
    setProvisioning(true);
    try {
      await api.grades.saveItem({ courseid: course, itemtype: 'manual', itemmodule: formFields.type, itemname: formFields.title.trim(), grademax: 100, grademin: 0, hidden: 0, timemodified: Math.floor(Date.now() / 1000) });
      setProvisionOpen(false);
      setFormFields({ title: '', type: 'assign', weight: '10' });
      await loadAssessments();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to provision assessment.');
    } finally {
      setProvisioning(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar { display: none !important; }
      `}} />

      <div className="space-y-6 animate-in fade-in duration-300">
        
        {/* Dynamic Contextual Path Header */}
        <div className="flex flex-col gap-3 pb-4 border-b border-slate-200/80 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Link 
              href={`/admin/courses/${courseCode}`} 
              className="inline-flex items-center justify-center p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-all active:scale-95 shadow-3xs"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <Link href="/admin/courses" className="hover:text-slate-600">Courses</Link>
                <span>/</span>
                <Link href={`/admin/courses/${courseCode}`} className="hover:text-slate-600">{formalCode}</Link>
                <span>/</span>
                <span className="text-slate-600">Assessments</span>
              </div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase sm:text-xl">
                Curriculum Assessment Matrix
              </h1>
            </div>
          </div>

          <button className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-950 hover:bg-slate-900 text-white font-black text-xs rounded-xl tracking-wide uppercase transition-colors self-start sm:self-auto shadow-sm">
            <Plus className="h-3.5 w-3.5" /> Provision Assessment
          </button>
        </div>

        {/* Aggregated Analytics Banner Strips */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-3.5 shadow-3xs">
            <div className="p-2.5 bg-blue-50 text-blue-600 border border-blue-100/50 rounded-xl">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Milestones</p>
              <p className="text-base font-black text-slate-900 tracking-tight">{assessments.length} Active Nodes</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-3.5 shadow-3xs">
            <div className="p-2.5 bg-amber-50 text-amber-600 border border-amber-100/50 rounded-xl">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Submissions Queue</p>
              <p className="text-base font-black text-slate-900 tracking-tight">{activePendingGrading} Tasks Pending</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-3.5 shadow-3xs">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100/50 rounded-xl">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syllabus Weight Allocated</p>
              <p className="text-base font-black text-slate-900 tracking-tight">{totalWeight}% / 100% Gross</p>
            </div>
          </div>
        </div>

        {/* Filters Matrix Toolbar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input 
              type="text"
              placeholder="Search assessment nodes by title or catalog ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 bg-slate-50/40 rounded-xl focus:outline-hidden focus:border-slate-400 focus:bg-white font-medium transition-all"
            />
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <Filter className="h-3.5 w-3.5 text-slate-400 hidden sm:inline" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-hidden focus:border-slate-400"
            >
              <option value="All">All Classifications</option>
              <option value="Practical Assignment">Practical Assignment</option>
              <option value="Laboratory Task">Laboratory Task</option>
              <option value="Written Essay">Written Essay</option>
            </select>
          </div>
        </div>

        {/* Master Assessments Grid Mapping */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          
          {/* Main Assessment List Track */}
          <div className="xl:col-span-2 space-y-4">
            {assessments
              .filter(asm => filterType === 'All' || asm.type === filterType)
              .filter(asm => asm.title.toLowerCase().includes(searchQuery.toLowerCase()) || asm.id.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((assignment) => {
                const submissionProgress = Math.round((assignment.submissionsCount / assignment.totalEnrolled) * 100);
                const isClosed = assignment.status === 'Closed';

                return (
                  <div 
                    key={assignment.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition-all shadow-3xs space-y-4 group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-[10px] text-slate-400 tracking-wider">
                            {assignment.id}
                          </span>
                          <span className="h-1 w-1 bg-slate-300 rounded-full" />
                          <span className="text-[10px] font-black uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md tracking-wide">
                            {assignment.type}
                          </span>
                          <span className="h-1 w-1 bg-slate-300 rounded-full" />
                          <span className="font-mono text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                            Weight: {assignment.weight}
                          </span>
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                          {assignment.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isClosed 
                            ? 'bg-slate-50 text-slate-500 border border-slate-200' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          {assignment.status}
                        </span>
                        <button className="p-1.5 rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-all">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Metrics Ledger */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 bg-slate-50/60 rounded-xl border border-slate-100/80">
                      <div>
                        <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Due Window Date</span>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 mt-0.5">
                          <Calendar className="h-3 w-3 text-slate-400" /> {assignment.dueDate}
                        </span>
                      </div>

                      <div>
                        <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Submissions</span>
                        <span className="text-xs font-mono font-black text-slate-800 block mt-0.5">
                          {assignment.submissionsCount} / {assignment.totalEnrolled} <span className="text-[10px] text-slate-400 font-medium">({submissionProgress}%)</span>
                        </span>
                      </div>

                      <div>
                        <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Grading Audit</span>
                        <span className={`text-xs font-mono font-black block mt-0.5 ${assignment.gradedCount === assignment.submissionsCount ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {assignment.gradedCount} Evaluated
                        </span>
                      </div>

                      <div>
                        <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Cohort Mean Score</span>
                        <span className="text-xs font-mono font-black text-slate-800 block mt-0.5">
                          {assignment.avgScore}
                        </span>
                      </div>
                    </div>

                    {/* Dynamic Pipeline Links */}
                    <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                      <div className="w-full sm:w-1/2 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${isClosed ? 'bg-slate-400' : 'bg-blue-600'}`}
                          style={{ width: `${submissionProgress}%` }}
                        />
                      </div>

                      <div className="flex items-center gap-3 ml-auto">
                        <button className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-900 transition-colors">
                          <DownloadCloud className="h-3.5 w-3.5" /> Archival Bulk Export
                        </button>
                        <Link 
                          href={`/admin/courses/${courseCode}/assignments/${assignment.id.toLowerCase()}`}
                          className="inline-flex items-center gap-1 text-[11px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-wider transition-colors"
                        >
                          Grade Pipeline <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>

                  </div>
                );
              })}
          </div>

          {/* Right Sidebar: Context Rules & Grade Threshold Frameworks */}
          <div className="space-y-6">
            
            {/* Context Notice Board */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs space-y-3.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-blue-600" /> Administrative Notice
              </h4>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                Assessments compiled here push dynamic score data layers straight to student profiles and billing accounts automatically once marked.
              </p>
              <div className="text-[10px] font-bold text-amber-700 bg-amber-50/50 border border-amber-100 p-2.5 rounded-xl flex items-start gap-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>Ensure weight constants map exactly to a total of 100% to protect end-of-term grading engine passes.</span>
              </div>
            </div>

            {/* Quick Template Library */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Valued Matrix Links</h4>
              <div className="flex flex-col gap-1.5">
                {[
                  { name: 'Continuous Assessment Rubrics', path: `/admin/courses/${courseCode}/materials` },
                  { name: 'Grade Exception Log Book', path: '/admin/grades/logs' },
                  { name: 'External Moderator Signoff', path: '/admin/audit/moderation' },
                ].map((link, index) => (
                  <Link 
                    key={index} 
                    href={link.path}
                    className="flex items-center justify-between p-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-950 hover:bg-slate-50 transition-all group/link"
                  >
                    <span>{link.name}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 group-hover/link:text-slate-500 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </>
  );
}