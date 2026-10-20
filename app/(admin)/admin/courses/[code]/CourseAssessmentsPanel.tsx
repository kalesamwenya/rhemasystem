'use client';

import { confirmWithApp } from '@/components/ui/app-dialogs';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlertCircle, ArrowDownWideNarrow, ClipboardList, Clock3, FileCheck2, HelpCircle, Pencil, Plus, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import { deleteCourseAssessment, requestAssessmentQuestions, requestCourseContent, saveCourseAssessment, type AssessmentDraft, type AssessmentQuestionDraft, type CourseAssessmentKind, type CourseAssignment, type CourseContent, type CourseQuiz, type GradingCriterion } from '@/lib/course-content';
import { api } from '@/lib/api';

type AssessmentTab = 'quizzes' | 'assignments' | 'exams';

const emptyContent: CourseContent = {
  course: { id: '', name: '', description: '' },
  quizzes: [],
  exams: [],
  assignments: [],
};

const blankQuestion = (points = 100): AssessmentQuestionDraft => ({
  question: '',
  options: { A: '', B: '', C: '', D: '' },
  correct_option: 'A',
  explanation: '',
  points,
});

const newDraft = (kind: AssessmentTab): AssessmentDraft => ({
  name: '',
  intro: '',
  grade: 100,
  timeopen: '',
  timeclose: '',
  timelimit: 30,
  attempts: 1,
  question_count: 0,
  allowsubmissionsfromdate: '',
  duedate: '',
  submission_type: 'file',
  questions: kind === 'assignments' ? [] : [blankQuestion()],
  rubric: kind === 'assignments' ? [{ name: '', description: '', points: 100 }] : [],
});

const inputClass = 'mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white';

