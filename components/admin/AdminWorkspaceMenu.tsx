'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, ListTodo, RefreshCw, X } from 'lucide-react';
import { api } from '@/lib/api';
import { canAccessAdminModule, type AdminModule } from '@/lib/admin-access';

type TaskStatus = 'todo' | 'in_progress' | 'completed';

type WorkspaceTask = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  progress: number;
  due_date: string | null;
  assignees: Array<{ admin_id: string | null; department: string | null }>;
};

type WorkspaceAdmin = {
  id: string;
  admin_role: string;
  department: string;
};

type WorkspaceLink = {
  label: string;
  href: string;
  module: AdminModule;
};

const linksByDepartment: Record<string, WorkspaceLink[]> = {
  finance: [
    { label: 'Payments & ledgers', href: '/admin/payments', module: 'finance' },
    { label: 'Financial reports', href: '/admin/financials', module: 'finance' },
    { label: 'Store purchases', href: '/admin/store/purchases', module: 'store' },
    { label: 'Budgets', href: '/admin/budgets', module: 'finance' },
  ],
  registrar: [
    { label: 'Student records', href: '/admin/students', module: 'students' },
    { label: 'Admissions', href: '/admin/admissions', module: 'admissions' },
    { label: 'Attendance & follow-ups', href: '/admin/student-affairs', module: 'student-affairs' },
    { label: 'Events', href: '/admin/events', module: 'events' },
  ],
  academic: [
    { label: 'Courses & assessments', href: '/admin/courses', module: 'academics' },
    { label: 'Academic schedule', href: '/admin/schedule', module: 'schedule' },
    { label: 'Library', href: '/admin/library', module: 'library' },
    { label: 'Student affairs', href: '/admin/student-affairs', module: 'student-affairs' },
  ],
  support: [
    { label: 'Help desk', href: '/admin/help-desk', module: 'help-desk' },
    { label: 'Communications', href: '/admin/communications', module: 'communications' },
    { label: 'Contact messages', href: '/admin/contact-messages', module: 'contact-messages' },
    { label: 'Website content', href: '/admin/site-content', module: 'social-media' },
    { label: 'Social media', href: '/admin/social-media', module: 'social-media' },
    { label: 'Website chatbot', href: '/admin/chatbot', module: 'chatbot' },
  ],
  operations: [
    { label: 'Tasks', href: '/admin/tasks', module: 'tasks' },
    { label: 'Events', href: '/admin/events', module: 'events' },
    { label: 'Schedules', href: '/admin/schedule', module: 'schedule' },
  ],
};

const directorLinks: WorkspaceLink[] = Object.values(linksByDepartment).flat();
const mediaItLinks: WorkspaceLink[] = [
  { label: 'Website content', href: '/admin/site-content', module: 'social-media' },
  { label: 'Social media', href: '/admin/social-media', module: 'social-media' },
  { label: 'Website chatbot', href: '/admin/chatbot', module: 'chatbot' },
  { label: 'Website contact messages', href: '/admin/contact-messages', module: 'contact-messages' },
  { label: 'Communications', href: '/admin/communications', module: 'communications' },
];

