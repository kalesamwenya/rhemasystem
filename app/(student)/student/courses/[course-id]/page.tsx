'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BookOpen, Check, FileText, ExternalLink, Calendar, ChevronRight, Clock, HelpCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { courseReadingUrl, isCourseReading, type CourseReading, type CourseReadingProgress } from '@/lib/course-readings';

export default function CourseModuleTerminalPage() {
  const params = useParams();
  const router = useRouter();
  const [activeSegment, setActiveSegment] = useState<'materials' | 'readings' | 'assignments' | 'quizzes' | 'exams'>('materials');
  const [courseContent, setCourseContent] = useState<{
    course: { id: string; name: string; description: string };
    assignments: Array<{ id: number; name: string; intro: string; duedate: number; grade: number; submission_type: string }>;
    quizzes: Array<{ id: number; name: string; intro: string; timeopen: number; timeclose: number; timelimit: number; grade: number; question_count: number; attempts: number }>;
    exams: Array<{ id: number; name: string; intro: string; timeopen: number; timeclose: number; timelimit: number; grade: number; question_count: number; attempts: number }>;
  } | null>(null);
  const [readings, setReadings] = useState<CourseReading[]>([]);
  const [readingProgress, setReadingProgress] = useState<Record<number, boolean>>({});
  const [readingLoading, setReadingLoading] = useState(true);
  const [readingSavingId, setReadingSavingId] = useState<number | null>(null);
  const [readingMessage, setReadingMessage] = useState('');
  const [courseMessage, setCourseMessage] = useState('');

  const courseCode = (params?.['course-id'] as string) || '';

  useEffect(() => {
    let cancelled = false;
    const loadCourse = async () => {
      setReadingLoading(true);
      setCourseMessage('');
      setReadingMessage('');
      try {
        const rawUser = window.localStorage.getItem('rhema_user');
        if (!rawUser) throw new Error('Sign in with a student account to view and track course readings.');
        let user: { role?: string };
        try {
          user = JSON.parse(rawUser) as { role?: string };
        } catch {
          throw new Error('Your saved sign-in session is invalid. Sign in again to access readings.');
        }
        if (user.role !== 'student') throw new Error('Sign in with a student account to view and track course readings.');
        const [contentResult, resourceResult, progressResult] = await Promise.allSettled([
          api.courses.content(courseCode) as Promise<{ success?: boolean; message?: string; data?: NonNullable<typeof courseContent> }>,
          api.library.studentResources(courseCode) as Promise<{ success?: boolean; message?: string; data?: CourseReading[] }>,
          api.library.readingProgress(courseCode) as Promise<{ success?: boolean; message?: string; data?: CourseReadingProgress[] }>,
        ]);
        if (cancelled) return;
        if (contentResult.status === 'fulfilled' && contentResult.value.success && contentResult.value.data) {
          setCourseContent(contentResult.value.data);
        } else {
          setCourseMessage(contentResult.status === 'rejected'
            ? contentResult.reason instanceof Error ? contentResult.reason.message : 'Unable to load course details.'
            : contentResult.value.message ?? 'Unable to load course details.');
        }

        if (resourceResult.status === 'fulfilled' && resourceResult.value.success && resourceResult.value.data) {
          setReadings(resourceResult.value.data.filter((reading) => isCourseReading(reading, courseCode)));
        } else {
          setReadingMessage(resourceResult.status === 'rejected'
            ? resourceResult.reason instanceof Error ? resourceResult.reason.message : 'Unable to load course readings.'
            : resourceResult.value.message ?? 'Unable to load course readings.');
        }

        if (progressResult.status === 'fulfilled' && progressResult.value.success && progressResult.value.data) {
          setReadingProgress(Object.fromEntries(progressResult.value.data.map((item) => [item.resource_id, item.completed])));
        } else if (resourceResult.status === 'fulfilled' && resourceResult.value.success) {
          setReadingMessage(progressResult.status === 'rejected'
            ? progressResult.reason instanceof Error ? progressResult.reason.message : 'Unable to load reading progress.'
            : progressResult.value.message ?? 'Unable to load reading progress.');
        }
      } catch (error) {
        if (!cancelled) setCourseMessage(error instanceof Error ? error.message : 'Unable to load course details.');
      } finally {
        if (!cancelled) setReadingLoading(false);
      }
    };
    void loadCourse();
    return () => { cancelled = true; };
  }, [courseCode]);

  const toggleReading = async (reading: CourseReading) => {
    const completed = !readingProgress[reading.id];
    setReadingSavingId(reading.id);
    setReadingMessage('');
    try {
      const response = await api.library.saveReadingProgress({
        course_id: courseCode,
        resource_id: reading.id,
        completed,
      }) as { success?: boolean; message?: string };
      if (!response.success) throw new Error(response.message ?? 'Unable to save reading progress.');
      setReadingProgress((current) => ({ ...current, [reading.id]: completed }));
    } catch (error) {
      setReadingMessage(error instanceof Error ? error.message : 'Unable to save reading progress.');
    } finally {
      setReadingSavingId(null);
    }
  };

  return (
    <main className="max-w-8xl mx-auto space-y-6 p-4 md:p-8">
      
      {/* Course Context Header Block Area */}
      <header className="bg-slate-950 text-white p-6 md:p-8 rounded-3xl relative overflow-hidden border border-slate-800 shadow-xl">
        <div className="absolute top-0 right-0 p-8 text-slate-800 font-mono text-7xl font-black select-none pointer-events-none tracking-tighter opacity-40">
          {courseContent?.course.id || courseCode}
        </div>
        
        <div className="relative z-10 space-y-3 max-w-2xl">
          <span className="bg-blue-900 text-amber-400 font-mono text-[10px] font-black tracking-widest px-2.5 py-1 rounded-md uppercase border border-blue-800">
            Active Core Syllabus Node
          </span>
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-wide leading-snug">
            {courseContent?.course.name || 'Loading course...'}
          </h1>
          {courseContent?.course.description && <p className="text-sm leading-6 text-slate-300">{courseContent.course.description}</p>}
          
          <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-4 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            <div>Course: <strong className="text-white font-bold">{courseContent?.course.id || courseCode}</strong></div>
            <div>Assigned resources: <strong className="text-amber-500 font-bold">{readings.length}</strong></div>
          </div>
        </div>
      </header>
      {courseMessage && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800">{courseMessage}</div>}
      {readingMessage && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">{readingMessage}</div>}

      {/* Dynamic Tabs Panel Control Row */}
      <nav className="flex flex-wrap border-b border-slate-200 gap-1" aria-label="Course subsections">
        {(['materials', 'readings', 'assignments', 'quizzes', 'exams'] as const).map((segment) => (
          <button
            key={segment}
            onClick={() => setActiveSegment(segment)}
            className={`px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
              activeSegment === segment
                ? 'border-slate-950 text-slate-950 bg-slate-50'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            {segment === 'readings' ? 'Readings' : segment}
          </button>
        ))}
      </nav>

      {/* MAIN VIEWPORT PORTAL DISPLAY CONTAINER */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm min-h-[300px]">
        
        {/* TAB 1: Course Materials */}
        {activeSegment === 'materials' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">Courseware Artifacts</h2>
              <span className="text-[10px] font-mono text-slate-400 font-bold">{readings.length} Published resources</span>
            </div>
            
            {readingLoading ? <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">Loading course resources...</div>
              : readings.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">No published course resources yet.</div>
              : <div className="divide-y divide-slate-100">
              {readings.map((file) => {
                const href = courseReadingUrl(file);
                return <div key={file.id} className="py-4 flex items-center justify-between gap-4 group hover:bg-slate-50/50 px-2 rounded-xl transition-all">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0 group-hover:bg-slate-950 group-hover:text-white transition-colors">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide truncate">{file.title}</h3>
                      <p className="text-[10px] font-mono text-slate-400 uppercase mt-0.5">{file.resource_type}{file.session_name ? ` — ${file.session_name}` : ''}</p>
                    </div>
                  </div>
                  {href && <a href={href} target="_blank" rel="noreferrer" aria-label={`Open ${file.title}`} className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-950 hover:text-white hover:border-slate-950 transition-all shrink-0"><ExternalLink className="h-3.5 w-3.5" /></a>}
                </div>;
              })}
            </div>}
          </div>
        )}

        {activeSegment === 'readings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div><h2 className="text-xs font-black uppercase tracking-wider text-slate-900">Assigned course readings</h2><p className="mt-1 text-xs text-slate-500">Open each reading and mark it complete to record your progress.</p></div>
              <span className="text-[10px] font-mono font-bold text-slate-500">{Object.values(readingProgress).filter(Boolean).length} / {readings.length} completed</span>
            </div>
            {readingMessage && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">{readingMessage}</div>}
            {readingLoading ? <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Loading readings...</div>
              : readings.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center"><BookOpen className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-2 text-sm font-bold text-slate-700">No published readings for this course yet.</p></div>
                : <div className="space-y-3">{readings.map((reading) => {
                  const href = courseReadingUrl(reading);
                  const completed = Boolean(readingProgress[reading.id]);
                  return <article key={reading.id} className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3"><div className={`rounded-lg p-2 ${completed ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-800'}`}>{completed ? <Check size={16} /> : <BookOpen size={16} />}</div><div className="min-w-0"><h3 className="text-sm font-bold text-slate-900">{reading.title}</h3><p className="mt-1 text-xs text-slate-500">{reading.session_name || 'Course reading'}{reading.owner ? ` · ${reading.owner}` : ''}</p>{reading.description && <p className="mt-2 text-xs leading-5 text-slate-600">{reading.description}</p>}</div></div>
                    <div className="flex shrink-0 gap-2">{href && <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"><ExternalLink size={13} /> Open</a>}<button type="button" onClick={() => void toggleReading(reading)} disabled={readingSavingId === reading.id} className={`rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50 ${completed ? 'border border-slate-200 text-slate-600' : 'bg-slate-900 text-white'}`}>{readingSavingId === reading.id ? 'Saving...' : completed ? 'Mark unread' : 'Mark complete'}</button></div>
                  </article>;
                })}</div>}
          </div>
        )}

        {/* TAB 2: Assignments Available Listing */}
        {activeSegment === 'assignments' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">Active Assignments</h2>
              <span className="text-[10px] font-mono text-slate-400 font-bold">{courseContent?.assignments.length ?? 0} Assignments</span>
            </div>
            
            {courseContent?.assignments.length ? <div className="space-y-3">
              {courseContent.assignments.map((asm) => (
                <div key={asm.id} className="border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-300 transition-all bg-white">
                  <div className="space-y-1">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">{asm.name}</h3>
                    {asm.intro && <p className="text-xs text-slate-600">{asm.intro.replace(/<[^>]*>/g, ' ')}</p>}
                    <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 uppercase">
                      <span className="text-blue-900 font-bold">Maximum: {asm.grade}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Due: {asm.duedate ? new Date(asm.duedate * 1000).toLocaleString() : 'No due date'}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => router.push(`/student/courses/${courseCode}/assignment?assessment_id=${asm.id}`)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all whitespace-nowrap shadow-sm"
                  >
                    Open Assignment <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div> : <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">{readingLoading ? 'Loading assignments...' : 'No assignments are available for this course.'}</p>}
          </div>
        )}

        {/* TAB 3: Quizzes Available Listing */}
        {activeSegment === 'quizzes' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">Continuous Assessments</h2>
              <span className="text-[10px] font-mono text-slate-400 font-bold">{courseContent?.quizzes.length ?? 0} Quizzes</span>
            </div>

            {courseContent?.quizzes.length ? <div className="space-y-3">
              {courseContent.quizzes.map((qz) => (
                <div key={qz.id} className="border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-300 transition-all bg-white">
                  <div className="space-y-1">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">{qz.name}</h3>
                    {qz.intro && <p className="text-xs text-slate-600">{qz.intro.replace(/<[^>]*>/g, ' ')}</p>}
                    <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 uppercase">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Runtime: {qz.timelimit ? `${qz.timelimit} mins` : 'No limit'}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><HelpCircle className="h-3 w-3" /> Questions: {qz.question_count}</span>
                      <span>•</span><span>Attempts: {qz.attempts}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => router.push(`/student/courses/${courseCode}/quiz?assessment_id=${qz.id}`)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all whitespace-nowrap shadow-sm"
                  >
                    Launch Quiz Interface <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div> : <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">{readingLoading ? 'Loading quizzes...' : 'No quizzes are available for this course.'}</p>}
          </div>
        )}

        {/* TAB 4: Exams Available Listing */}
        {activeSegment === 'exams' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">Terminal Examinations</h2>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Examinations published for this course.</p>
              </div>
              <span className="text-[10px] font-mono bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded font-bold uppercase">
                {courseContent?.exams.length ?? 0} Examinations
              </span>
            </div>

            {courseContent?.exams.length ? <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {courseContent.exams.map((exam) => (
                <article key={exam.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="space-y-2">
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">{exam.name}</h3>
                    {exam.intro && <p className="text-xs leading-5 text-slate-600">{exam.intro.replace(/<[^>]*>/g, ' ')}</p>}
                    <p className="text-[10px] font-mono uppercase text-slate-500">
                      {exam.question_count} questions · {exam.timelimit ? `${exam.timelimit} min` : 'No time limit'} · {exam.attempts} attempt(s)
                    </p>
                    <p className="text-[10px] font-mono text-slate-500">
                      Opens: {exam.timeopen ? new Date(exam.timeopen * 1000).toLocaleString() : 'Any time'} · Closes: {exam.timeclose ? new Date(exam.timeclose * 1000).toLocaleString() : 'No closing date'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push(`/student/courses/${courseCode}/quiz?assessment_id=${exam.id}`)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-white transition-all hover:bg-slate-800"
                  >
                    Open exam <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </article>
              ))}
            </div> : <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">{readingLoading ? 'Loading exams...' : 'No examinations are available for this course.'}</p>}
          </div>
        )}

      </section>
    </main>
  );
}