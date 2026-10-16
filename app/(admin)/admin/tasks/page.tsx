'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plus,
  RotateCw,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';

type TaskStatus = 'todo' | 'in_progress' | 'completed';
type TaskPriority = 'low' | 'normal' | 'high';

type TaskAssignee = {
  admin_id: string | null;
  admin_name: string | null;
  department: string | null;
};

type AdminTask = {
  id: string;
  title: string;
  description: string | null;
  created_by: string;
  creator_name: string;
  status: TaskStatus;
  progress: number;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  assignees: TaskAssignee[];
  can_delete: boolean;
};

type AdminOption = {
  id: string;
  name: string;
  department: string;
  role: string;
};

type TasksResponse = {
  success: boolean;
  tasks: AdminTask[];
  admins: AdminOption[];
  departments: string[];
};

type TaskFilter = 'all' | 'mine' | 'created';

const statusLabels: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  completed: 'Completed',
};

const statusStyles: Record<TaskStatus, string> = {
  todo: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-emerald-100 text-emerald-800',
};

const priorityStyles: Record<TaskPriority, string> = {
  low: 'border-slate-200 text-slate-500',
  normal: 'border-blue-200 text-blue-700',
  high: 'border-red-200 text-red-700',
};

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateFromKey(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

function formatDate(value: string | null): string {
  if (!value) return 'No due date';
  return dateFromKey(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getMonthDays(date: Date): Date[] {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [admins, setAdmins] = useState<AdminOption[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [adminId, setAdminId] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [panelOpen, setPanelOpen] = useState(true);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingTaskId, setSavingTaskId] = useState('');
  const [deletingTaskId, setDeletingTaskId] = useState('');
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [search, setSearch] = useState('');
  const [now, setNow] = useState(new Date());
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [progressDrafts, setProgressDrafts] = useState<Record<string, number>>({});
  const [form, setForm] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'normal' as TaskPriority,
    admin_ids: [] as string[],
    departments: [] as string[],
  });

  const loadTasks = useCallback(async (showSpinner = true) => {
    if (showSpinner) {
      setRefreshing(true);
      setError('');
    }
    try {
      const response = await api.tasks.list() as TasksResponse;
      if (!response.success) throw new Error('Unable to load the task workspace.');
      setTasks(response.tasks);
      setAdmins(response.admins);
      setDepartments(response.departments);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load the task workspace.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      try {
        const profile = JSON.parse(window.localStorage.getItem('rhema_user') || 'null');
        setAdminId(String(profile?.id || ''));
        if (profile?.id) {
          setForm((current) => ({ ...current, admin_ids: [String(profile.id)] }));
        }
      } catch {
        setError('Unable to read the active administrator profile.');
      }
      void loadTasks(false);
    }, 0);
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [loadTasks]);

  const myDepartment = useMemo(
    () => admins.find((person) => person.id === adminId)?.department || '',
    [adminId, admins],
  );
  const assignedTasks = useMemo(
    () => tasks
      .filter((task) => task.assignees.some((assignee) => assignee.admin_id === adminId || (!!myDepartment && assignee.department === myDepartment)))
      .sort((a, b) => Number(a.status === 'completed') - Number(b.status === 'completed') || (a.due_date || '9999-12-31').localeCompare(b.due_date || '9999-12-31')),
    [adminId, myDepartment, tasks],
  );
  const visibleTasks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return tasks.filter((task) => {
      if (filter === 'mine' && !task.assignees.some((assignee) => assignee.admin_id === adminId || (!!myDepartment && assignee.department === myDepartment))) return false;
      if (filter === 'created' && task.created_by !== adminId) return false;
      if (!normalizedSearch) return true;
      return `${task.title} ${task.description || ''} ${task.creator_name} ${task.assignees.map((assignee) => assignee.admin_name || assignee.department || '').join(' ')}`.toLowerCase().includes(normalizedSearch);
    });
  }, [adminId, filter, myDepartment, search, tasks]);

  const calendarDays = useMemo(() => getMonthDays(month), [month]);
  const dueDateCounts = useMemo(() => tasks.reduce<Record<string, number>>((counts, task) => {
    if (task.due_date) counts[task.due_date] = (counts[task.due_date] || 0) + 1;
    return counts;
  }, {}), [tasks]);
  const selectedDayTasks = useMemo(
    () => tasks.filter((task) => task.due_date === selectedDate).sort((a, b) => a.title.localeCompare(b.title)),
    [selectedDate, tasks],
  );
  const completedCount = tasks.filter((task) => task.status === 'completed').length;
  const activeCount = tasks.filter((task) => task.status === 'in_progress').length;

  const toggleSelection = (key: 'admin_ids' | 'departments', value: string) => {
    setForm((current) => {
      const values = current[key];
      return { ...current, [key]: values.includes(value) ? values.filter((item) => item !== value) : [...values, value] };
    });
  };

  const createTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await api.tasks.create(form) as { success: boolean; message?: string };
      if (!response.success) throw new Error(response.message || 'The task could not be created.');
      setForm({ title: '', description: '', due_date: '', priority: 'normal', admin_ids: adminId ? [adminId] : [], departments: [] });
      setNewTaskOpen(false);
      await loadTasks(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'The task could not be created.');
    } finally {
      setSaving(false);
    }
  };

  const updateProgress = async (task: AdminTask, progress: number) => {
    const status: TaskStatus = progress >= 100 ? 'completed' : progress <= 0 ? 'todo' : 'in_progress';
    setSavingTaskId(task.id);
    setError('');
    try {
      const response = await api.tasks.update({ id: task.id, progress, status }) as { success: boolean; message?: string };
      if (!response.success) throw new Error(response.message || 'The task progress could not be updated.');
      setProgressDrafts((current) => {
        const next = { ...current };
        delete next[task.id];
        return next;
      });
      await loadTasks(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'The task progress could not be updated.');
    } finally {
      setSavingTaskId('');
    }
  };

  const deleteTask = async (task: AdminTask) => {
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    setDeletingTaskId(task.id);
    setError('');
    try {
      const response = await api.tasks.remove(task.id) as { success: boolean; message?: string };
      if (!response.success) throw new Error(response.message || 'The task could not be deleted.');
      await loadTasks(false);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'The task could not be deleted.');
    } finally {
      setDeletingTaskId('');
    }
  };

  const changeMonth = (amount: number) => {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPanelOpen((open) => !open)}
            aria-expanded={panelOpen}
            aria-label={panelOpen ? 'Hide calendar and task sidebar' : 'Show calendar and task sidebar'}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <CalendarDays className="h-5 w-5" />
          </button>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-700">Admin workspace</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Tasks & calendar</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void loadTasks()} disabled={refreshing} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            <RotateCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button type="button" onClick={() => setNewTaskOpen((open) => !open)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-700 px-4 text-sm font-bold text-white shadow-sm hover:bg-red-800">
            {newTaskOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {newTaskOpen ? 'Close form' : 'New task'}
          </button>
        </div>
      </div>

      {error && <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

      <div className="flex items-start gap-5">
        {panelOpen && (
          <aside className="fixed inset-x-4 bottom-4 top-24 z-30 w-auto overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xl md:sticky md:inset-auto md:top-20 md:z-0 md:block md:w-[310px] md:shrink-0 md:shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Local time</p>
                <p className="mt-1 text-xl font-black tabular-nums text-slate-900">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                <p className="text-xs font-semibold text-slate-500">{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              </div>
              <button type="button" onClick={() => setPanelOpen(false)} aria-label="Close task sidebar" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 md:hidden"><X className="h-4 w-4" /></button>
            </div>

            <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-black text-slate-800">{month.toLocaleDateString([], { month: 'long', year: 'numeric' })}</h2>
                <div className="flex gap-1">
                  <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month" className="rounded-lg p-1.5 text-slate-500 hover:bg-white"><ChevronLeft className="h-4 w-4" /></button>
                  <button type="button" onClick={() => changeMonth(1)} aria-label="Next month" className="rounded-lg p-1.5 text-slate-500 hover:bg-white"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase text-slate-400">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <span key={`${day}-${index}`} className="pb-2">{day}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                {calendarDays.map((day) => {
                  const key = dateKey(day);
                  const isCurrentMonth = day.getMonth() === month.getMonth();
                  const isSelected = key === selectedDate;
                  const isToday = key === dateKey(now);
                  return (
                    <button key={key} type="button" onClick={() => setSelectedDate(key)} aria-label={`${day.toLocaleDateString()}, ${dueDateCounts[key] || 0} due tasks`} className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${isSelected ? 'bg-red-700 text-white' : isCurrentMonth ? 'text-slate-700 hover:bg-red-50' : 'text-slate-300 hover:bg-slate-100'} ${isToday && !isSelected ? 'ring-1 ring-red-500' : ''}`}>
                      {day.getDate()}
                      {!!dueDateCounts[key] && <span className={`absolute bottom-0.5 h-1 w-1 rounded-full ${isSelected ? 'bg-white' : 'bg-amber-500'}`} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <section className="mt-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-slate-900">{dateFromKey(selectedDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</h2>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">{selectedDayTasks.length} due</span>
              </div>
              {selectedDayTasks.length ? <div className="mt-2 space-y-2">
                {selectedDayTasks.map((task) => <button key={task.id} type="button" onClick={() => { setFilter('all'); setSearch(task.title); }} className="w-full rounded-xl border border-slate-100 p-3 text-left hover:border-red-200 hover:bg-red-50/40">
                  <p className="line-clamp-2 text-xs font-bold text-slate-800">{task.title}</p>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500"><span>{task.progress}% complete</span><span>{task.assignees.length} assigned</span></div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-red-600" style={{ width: `${task.progress}%` }} /></div>
                </button>)}
              </div> : <p className="mt-3 rounded-xl bg-slate-50 px-3 py-4 text-xs leading-5 text-slate-500">No tasks are due on this date.</p>}
            </section>

            <section className="mt-5 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-slate-900">Assigned to me</h2>
                <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700">{assignedTasks.length}</span>
              </div>
              {assignedTasks.length ? <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">
                {assignedTasks.map((task) => <button key={task.id} type="button" onClick={() => { setFilter('all'); setSearch(task.title); }} className="w-full rounded-xl border border-slate-100 p-3 text-left hover:border-red-200 hover:bg-red-50/40">
                  <div className="flex items-start justify-between gap-2"><p className="line-clamp-2 text-xs font-bold text-slate-800">{task.title}</p><span className="shrink-0 text-[10px] font-bold text-slate-500">{task.progress}%</span></div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-red-600" style={{ width: `${task.progress}%` }} /></div>
                  <p className="mt-1.5 text-[10px] text-slate-500">{task.status === 'completed' ? 'Completed' : `Due ${formatDate(task.due_date)}`}</p>
                </button>)}
              </div> : <p className="mt-3 rounded-xl bg-slate-50 px-3 py-4 text-xs leading-5 text-slate-500">No tasks are assigned to you or your department yet.</p>}
            </section>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-blue-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">In progress</p><p className="mt-1 text-xl font-black text-blue-900">{activeCount}</p></div>
              <div className="rounded-xl bg-emerald-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Completed</p><p className="mt-1 text-xl font-black text-emerald-900">{completedCount}</p></div>
            </div>
          </aside>
        )}

        <section className="min-w-0 flex-1">
          {newTaskOpen && (
            <form onSubmit={(event) => void createTask(event)} className="mb-5 rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div><h2 className="text-lg font-black text-slate-900">Create a task</h2><p className="mt-1 text-xs text-slate-500">Assign to individual administrators, entire departments, or both.</p></div>
                <span className="rounded-full bg-red-50 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-red-700">Task setup</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="md:col-span-2"><span className="mb-1.5 block text-xs font-bold text-slate-700">Task title</span><input required maxLength={200} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="What needs to be done?" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100" /></label>
                <label className="md:col-span-2"><span className="mb-1.5 block text-xs font-bold text-slate-700">Details</span><textarea rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Add context or instructions (optional)" className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100" /></label>
                <label><span className="mb-1.5 block text-xs font-bold text-slate-700">Due date</span><input type="date" value={form.due_date} onChange={(event) => setForm((current) => ({ ...current, due_date: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100" /></label>
                <label><span className="mb-1.5 block text-xs font-bold text-slate-700">Priority</span><select value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as TaskPriority }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-500"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select></label>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <fieldset className="rounded-xl border border-slate-100 p-3">
                  <legend className="px-1 text-xs font-black text-slate-700"><Users className="mr-1 inline h-3.5 w-3.5" /> Assign administrators</legend>
                  <div className="mt-1 max-h-40 space-y-1 overflow-y-auto">
                    {admins.map((person) => <label key={person.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-slate-50">
                      <input type="checkbox" checked={form.admin_ids.includes(person.id)} onChange={() => toggleSelection('admin_ids', person.id)} className="h-4 w-4 rounded border-slate-300 accent-red-700" />
                      <span className="min-w-0 flex-1 truncate font-semibold text-slate-700">{person.name}</span><span className="shrink-0 text-[10px] text-slate-400">{person.department}</span>
                    </label>)}
                    {!admins.length && <p className="px-2 py-2 text-xs text-slate-400">No active administrators found.</p>}
                  </div>
                </fieldset>
                <fieldset className="rounded-xl border border-slate-100 p-3">
                  <legend className="px-1 text-xs font-black text-slate-700">Assign departments</legend>
                  <div className="mt-1 max-h-40 space-y-1 overflow-y-auto">
                    {departments.map((department) => <label key={department} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-slate-50">
                      <input type="checkbox" checked={form.departments.includes(department)} onChange={() => toggleSelection('departments', department)} className="h-4 w-4 rounded border-slate-300 accent-red-700" />
                      <span className="font-semibold text-slate-700">{department}</span>
                    </label>)}
                    {!departments.length && <p className="px-2 py-2 text-xs text-slate-400">No departments found.</p>}
                  </div>
                </fieldset>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11px] leading-5 text-slate-500">A department assignment is visible to all active admins in that department.</p>
                <button type="submit" disabled={saving || !form.title.trim()} className="rounded-xl bg-red-700 px-5 py-2.5 text-sm font-black text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Creating…' : 'Create task'}</button>
              </div>
            </form>
          )}

          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: 'Visible tasks', value: tasks.length, icon: CheckSquare, color: 'text-slate-700 bg-slate-100' },
              { label: 'To do', value: tasks.filter((task) => task.status === 'todo').length, icon: Clock3, color: 'text-amber-700 bg-amber-100' },
              { label: 'In progress', value: activeCount, icon: RotateCw, color: 'text-blue-700 bg-blue-100' },
              { label: 'Completed', value: completedCount, icon: Check, color: 'text-emerald-700 bg-emerald-100' },
            ].map(({ label, value, icon: Icon, color }) => <div key={label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-500">{label}</span><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}><Icon className="h-4 w-4" /></span></div><p className="mt-2 text-2xl font-black text-slate-900">{value}</p></div>)}
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap gap-1">
              {([['all', 'All tasks'], ['mine', 'Assigned to me'], ['created', 'Created by me']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${filter === value ? 'bg-red-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{label}</button>)}
            </div>
            <label className="flex min-w-[190px] flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 md:max-w-xs"><Search className="h-4 w-4 shrink-0 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks or assignees" className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400" /></label>
          </div>

          {loading ? <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center text-sm font-semibold text-slate-500">Loading tasks…</div>
            : visibleTasks.length ? <div className="space-y-3">
              {visibleTasks.map((task) => {
                const progress = progressDrafts[task.id] ?? task.progress;
                return <article key={task.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-black text-slate-900 md:text-base">{task.title}</h2>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${statusStyles[task.status]}`}>{statusLabels[task.status]}</span>
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold capitalize ${priorityStyles[task.priority]}`}>{task.priority} priority</span>
                      </div>
                      {task.description && <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">{task.description}</p>}
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDate(task.due_date)}</span>
                        <span>Created by {task.creator_name}</span>
                        <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{task.assignees.length ? task.assignees.map((assignee) => assignee.admin_name || assignee.department).filter(Boolean).join(', ') : 'No assignees'}</span>
                      </div>
                    </div>
                    {task.can_delete && <button type="button" onClick={() => void deleteTask(task)} disabled={deletingTaskId === task.id} aria-label={`Delete ${task.title}`} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-700 disabled:opacity-50">{deletingTaskId === task.id ? <RotateCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button>}
                  </div>
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label htmlFor={`progress-${task.id}`} className="text-xs font-bold text-slate-600">Progress <span className="ml-1 text-slate-900">{progress}%</span></label>
                      <div className="flex items-center gap-2">
                        {task.status !== 'completed' && <button type="button" onClick={() => void updateProgress(task, 100)} disabled={savingTaskId === task.id} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"><Check className="h-3.5 w-3.5" /> Mark complete</button>}
                        {progress !== task.progress && <button type="button" onClick={() => void updateProgress(task, progress)} disabled={savingTaskId === task.id} className="rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-slate-700 disabled:opacity-50">{savingTaskId === task.id ? 'Saving…' : 'Save progress'}</button>}
                      </div>
                    </div>
                    <input id={`progress-${task.id}`} type="range" min="0" max="100" step="5" value={progress} onChange={(event) => setProgressDrafts((current) => ({ ...current, [task.id]: Number(event.target.value) }))} aria-label={`Progress for ${task.title}`} className="mt-2 h-2 w-full cursor-pointer accent-red-700" />
                    <div className="mt-1 flex justify-between text-[9px] font-semibold text-slate-400"><span>Not started</span><span>Complete</span></div>
                  </div>
                </article>;
              })}
            </div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-700"><CheckSquare className="h-6 w-6" /></div>
              <h2 className="mt-4 text-base font-black text-slate-900">{search ? 'No matching tasks' : 'No tasks here yet'}</h2>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">{search ? 'Try another search term or clear the search field.' : 'Create an individual task or assign work to administrators and departments.'}</p>
              {!search && <button type="button" onClick={() => setNewTaskOpen(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-800"><Plus className="h-4 w-4" /> Create first task</button>}
            </div>}
        </section>
      </div>
      {panelOpen && <button type="button" aria-label="Close calendar sidebar" onClick={() => setPanelOpen(false)} className="fixed inset-0 z-20 bg-slate-950/25 md:hidden" />}
    </div>
  );
}