function formatDate(timestamp: number): string {
  if (!timestamp) return 'Not scheduled';
  return new Date(timestamp * 1000).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function dateInput(timestamp: number): string {
  if (!timestamp) return '';
  const localDate = new Date(timestamp * 1000 - new Date(timestamp * 1000).getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function kindFor(tab: AssessmentTab): CourseAssessmentKind {
  return tab === 'assignments' ? 'assignment' : tab === 'exams' ? 'exam' : 'quiz';
}

function draftFromQuiz(quiz: CourseQuiz): AssessmentDraft {
  return {
    id: quiz.id,
    name: quiz.name,
    intro: quiz.intro,
    grade: quiz.grade,
    timeopen: dateInput(quiz.timeopen),
    timeclose: dateInput(quiz.timeclose),
    timelimit: quiz.timelimit,
    attempts: quiz.attempts,
    question_count: quiz.question_count,
    allowsubmissionsfromdate: '',
    duedate: '',
    submission_type: 'file',
    questions: [],
    rubric: [],
  };
}

function draftFromAssignment(assignment: CourseAssignment): AssessmentDraft {
  return {
    id: assignment.id,
    name: assignment.name,
    intro: assignment.intro,
    grade: assignment.grade,
    timeopen: '',
    timeclose: '',
    timelimit: 0,
    attempts: 1,
    question_count: 0,
    allowsubmissionsfromdate: dateInput(assignment.allowsubmissionsfromdate),
    duedate: dateInput(assignment.duedate),
    submission_type: assignment.submission_type === 'online' ? 'online' : 'file',
    questions: [],
    rubric: assignment.grading_rubric?.length ? assignment.grading_rubric : [{ name: '', description: '', points: assignment.grade }],
  };
}

function EmptyState({ label, onAdd }: { label: string; onAdd: () => void }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><ClipboardList className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-700">No {label.toLowerCase()} are linked to this course.</p><p className="mt-1 text-xs text-slate-500">Add one here to save it to the course database.</p><button type="button" onClick={onAdd} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white"><Plus size={14} /> Add {label.slice(0, -1)}</button></div>;
}

function QuizCards({ courseId, kind, items, onEdit, onDelete }: { courseId: string; kind: 'quiz' | 'exam'; items: CourseQuiz[]; onEdit: (quiz: CourseQuiz) => void; onDelete: (quiz: CourseQuiz) => void }) {
  if (!items.length) return null;
  return <div className="space-y-3">{items.map((quiz) => <article key={quiz.id} className="rounded-2xl border border-slate-200 bg-white p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex min-w-0 items-start gap-3"><div className="rounded-xl bg-violet-50 p-2.5 text-violet-700"><HelpCircle size={18} /></div><div className="min-w-0"><h3 className="font-bold text-slate-900">{quiz.name}</h3><p className="mt-1 text-xs text-slate-500">{quiz.idnumber}</p></div></div><span className="w-fit rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700">{quiz.question_count} questions</span></div>
    {quiz.intro && <p className="mt-4 text-sm leading-6 text-slate-600">{quiz.intro}</p>}
    <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-xs sm:grid-cols-3"><div className="flex items-center gap-2 text-slate-600"><Clock3 size={14} /> {quiz.timelimit ? `${quiz.timelimit} minutes` : 'No time limit'}</div><div className="text-slate-600">Opens: <strong>{formatDate(quiz.timeopen)}</strong></div><div className="text-slate-600">Closes: <strong>{formatDate(quiz.timeclose)}</strong></div></div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">Grade: {quiz.grade} · Attempts: {quiz.attempts}</p><div className="flex gap-2"><ActivityAccessButton courseId={courseId} activityId={quiz.id} activityType={kind} /><button type="button" onClick={() => onEdit(quiz)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"><Pencil size={13} /> Edit</button><button type="button" onClick={() => onDelete(quiz)} aria-label={`Delete ${quiz.name}`} className="rounded-lg border border-red-100 p-2 text-red-600"><Trash2 size={14} /></button></div></div>
  </article>)}</div>;
}

function AssignmentCards({ courseId, items, onEdit, onDelete }: { courseId: string; items: CourseAssignment[]; onEdit: (assignment: CourseAssignment) => void; onDelete: (assignment: CourseAssignment) => void }) {
  if (!items.length) return null;
  return <div className="space-y-3">{items.map((assignment) => <article key={assignment.id} className="rounded-2xl border border-slate-200 bg-white p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex min-w-0 items-start gap-3"><div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><FileCheck2 size={18} /></div><div className="min-w-0"><h3 className="font-bold text-slate-900">{assignment.name}</h3><p className="mt-1 text-xs text-slate-500">{assignment.idnumber}</p></div></div><span className="w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">{assignment.submission_type} submission</span></div>
    {assignment.intro && <p className="mt-4 text-sm leading-6 text-slate-600">{assignment.intro}</p>}
    <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-xs sm:grid-cols-3"><div className="text-slate-600">Available: <strong>{formatDate(assignment.allowsubmissionsfromdate)}</strong></div><div className="text-slate-600">Due: <strong>{formatDate(assignment.duedate)}</strong></div><div className="text-slate-600">Maximum grade: <strong>{assignment.grade}</strong></div></div>
    <div className="mt-3 flex justify-end gap-2"><ActivityAccessButton courseId={courseId} activityId={assignment.id} activityType="assignment" /><button type="button" onClick={() => onEdit(assignment)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"><Pencil size={13} /> Edit</button><button type="button" onClick={() => onDelete(assignment)} aria-label={`Delete ${assignment.name}`} className="rounded-lg border border-red-100 p-2 text-red-600"><Trash2 size={14} /></button></div>
  </article>)}</div>;
}

type ActivityType = 'quiz' | 'exam' | 'assignment';
type ActivityProgress = {
  student_id: string;
  name: string;
  cohort: string;
  status: 'missed' | 'submitted' | 'completed';
  completed_at: string | null;
  attempts: number;
  best_score: number | null;
  override_opens_at: number | null;
  override_closes_at: number | null;
  grants_total: number;
  grants_used: number;
  grants_remaining: number;
};

function formatProgressDate(value: string | number | null): string {
  if (!value) return '—';
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function ActivityAccessButton({ courseId, activityId, activityType }: { courseId: string; activityId: number; activityType: ActivityType }) {
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState<ActivityProgress[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'missed' | 'completed' | 'reopened'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'attempts' | 'completed_at'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [closesAt, setClosesAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const pageSize = 10;

  const loadProgress = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.courses.activityProgress(courseId, activityType, activityId) as { data?: ActivityProgress[] };
      setStudents(response.data ?? []);
      setSelected([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load student activity progress.');
    } finally {
      setLoading(false);
    }
  };

  const visibleStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter((student) => {
      const matchesQuery = !query || `${student.name} ${student.student_id} ${student.cohort}`.toLowerCase().includes(query);
      const matchesFilter = filter === 'all'
        || (filter === 'missed' && student.status === 'missed')
        || (filter === 'completed' && student.status !== 'missed')
        || (filter === 'reopened' && student.grants_remaining > 0);
      return matchesQuery && matchesFilter;
    }).sort((first, second) => {
      const left = first[sortBy] ?? '';
      const right = second[sortBy] ?? '';
      const comparison = typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left).localeCompare(String(right));
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [students, search, filter, sortBy, sortDirection]);
  const pageCount = Math.max(1, Math.ceil(visibleStudents.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageStudents = visibleStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const show = () => {
    setOpen(true);
    setPage(1);
    setSearch('');
    setError('');
    setClosesAt('');
    void loadProgress();
  };
  const toggleStudent = (studentId: string) => setSelected((current) => current.includes(studentId)
    ? current.filter((id) => id !== studentId)
    : [...current, studentId]);
  const togglePage = () => {
    const pageIds = pageStudents.map((student) => student.student_id);
    setSelected((current) => pageIds.every((id) => current.includes(id))
      ? current.filter((id) => !pageIds.includes(id))
      : [...new Set([...current, ...pageIds])]);
  };
  const reopen = async () => {
    if (!selected.length || !closesAt) {
      setError('Select at least one student and an access end date.');
      return;
    }
    const closeTimestamp = Math.floor(new Date(closesAt).getTime() / 1000);
    if (!Number.isFinite(closeTimestamp) || closeTimestamp <= Math.floor(Date.now() / 1000)) {
      setError('The access end date must be in the future.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.courses.reopenActivity({
        course_id: courseId,
        activity_type: activityType,
        activity_id: activityId,
        student_ids: selected,
        opens_at: Math.floor(Date.now() / 1000),
        closes_at: closeTimestamp,
      });
      await loadProgress();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to reopen this activity.');
    } finally {
      setSaving(false);
    }
  };
  const changeSort = (value: typeof sortBy) => {
    if (sortBy === value) setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc');
    else {
      setSortBy(value);
      setSortDirection('asc');
    }
    setPage(1);
  };

  return <>
    <button type="button" onClick={show} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800"><ShieldCheck size={13} /> Students / reopen</button>
    {open && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-3 sm:p-5">
      <section className="max-h-[94vh] w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-100 p-5"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Activity access</p><h2 className="mt-1 text-xl font-black text-slate-900">Student progress and reopen access</h2><p className="mt-1 text-xs text-slate-500">Review submissions or attempts, then grant selected students another access window.</p></div><button type="button" onClick={() => setOpen(false)} className="rounded-full bg-slate-100 p-2 text-slate-500" aria-label="Close"><X size={16} /></button></header>
        <div className="max-h-[calc(94vh-88px)] space-y-4 overflow-y-auto p-5">
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800">{error}</div>}
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="relative sm:col-span-2"><Search className="absolute left-3 top-[22px] h-4 w-4 text-slate-400" /><span className="sr-only">Search students</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search student name, ID, or cohort" className={`${inputClass} pl-9`} /></label>
            <select value={filter} onChange={(event) => { setFilter(event.target.value as typeof filter); setPage(1); }} className={inputClass}><option value="all">All students</option><option value="missed">Missed / not submitted</option><option value="completed">Submitted / attempted</option><option value="reopened">Reopened access remaining</option></select>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-[820px] w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500"><tr>
                <th className="px-3 py-3"><input type="checkbox" aria-label="Select students on this page" checked={pageStudents.length > 0 && pageStudents.every((student) => selected.includes(student.student_id))} onChange={togglePage} /></th>
                <th className="px-3 py-3"><button type="button" onClick={() => changeSort('name')} className="inline-flex items-center gap-1">Student <ArrowDownWideNarrow size={12} /></button></th>
                <th className="px-3 py-3">Cohort</th>
                <th className="px-3 py-3"><button type="button" onClick={() => changeSort('status')} className="inline-flex items-center gap-1">Activity status <ArrowDownWideNarrow size={12} /></button></th>
                <th className="px-3 py-3"><button type="button" onClick={() => changeSort('attempts')} className="inline-flex items-center gap-1">Attempts <ArrowDownWideNarrow size={12} /></button></th>
                <th className="px-3 py-3"><button type="button" onClick={() => changeSort('completed_at')} className="inline-flex items-center gap-1">Last activity <ArrowDownWideNarrow size={12} /></button></th>
                <th className="px-3 py-3">Reopen access</th>
              </tr></thead>
              <tbody>{loading ? <tr><td colSpan={7} className="p-8 text-center text-slate-500">Loading student progress...</td></tr> : pageStudents.length ? pageStudents.map((student) => <tr key={student.student_id} className="border-t border-slate-100">
                <td className="px-3 py-3"><input type="checkbox" aria-label={`Select ${student.name}`} checked={selected.includes(student.student_id)} onChange={() => toggleStudent(student.student_id)} /></td>
                <td className="px-3 py-3"><p className="font-bold text-slate-900">{student.name}</p><p className="mt-0.5 font-mono text-[10px] text-slate-400">{student.student_id}</p></td>
                <td className="px-3 py-3 text-slate-600">{student.cohort}</td>
                <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${student.status === 'missed' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{student.status === 'missed' ? 'Missed / not submitted' : student.status === 'submitted' ? 'Submitted' : 'Attempted'}</span></td>
                <td className="px-3 py-3 text-slate-600">{student.attempts}{student.best_score !== null ? ` · best ${student.best_score}` : ''}</td>
                <td className="px-3 py-3 text-slate-600">{formatProgressDate(student.completed_at)}</td>
                <td className="px-3 py-3 text-slate-600">{student.grants_remaining > 0 ? `${student.grants_remaining} remaining · until ${formatProgressDate(student.override_closes_at)}` : 'No access grant'}</td>
              </tr>) : <tr><td colSpan={7} className="p-8 text-center text-slate-500">No students match this filter.</td></tr>}</tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">{selected.length} selected · {visibleStudents.length} students</p>
            <div className="flex items-center gap-2"><button type="button" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40">Previous</button><span className="text-xs text-slate-500">Page {currentPage} of {pageCount}</span><button type="button" disabled={currentPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40">Next</button></div>
          </div>
          <div className="flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4 sm:flex-row sm:items-end">
            <label className="flex-1 text-xs font-bold text-slate-700">Reopen until<input type="datetime-local" value={closesAt} min={new Date().toISOString().slice(0, 16)} onChange={(event) => setClosesAt(event.target.value)} className={inputClass} /></label>
            <button type="button" disabled={saving || loading || selected.length === 0} onClick={() => void reopen()} className="rounded-xl bg-blue-800 px-4 py-3 text-xs font-black text-white disabled:opacity-40">{saving ? 'Saving access...' : `Reopen for ${selected.length} student${selected.length === 1 ? '' : 's'}`}</button>
          </div>
        </div>
      </section>
    </div>}
  </>;
}

export default function CourseAssessmentsPanel({ courseId, kind }: { courseId: string; kind: AssessmentTab }) {
  const [content, setContent] = useState<CourseContent>(emptyContent);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<AssessmentDraft | null>(null);
  const updateQuestion = (index: number, patch: Partial<AssessmentQuestionDraft>) => {
    setDraft((current) => current
      ? { ...current, questions: current.questions.map((question, questionIndex) => questionIndex === index ? { ...question, ...patch } : question) }
      : current);
  };
  const updateQuestionOption = (index: number, option: 'A' | 'B' | 'C' | 'D', value: string) => {
    setDraft((current) => current
      ? { ...current, questions: current.questions.map((question, questionIndex) => questionIndex === index
        ? { ...question, options: { ...question.options, [option]: value } }
        : question) }
      : current);
  };
  const updateCriterion = (index: number, patch: Partial<GradingCriterion>) => {
    setDraft((current) => current
      ? { ...current, rubric: current.rubric.map((criterion, criterionIndex) => criterionIndex === index ? { ...criterion, ...patch } : criterion) }
      : current);
  };

  const loadContent = useCallback(async () => {
    setLoading(true);
    try {
      const result = await requestCourseContent(courseId);
      setContent(result);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load course content.');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadContent(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadContent]);

  const openNew = () => setDraft(newDraft(kind));
  const openQuiz = async (quiz: CourseQuiz) => {
    setError('');
    try {
      const questions = await requestAssessmentQuestions(courseId, quiz.id);
      setDraft({ ...draftFromQuiz(quiz), questions });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load assessment grading matrix.');
    }
  };
  const openAssignment = (assignment: CourseAssignment) => setDraft(draftFromAssignment(assignment));
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft) return;
    const matrixTotal = kind === 'assignments'
      ? draft.rubric.reduce((sum, criterion) => sum + Number(criterion.points || 0), 0)
      : draft.questions.reduce((sum, question) => sum + Number(question.points || 0), 0);
    if (Math.abs(matrixTotal - draft.grade) > 0.01) {
      setError(`Matrix points must add up to the maximum grade (${draft.grade}).`);
      return;
    }
    if (kind !== 'assignments' && draft.questions.length === 0) {
      setError('Add at least one graded question.');
      return;
    }
    if (kind === 'assignments' && draft.rubric.length === 0) {
      setError('Add at least one grading criterion.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await saveCourseAssessment(courseId, kindFor(kind), draft);
      setDraft(null);
      await loadContent();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save course assessment.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number, name: string) => {
    if (!(await confirmWithApp(`Delete "${name}" from this course?`, { title: 'Delete assessment?', confirmText: 'Delete', tone: 'danger' }))) return;
    setError('');
    try {
      await deleteCourseAssessment(courseId, kindFor(kind), id);
      await loadContent();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to delete course assessment.');
    }
  };

  const heading = kind === 'quizzes' ? 'Course quizzes' : kind === 'exams' ? 'Course exams' : 'Course assignments';
  const items = kind === 'assignments' ? content.assignments : content[kind];
  return <section className="space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-lg font-black text-slate-900">{heading}</h2><p className="mt-1 text-xs text-slate-500">Create, edit, and remove database records for this course.</p></div><button type="button" onClick={openNew} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white"><Plus size={14} /> Add {kind === 'assignments' ? 'assignment' : kind === 'quizzes' ? 'quiz' : 'exam'}</button></div>
    {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800"><AlertCircle size={15} className="mt-0.5 shrink-0" />{error}</div>}
    {loading ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Loading course assessments...</div>
      : kind === 'assignments'
        ? content.assignments.length ? <AssignmentCards courseId={courseId} items={content.assignments} onEdit={openAssignment} onDelete={(assignment) => void remove(assignment.id, assignment.name)} /> : <EmptyState label="Assignments" onAdd={openNew} />
        : items.length ? <QuizCards courseId={courseId} kind={kind === 'exams' ? 'exam' : 'quiz'} items={items as CourseQuiz[]} onEdit={openQuiz} onDelete={(quiz) => void remove(quiz.id, quiz.name)} /> : <EmptyState label={kind === 'exams' ? 'Exams' : 'Quizzes'} onAdd={openNew} />}

    {draft && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <form onSubmit={save} className="max-h-[92vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">{content.course.name || courseId}</p><h3 className="mt-1 text-2xl font-black text-slate-900">{draft.id ? 'Edit' : 'Add'} {kind === 'assignments' ? 'assignment' : kind === 'quizzes' ? 'quiz' : 'exam'}</h3></div><button type="button" onClick={() => setDraft(null)} aria-label="Close" className="rounded-full bg-slate-100 p-2 text-slate-500"><X size={16} /></button></div>
        <label className="block text-xs font-bold text-slate-600">Title<input required maxLength={255} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={inputClass} /></label>
        <label className="block text-xs font-bold text-slate-600">Instructions / description<textarea rows={4} value={draft.intro} onChange={(event) => setDraft({ ...draft, intro: event.target.value })} className={inputClass} /></label>
        {kind === 'assignments' ? <>
          <div className="grid gap-4 sm:grid-cols-3"><label className="block text-xs font-bold text-slate-600">Opens for submissions<input type="datetime-local" value={draft.allowsubmissionsfromdate} onChange={(event) => setDraft({ ...draft, allowsubmissionsfromdate: event.target.value })} className={inputClass} /></label><label className="block text-xs font-bold text-slate-600">Due date<input type="datetime-local" value={draft.duedate} onChange={(event) => setDraft({ ...draft, duedate: event.target.value })} className={inputClass} /></label><label className="block text-xs font-bold text-slate-600">Maximum grade<input type="number" min="0" step="0.01" required value={draft.grade} onChange={(event) => setDraft({ ...draft, grade: Number(event.target.value) })} className={inputClass} /></label></div>
          <label className="block text-xs font-bold text-slate-600">Submission type<select value={draft.submission_type} onChange={(event) => setDraft({ ...draft, submission_type: event.target.value as AssessmentDraft['submission_type'] })} className={inputClass}><option value="file">File upload</option><option value="online">Online text</option></select></label>
          <section className="space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div><h4 className="text-sm font-black text-slate-900">Assignment grading rubric</h4><p className="text-xs text-slate-500">Set criteria and point values. Total must equal the maximum grade ({draft.grade}).</p></div>
              <button type="button" onClick={() => setDraft({ ...draft, rubric: [...draft.rubric, { name: '', description: '', points: 0 }] })} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-800"><Plus size={13} /> Criterion</button>
            </div>
            {draft.rubric.map((criterion, index) => (
              <div key={index} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_2fr_100px_auto]">
                <input required maxLength={120} aria-label={`Rubric criterion ${index + 1}`} placeholder="Criterion" value={criterion.name} onChange={(event) => updateCriterion(index, { name: event.target.value })} className={inputClass} />
                <input aria-label={`Rubric description ${index + 1}`} placeholder="What the marker should assess" value={criterion.description} onChange={(event) => updateCriterion(index, { description: event.target.value })} className={inputClass} />
                <input required aria-label={`Rubric points ${index + 1}`} type="number" min="0.01" step="0.01" value={criterion.points} onChange={(event) => updateCriterion(index, { points: Number(event.target.value) })} className={inputClass} />
                <button type="button" aria-label={`Remove criterion ${index + 1}`} disabled={draft.rubric.length < 2} onClick={() => setDraft({ ...draft, rubric: draft.rubric.filter((_, row) => row !== index) })} className="rounded-lg px-3 text-red-600 disabled:opacity-30"><Trash2 size={15} /></button>
              </div>
            ))}
            <p className={`text-right text-xs font-bold ${Math.abs(draft.rubric.reduce((sum, criterion) => sum + Number(criterion.points || 0), 0) - draft.grade) < 0.01 ? 'text-emerald-700' : 'text-amber-700'}`}>
              Rubric total: {draft.rubric.reduce((sum, criterion) => sum + Number(criterion.points || 0), 0).toFixed(2)} / {draft.grade}
            </p>
          </section>
        </> : <>
          <div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-bold text-slate-600">Opens<input type="datetime-local" value={draft.timeopen} onChange={(event) => setDraft({ ...draft, timeopen: event.target.value })} className={inputClass} /></label><label className="block text-xs font-bold text-slate-600">Closes<input type="datetime-local" value={draft.timeclose} onChange={(event) => setDraft({ ...draft, timeclose: event.target.value })} className={inputClass} /></label><label className="block text-xs font-bold text-slate-600">Time limit (minutes)<input type="number" min="1" required value={draft.timelimit} onChange={(event) => setDraft({ ...draft, timelimit: Number(event.target.value) })} className={inputClass} /></label><label className="block text-xs font-bold text-slate-600">Maximum grade<input type="number" min="0.01" step="0.01" required value={draft.grade} onChange={(event) => setDraft({ ...draft, grade: Number(event.target.value) })} className={inputClass} /></label></div>
          <section className="space-y-3 rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div><h4 className="text-sm font-black text-slate-900">Question grading matrix</h4><p className="text-xs text-slate-500">Add questions, answer options, answer keys, and marks. Total must equal {draft.grade}.</p></div>
              <button type="button" onClick={() => setDraft({ ...draft, questions: [...draft.questions, blankQuestion(1)] })} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-bold text-violet-800"><Plus size={13} /> Question</button>
            </div>
            {draft.questions.map((question, index) => (
              <div key={question.id ?? `new-${index}`} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <h5 className="text-xs font-black uppercase tracking-wider text-slate-700">Question {index + 1}</h5>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600">Points<input required type="number" min="0.01" step="0.01" value={question.points} onChange={(event) => updateQuestion(index, { points: Number(event.target.value) })} className="w-24 rounded-lg border border-slate-200 px-2 py-1.5" /></label>
                    <button type="button" aria-label={`Remove question ${index + 1}`} disabled={draft.questions.length < 2} onClick={() => setDraft({ ...draft, questions: draft.questions.filter((_, row) => row !== index) })} className="rounded-lg p-2 text-red-600 disabled:opacity-30"><Trash2 size={15} /></button>
                  </div>
                </div>
                <textarea required rows={2} aria-label={`Question ${index + 1} text`} placeholder="Question prompt" value={question.question} onChange={(event) => updateQuestion(index, { question: event.target.value })} className={inputClass} />
                <div className="grid gap-2 sm:grid-cols-2">
                  {(['A', 'B', 'C', 'D'] as const).map((option) => (
                    <label key={option} className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <span>{option}</span><input required maxLength={500} aria-label={`Option ${option} for question ${index + 1}`} placeholder={`Answer ${option}`} value={question.options[option]} onChange={(event) => updateQuestionOption(index, option, event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" />
                    </label>
                  ))}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block text-xs font-bold text-slate-600">Correct option<select value={question.correct_option} onChange={(event) => updateQuestion(index, { correct_option: event.target.value as AssessmentQuestionDraft['correct_option'] })} className={inputClass}><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></select></label>
                  <label className="block text-xs font-bold text-slate-600">Answer explanation<input value={question.explanation} onChange={(event) => updateQuestion(index, { explanation: event.target.value })} className={inputClass} /></label>
                </div>
              </div>
            ))}
            <p className={`text-right text-xs font-bold ${Math.abs(draft.questions.reduce((sum, question) => sum + Number(question.points || 0), 0) - draft.grade) < 0.01 ? 'text-emerald-700' : 'text-amber-700'}`}>
              Question total: {draft.questions.reduce((sum, question) => sum + Number(question.points || 0), 0).toFixed(2)} / {draft.grade}
            </p>
          </section>
        </>}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setDraft(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white disabled:opacity-60">{saving ? 'Saving...' : 'Save to database'}</button></div>
      </form>
    </div>}
  </section>;
}