const statusLabels: Record<TaskStatus, string> = {
  todo: 'Start',
  in_progress: 'In process',
  completed: 'Completed',
};

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCalendarCells(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(firstDay);
  start.setDate(1 - firstDay.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function formatDueDate(value: string | null) {
  if (!value) return 'No due date';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? 'No due date'
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function AdminWorkspaceMenu({
  isOpen,
  onClose,
  admin,
}: {
  isOpen: boolean;
  onClose: () => void;
  admin: WorkspaceAdmin;
}) {
  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [savingTaskId, setSavingTaskId] = useState('');
  const [error, setError] = useState('');
  const [clockNow, setClockNow] = useState(() => new Date());
  const [viewedMonth, setViewedMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(() => getDateKey(new Date()));

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setInterval(() => setClockNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [isOpen]);

  const loadTasks = useCallback(async () => {
    setLoadingTasks(true);
    setError('');
    try {
      const response = await api.tasks.list() as { success: boolean; tasks: WorkspaceTask[]; message?: string };
      if (!response.success || !Array.isArray(response.tasks)) {
        throw new Error(response.message || 'Assigned tasks could not be loaded.');
      }
      setTasks(response.tasks);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Assigned tasks could not be loaded.');
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => void loadTasks(), 0);
    return () => window.clearTimeout(timer);
  }, [isOpen, loadTasks]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const assignedTasks = useMemo(() => tasks
    .filter((task) => task.assignees.some((assignee) =>
      assignee.admin_id === admin.id
      || (Boolean(admin.department) && assignee.department === admin.department),
    ))
    .sort((first, second) =>
      Number(first.status === 'completed') - Number(second.status === 'completed')
      || (first.due_date || '9999-12-31').localeCompare(second.due_date || '9999-12-31'),
    ), [admin.department, admin.id, tasks]);

  const links = useMemo(() => {
    const role = admin.admin_role.toLowerCase();
    const department = role === 'owner' || role === 'administrator'
      ? 'director'
      : role;
    const candidates = [
      ...(department === 'director' ? directorLinks : linksByDepartment[department] || []),
      ...( /media|information technology|\bit\b/i.test(admin.department) ? mediaItLinks : []),
    ];
    return candidates
      .filter((item, index, list) => list.findIndex((other) => other.href === item.href) === index)
      .filter((item) => canAccessAdminModule(admin.admin_role, admin.department, item.module))
      .slice(0, 5);
  }, [admin.admin_role, admin.department]);

  const updateTaskStatus = async (task: WorkspaceTask, status: TaskStatus) => {
    setSavingTaskId(task.id);
    setError('');
    const progress = status === 'completed'
      ? 100
      : status === 'todo'
        ? 0
        : Math.max(1, Math.min(99, task.progress));
    try {
      const response = await api.tasks.update({ id: task.id, status, progress }) as { success: boolean; message?: string };
      if (!response.success) throw new Error(response.message || 'Task status could not be updated.');
      setTasks((current) => current.map((item) =>
        item.id === task.id ? { ...item, status, progress } : item,
      ));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Task status could not be updated.');
    } finally {
      setSavingTaskId('');
    }
  };

  const calendarCells = useMemo(() => getCalendarCells(viewedMonth), [viewedMonth]);
  const tasksDueSelectedDate = useMemo(
    () => assignedTasks.filter((task) => task.due_date === selectedDate),
    [assignedTasks, selectedDate],
  );
  const todayKey = getDateKey(clockNow);
  const outstandingCount = assignedTasks.filter((task) => task.status !== 'completed').length;
  const selectedDateLabel = selectedDate
    ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : '';
  const changeMonth = (amount: number) => {
    setViewedMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
    setSelectedDate(null);
  };
  const showToday = () => {
    const now = new Date();
    setClockNow(now);
    setViewedMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(getDateKey(now));
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        aria-label="Close workspace menu"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-slate-950/30 backdrop-blur-[1px]"
      />
      <aside
        data-admin-workspace-menu
        role="dialog"
        aria-modal="true"
        aria-label="Admin workspace menu"
        className="absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col border-l border-slate-200 bg-[#f8faf9] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#31584c]">Your workspace</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">Overview</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close workspace menu" className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f4c5c]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <CalendarDays className="h-5 w-5 shrink-0 text-[#0f4c5c]" />
                <h3 className="truncate font-bold text-slate-900">{viewedMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-slate-700" aria-label="Current time">
                <Clock3 className="h-3.5 w-3.5 text-[#0f4c5c]" />
                <time className="font-mono text-xs font-bold tabular-nums">{clockNow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time>
              </div>
            </div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-red-700">{selectedDate === todayKey ? 'Today' : selectedDate ? 'Selected day' : 'Calendar'}</span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month" className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f4c5c]">
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={showToday} className="rounded-lg px-2 py-1 text-[10px] font-bold text-[#31584c] transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f4c5c]">Today</button>
                <button type="button" onClick={() => changeMonth(1)} aria-label="Next month" className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f4c5c]">
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-y-1 text-center">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                <span key={`${day}-${index}`} className="pb-1 text-[10px] font-bold text-slate-500">{day}</span>
              ))}
              {calendarCells.map((date) => {
                const dateKey = getDateKey(date);
                const isCurrentMonth = date.getMonth() === viewedMonth.getMonth();
                const isToday = dateKey === todayKey;
                const isSelected = dateKey === selectedDate;
                const hasDueTasks = assignedTasks.some((task) => task.due_date === dateKey);
                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => setSelectedDate(dateKey)}
                    aria-label={`${date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}${hasDueTasks ? ', tasks due' : ''}`}
                    aria-pressed={isSelected}
                    aria-current={isToday ? 'date' : undefined}
                    className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[11px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f4c5c] ${isSelected ? 'bg-[#10283a] font-bold text-white' : isCurrentMonth ? 'text-slate-700 hover:bg-emerald-50' : 'text-slate-300 hover:bg-slate-50'}`}
                  >
                    {date.getDate()}
                    {hasDueTasks && <span aria-hidden="true" className={`absolute bottom-0.5 h-1 w-1 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-red-600'}`} />}
                  </button>
                );
              })}
            </div>
            {selectedDate && <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Tasks due {selectedDateLabel}</p>
              {tasksDueSelectedDate.length
                ? <ul className="mt-1 space-y-1">{tasksDueSelectedDate.slice(0, 3).map((task) => <li key={task.id} className="truncate text-xs font-semibold text-slate-800">{task.title}</li>)}</ul>
                : <p className="mt-1 text-xs text-slate-500">No assigned tasks due this day.</p>}
              {tasksDueSelectedDate.length > 3 && <p className="mt-1 text-[10px] font-semibold text-slate-500">And {tasksDueSelectedDate.length - 3} more</p>}
            </div>}
            <Link href="/admin/schedule" onClick={onClose} className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-[#31584c] hover:text-[#10283a]">
              View your department schedule <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><ListTodo className="h-4 w-4" /></span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Assigned tasks</h3>
                  <p className="text-[11px] text-slate-500">{outstandingCount} in progress or to start</p>
                </div>
              </div>
              <button type="button" onClick={() => void loadTasks()} disabled={loadingTasks} aria-label="Refresh assigned tasks" className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50">
                <RefreshCw className={`h-4 w-4 ${loadingTasks ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {error && <p role="alert" className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</p>}
            <div className="divide-y divide-slate-100">
              {loadingTasks && !tasks.length
                ? <p role="status" className="px-4 py-6 text-center text-sm text-slate-500">Loading assigned tasks…</p>
                : assignedTasks.length
                  ? assignedTasks.map((task) => (
                    <article key={task.id} className="space-y-2.5 px-4 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="break-words text-sm font-semibold text-slate-900">{task.title}</h4>
                          <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500"><Clock3 className="h-3 w-3" /> Due {formatDueDate(task.due_date)}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${task.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : task.status === 'in_progress' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                          {task.status === 'todo' ? 'Not started' : statusLabels[task.status]}
                        </span>
                      </div>
                      {task.description && <p className="line-clamp-2 text-xs leading-5 text-slate-600">{task.description}</p>}
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-full rounded-full transition-all ${task.status === 'completed' ? 'bg-emerald-500' : 'bg-[#0f4c5c]'}`} style={{ width: `${Math.min(100, Math.max(0, task.progress))}%` }} />
                        </div>
                        <span className="w-8 text-right text-[10px] font-bold tabular-nums text-slate-500">{task.progress}%</span>
                      </div>
                      <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                        Update status
                        <select
                          value={task.status}
                          disabled={savingTaskId === task.id}
                          onChange={(event) => void updateTaskStatus(task, event.target.value as TaskStatus)}
                          className="ml-auto h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#0f4c5c] focus:ring-2 focus:ring-[#0f4c5c]/10 disabled:opacity-50"
                        >
                          <option value="todo">Start</option>
                          <option value="in_progress">In process</option>
                          <option value="completed">Completed</option>
                        </select>
                      </label>
                    </article>
                  ))
                  : <p className="px-4 py-6 text-center text-sm text-slate-500">No tasks are assigned to you yet.</p>}
            </div>
            <Link href="/admin/tasks" onClick={onClose} className="flex items-center justify-center gap-2 border-t border-slate-100 px-4 py-3 text-xs font-bold text-[#31584c] transition hover:bg-slate-50">
              Open task workspace <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Get started</p>
              <h3 className="mt-1 text-sm font-bold text-slate-900">Quick links</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {links.map((item) => (
                <Link key={item.href} href={item.href} onClick={onClose} className="group flex items-center justify-between gap-3 py-3 text-sm font-semibold text-slate-700 transition hover:text-[#0f4c5c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f4c5c]">
                  <span className="truncate">{item.label}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#0f4c5c]" />
                </Link>
              ))}
              {!links.length && <p className="py-3 text-xs text-slate-500">No workspace links are available for this account.</p>}
            </div>
          </section>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
