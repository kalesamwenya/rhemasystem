'use client';

import { confirmWithApp } from '@/components/ui/app-dialogs';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, CalendarDays, Check, Clock3, FileCheck2, HelpCircle, Pencil, Plus, Search, ShieldAlert, Trash2, UserPlus, Users, X } from 'lucide-react';
import { requestRhemaSchedules, requestRhemaStudents, syncRhemaSchedules, type RhemaSchedule, type RhemaSession, type RhemaStudent } from '@/lib/rhema-schedule-api';
import { api } from '@/lib/api';
import ReadingsPanel from './ReadingsPanel';
import CourseAssessmentsPanel from './CourseAssessmentsPanel';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-slate-400 focus:bg-white';
const newSession = (): RhemaSession => ({ id: `s_${Date.now()}`, date: '', start: '09:00', end: '15:00', notes: '' });
type CourseLecturer = { id: string; name: string; email: string; department: string; title: string };

export default function CourseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const code = String(params.code || '').trim().toLowerCase();
  const [course, setCourse] = useState<RhemaSchedule | null>(null);
  const [loadedCode, setLoadedCode] = useState<string | null>(null);
  const [enrollments, setEnrollments] = useState<Record<string, string[]>>({});
  const [students, setStudents] = useState<RhemaStudent[]>([]);
  const [lecturers, setLecturers] = useState<CourseLecturer[]>([]);
  const [assignedLecturerIds, setAssignedLecturerIds] = useState<string[]>([]);
  const [savingLecturers, setSavingLecturers] = useState(false);
  const [tab, setTab] = useState<'details' | 'students' | 'materials' | 'quizzes' | 'assignments' | 'exams'>('details');
  const [editing, setEditing] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isAddingStudents, setIsAddingStudents] = useState(false);
  const [savingRoster, setSavingRoster] = useState(false);
  const [message, setMessage] = useState('');
  const messageIsError = message !== '' && message !== 'Roster saved.' && message !== 'Course, cohort, and sessions saved.' && message !== 'Course teaching assignments saved.';
  const cohortStudents = useMemo(() => students.filter((student) => {
    const courseCohort = course?.cohortName.trim().toUpperCase();
    const studentCohort = student.cohort.trim().toUpperCase();
    return courseCohort === studentCohort;
  }), [students, course]);

  useEffect(() => {
    let active = true;
    Promise.all([requestRhemaSchedules(), requestRhemaStudents()])
      .then(async ([data, studentData]) => {
        if (!active) return;
        const requestedKey = code.replace(/[\s_-]+/g, '');
        const matchedCourse = data.schedules.find((item) =>
          item.id.trim().toLowerCase() === code
          || item.course.trim().toLowerCase() === code
          || item.course.trim().toLowerCase().replace(/[\s_-]+/g, '') === requestedKey
        ) ?? null;
        setCourse(matchedCourse);
        setEnrollments(data.enrollments);
        setStudents(studentData);
        if (matchedCourse) {
          const lecturerData = await api.courses.courseLecturers(matchedCourse.id) as {
            data?: { lecturers?: CourseLecturer[]; assigned_ids?: string[] };
          };
          if (!active) return;
          setLecturers(lecturerData.data?.lecturers ?? []);
          setAssignedLecturerIds(lecturerData.data?.assigned_ids ?? []);
        }
        setLoadedCode(code);
      })
      .catch((error: unknown) => {
        if (active) {
          setMessage(error instanceof Error ? error.message : 'Unable to load course details.');
          setLoadedCode(code);
        }
      })
    return () => { active = false; };
  }, [code]);
  if (loadedCode !== code || !course) return <div className="space-y-4"><Link href="/admin/courses" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600"><ArrowLeft size={16} /> Courses</Link><div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-semibold text-slate-500">{loadedCode !== code ? 'Loading course details...' : message || 'Course not found.'}</div></div>;
  const enrolledIds = enrollments[course.id] ?? [];
  const enrolledStudents = cohortStudents.filter((student) => enrolledIds.includes(student.id));
  const availableStudents = cohortStudents
    .filter((student) => !enrolledIds.includes(student.id));
  const saveRoster = async (nextIds: string[]) => {
    setSavingRoster(true);
    setMessage('');
    try {
      await syncRhemaSchedules({ schedules: [course], enrollments: { [course.id]: nextIds } });
      setEnrollments((current) => ({ ...current, [course.id]: nextIds }));
      setSelectedStudentIds([]);
      setIsAddingStudents(false);
      setMessage('Roster saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save roster.');
    } finally {
      setSavingRoster(false);
    }
  };
  const addSelectedStudents = () => {
    const additions = selectedStudentIds.filter((id) => cohortStudents.some((student) => student.id === id));
    if (additions.length) void saveRoster([...new Set([...enrolledIds, ...additions])]);
  };
  const removeStudent = (studentId: string) => {
    void saveRoster(enrolledIds.filter((id) => id !== studentId));
  };
  const toggleSelectedStudent = (studentId: string) => {
    setSelectedStudentIds((current) => current.includes(studentId)
      ? current.filter((id) => id !== studentId)
      : [...current, studentId]);
  };
  const toggleVisibleStudents = (visibleIds: string[]) => {
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedStudentIds.includes(id));
    setSelectedStudentIds((current) => allSelected
      ? current.filter((id) => !visibleIds.includes(id))
      : [...new Set([...current, ...visibleIds])]);
  };
  const saveCourseLecturers = async (lecturerIds: string[]) => {
    setSavingLecturers(true);
    setMessage('');
    try {
      await api.courses.saveCourseLecturers({ course_id: course.id, lecturer_ids: lecturerIds });
      setAssignedLecturerIds(lecturerIds);
      setMessage('Course teaching assignments saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save teaching assignments.');
    } finally {
      setSavingLecturers(false);
    }
  };
  const deleteCourse = async () => { if (!(await confirmWithApp(`Delete ${course.course} and all its sessions?`, { title: 'Delete course?', confirmText: 'Delete course', tone: 'danger' }))) return; try { await api.courses.removeSchedule(course.id); router.push('/admin/courses'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to delete course.'); } };
  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <Link href="/admin/courses" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400"><ArrowLeft size={14} /> Courses</Link>
          <p className="mt-4 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{course.id}</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">{course.course}</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">Cohort {course.cohort} • {course.cohortName} • {course.sessions.length} sessions • {enrolledIds.length} enrolled</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700"><Pencil size={14} /> Edit course</button>
          <button onClick={deleteCourse} className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-xs font-black text-red-700"><Trash2 size={14} /> Delete</button>
        </div>
      </header>
      {message && <div role={messageIsError ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-xs font-semibold ${messageIsError ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{message}</div>}
      <div role="tablist" aria-label="Course sections" className="flex gap-2 overflow-x-auto border-b border-slate-200">
        <Tab active={tab === 'details'} onClick={() => setTab('details')} icon={<CalendarDays size={15} />} label="Course details" />
        <Tab active={tab === 'students'} onClick={() => setTab('students')} icon={<Users size={15} />} label={`Students (${enrolledIds.length})`} />
        <Tab active={tab === 'materials'} onClick={() => setTab('materials')} icon={<BookOpen size={15} />} label="Materials" />
        <Tab active={tab === 'quizzes'} onClick={() => setTab('quizzes')} icon={<HelpCircle size={15} />} label="Quizzes" />
        <Tab active={tab === 'assignments'} onClick={() => setTab('assignments')} icon={<FileCheck2 size={15} />} label="Assignments" />
        <Tab active={tab === 'exams'} onClick={() => setTab('exams')} icon={<ShieldAlert size={15} />} label="Exams" />
      </div>
      <div role="tabpanel" className="min-h-64">
        {tab === 'details' && (
          <div className="space-y-8">
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Course description</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{course.description?.trim() || 'No course description has been added yet. Use Edit course to add the course outline and learning details.'}</p>
            </section>
            <CourseLecturerPanel
              lecturers={lecturers}
              assignedIds={assignedLecturerIds}
              onSave={saveCourseLecturers}
              saving={savingLecturers}
            />
            <SessionTab sessions={course.sessions} />
          </div>
        )}
        {tab === 'students' && (
          <RosterTab
            courseCohort={course.cohortName}
            enrolledStudents={enrolledStudents}
            availableStudents={availableStudents}
            selectedStudentIds={selectedStudentIds}
            toggleSelectedStudent={toggleSelectedStudent}
            toggleVisibleStudents={toggleVisibleStudents}
            isAddingStudents={isAddingStudents}
            setIsAddingStudents={setIsAddingStudents}
            saving={savingRoster}
            onAddSelected={addSelectedStudents}
            onRemoveStudent={removeStudent}
          />
        )}
        {tab === 'materials' && <ReadingsPanel course={course.course} />}
        {(tab === 'quizzes' || tab === 'assignments' || tab === 'exams') && <CourseAssessmentsPanel courseId={course.id} kind={tab} />}
      </div>
      {editing && <CourseEditor course={course} enrollments={enrollments} onClose={() => setEditing(false)} onSaved={(updated) => { setCourse(updated); setEditing(false); setMessage('Course, cohort, and sessions saved.'); }} />}
    </div>
  );
}

function Tab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) { return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-xs font-black ${active ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400'}`}>{icon}{label}</button>; }
function CourseLecturerPanel({ lecturers, assignedIds, onSave, saving }: { lecturers: CourseLecturer[]; assignedIds: string[]; onSave: (ids: string[]) => void; saving: boolean }) {
  const [selectedIds, setSelectedIds] = useState<string[]>(assignedIds);
  const toggle = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900">Teaching lecturers</h2>
          <p className="mt-1 text-xs text-slate-500">Only assigned lecturers can view and mark submissions for this course.</p>
        </div>
        <button type="button" disabled={saving} onClick={() => onSave(selectedIds)} className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save lecturers'}</button>
      </div>
      {lecturers.length ? (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {lecturers.map((lecturer) => (
            <label key={lecturer.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 hover:border-slate-400">
              <input type="checkbox" checked={selectedIds.includes(lecturer.id)} onChange={() => toggle(lecturer.id)} className="h-4 w-4 accent-slate-900" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold text-slate-800">{lecturer.name}</span>
                <span className="block truncate text-[10px] text-slate-500">{lecturer.title || lecturer.department} · {lecturer.email}</span>
              </span>
            </label>
          ))}
        </div>
      ) : <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">No active lecturer accounts with passwords are available to assign. Provision lecturer accounts in People first.</p>}
    </section>
  );
}
function SessionTab({ sessions }: { sessions: RhemaSession[] }) { return <div className="space-y-3"><div className="flex items-center justify-between"><div><h2 className="text-lg font-black text-slate-900">Scheduled sessions</h2><p className="text-xs text-slate-500">Use Edit course to add, remove, or change sessions.</p></div><span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">{sessions.length} total</span></div>{sessions.map((session) => <div key={session.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-mono text-xs font-black text-slate-900">{session.id}</p><p className="mt-2 text-sm font-black text-slate-800">{session.date}</p></div><div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Clock3 size={14} /> {session.start} - {session.end}</div><p className="text-xs text-slate-500">{session.notes || 'No notes'}</p></div>)}</div>; }
function RosterTab({
  courseCohort,
  enrolledStudents,
  availableStudents,
  selectedStudentIds,
  toggleSelectedStudent,
  toggleVisibleStudents,
  isAddingStudents,
  setIsAddingStudents,
  saving,
  onAddSelected,
  onRemoveStudent,
}: {
  courseCohort: string;
  enrolledStudents: RhemaStudent[];
  availableStudents: RhemaStudent[];
  selectedStudentIds: string[];
  toggleSelectedStudent: (id: string) => void;
  toggleVisibleStudents: (ids: string[]) => void;
  isAddingStudents: boolean;
  setIsAddingStudents: (value: boolean) => void;
  saving: boolean;
  onAddSelected: () => void;
  onRemoveStudent: (id: string) => void;
}) {
  const pageSize = 10;
  const [enrolledSearch, setEnrolledSearch] = useState('');
  const [enrolledPage, setEnrolledPage] = useState(1);
  const [studentSearch, setStudentSearch] = useState('');
  const [availablePage, setAvailablePage] = useState(1);
  const filteredEnrolled = useMemo(() => enrolledStudents.filter((student) =>
    `${student.name} ${student.id} ${student.email ?? ''}`.toLowerCase().includes(enrolledSearch.trim().toLowerCase())
  ), [enrolledStudents, enrolledSearch]);
  const filteredAvailable = useMemo(() => availableStudents.filter((student) =>
    `${student.name} ${student.id} ${student.email ?? ''}`.toLowerCase().includes(studentSearch.trim().toLowerCase())
  ), [availableStudents, studentSearch]);
  const enrolledPageCount = Math.max(1, Math.ceil(filteredEnrolled.length / pageSize));
  const availablePageCount = Math.max(1, Math.ceil(filteredAvailable.length / pageSize));
  const currentEnrolledPage = Math.min(enrolledPage, enrolledPageCount);
  const currentAvailablePage = Math.min(availablePage, availablePageCount);
  const visibleEnrolled = filteredEnrolled.slice((currentEnrolledPage - 1) * pageSize, currentEnrolledPage * pageSize);
  const visibleAvailable = filteredAvailable.slice((currentAvailablePage - 1) * pageSize, currentAvailablePage * pageSize);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900">Enrolled students</h2>
            <p className="mt-1 text-xs text-slate-500">{enrolledStudents.length} enrolled · only {courseCohort} students are eligible.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={enrolledSearch} onChange={(event) => { setEnrolledSearch(event.target.value); setEnrolledPage(1); }} placeholder="Search enrolled students" className={`${inputClass} pl-10`} />
            </div>
            <button
              type="button"
              onClick={() => setIsAddingStudents(!isAddingStudents)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white"
            >
              <UserPlus size={15} /> {isAddingStudents ? 'Close student list' : 'Add students'}
            </button>
          </div>
        </div>
        {visibleEnrolled.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <tr><th className="px-5 py-3">Student</th><th className="px-5 py-3">Student ID</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Class</th><th className="px-5 py-3 text-right">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleEnrolled.map((student) => (
                  <tr key={student.id}>
                    <td className="px-5 py-3 font-bold text-slate-800">{student.name}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-600">{student.id}</td>
                    <td className="px-5 py-3 text-xs text-slate-600">{student.email || '—'}</td>
                    <td className="px-5 py-3"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-800">{student.cohort}</span></td>
                    <td className="px-5 py-3 text-right">
                      <button type="button" disabled={saving} onClick={() => onRemoveStudent(student.id)} className="rounded-lg px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <RosterPagination
              page={currentEnrolledPage}
              pageCount={enrolledPageCount}
              total={filteredEnrolled.length}
              pageSize={pageSize}
              onPageChange={setEnrolledPage}
            />
          </div>
        ) : (
          <p className="p-8 text-center text-sm font-semibold text-slate-500">{enrolledStudents.length ? 'No enrolled students match your search.' : 'No students are enrolled in this course yet.'}</p>
        )}
      </section>
      {isAddingStudents && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-black text-slate-900">Add students</h3>
              <p className="mt-1 text-xs text-slate-500">Choose one or more students from {courseCohort}.</p>
            </div>
            <div className="relative sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Search name, ID, or email" className={`${inputClass} pl-10`} />
            </div>
          </div>
          {visibleAvailable.length ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="w-12 px-5 py-3">
                        <input type="checkbox" aria-label="Select all visible students" checked={visibleAvailable.length > 0 && visibleAvailable.every((student) => selectedStudentIds.includes(student.id))} onChange={() => toggleVisibleStudents(visibleAvailable.map((student) => student.id))} className="h-4 w-4 accent-slate-900" />
                      </th>
                      <th className="px-3 py-3">Student</th><th className="px-5 py-3">Student ID</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Class</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleAvailable.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3"><input type="checkbox" checked={selectedStudentIds.includes(student.id)} onChange={() => toggleSelectedStudent(student.id)} aria-label={`Select ${student.name}`} className="h-4 w-4 accent-slate-900" /></td>
                        <td className="px-3 py-3 font-bold text-slate-800">{student.name}</td>
                        <td className="px-5 py-3 font-mono text-xs text-slate-600">{student.id}</td>
                        <td className="px-5 py-3 text-xs text-slate-600">{student.email || '—'}</td>
                        <td className="px-5 py-3"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-800">{student.cohort}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <RosterPagination
                page={currentAvailablePage}
                pageCount={availablePageCount}
                total={filteredAvailable.length}
                pageSize={pageSize}
                onPageChange={setAvailablePage}
              />
              <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold text-slate-500">{selectedStudentIds.length} selected</p>
                <button type="button" disabled={saving || selectedStudentIds.length === 0} onClick={onAddSelected} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
                  <UserPlus size={14} /> {saving ? 'Saving roster…' : `Enroll ${selectedStudentIds.length || ''} student${selectedStudentIds.length === 1 ? '' : 's'}`}
                </button>
              </div>
            </>
          ) : (
            <p className="p-8 text-center text-sm font-semibold text-slate-500">{studentSearch ? 'No eligible students match your search.' : `There are no unenrolled students in ${courseCohort}.`}</p>
          )}
        </section>
      )}
    </div>
  );
}

function RosterPagination({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const firstItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
      <p className="text-xs text-slate-500">Showing {firstItem}–{lastItem} of {total}</p>
      <div className="flex items-center gap-2">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40">Previous</button>
        <span className="text-xs font-semibold text-slate-600">Page {page} of {pageCount}</span>
        <button type="button" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}

function CourseEditor({ course, enrollments, onClose, onSaved }: { course: RhemaSchedule; enrollments: Record<string, string[]>; onClose: () => void; onSaved: (course: RhemaSchedule) => void }) { const [draft, setDraft] = useState(course); const [range, setRange] = useState({ startDate: '', endDate: '', start: '09:00', end: '15:00' }); const [error, setError] = useState(''); const [saving, setSaving] = useState(false); const update = (patch: Partial<RhemaSchedule>) => setDraft((current) => ({ ...current, ...patch })); const updateSession = (id: string, patch: Partial<RhemaSession>) => update({ sessions: draft.sessions.map((session) => session.id === id ? { ...session, ...patch } : session) }); const generate = () => { if (!range.startDate || !range.endDate) return setError('Select both dates before generating sessions.'); const result: RhemaSession[] = []; const cursor = new Date(`${range.startDate}T00:00:00`); const last = new Date(`${range.endDate}T00:00:00`); while (cursor <= last) { if (cursor.getDay() !== 0 && cursor.getDay() !== 6) result.push({ id: `s_${Date.now()}_${result.length}`, date: cursor.toISOString().slice(0, 10), start: range.start, end: range.end, notes: '' }); cursor.setDate(cursor.getDate() + 1); } update({ sessions: [...draft.sessions, ...result] }); setError(''); }; const save = async () => { if (!draft.course.trim() || !draft.cohortName.trim() || draft.cohort < 1) return setError('Course code, cohort name, and a valid cohort number are required.'); setSaving(true); setError(''); try { await syncRhemaSchedules({ schedules: [draft], enrollments }); onSaved(draft); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save course details.'); } finally { setSaving(false); } }; return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600">Course editor</p><h2 className="mt-1 text-2xl font-black text-slate-900">Edit {course.course}</h2></div><button onClick={onClose} aria-label="Close" className="text-slate-400"><X /></button></div>{error && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800">{error}</div>}<div className="mt-6 grid gap-4 sm:grid-cols-3"><Field label="Course code"><input value={draft.course} onChange={(event) => update({ course: event.target.value.toUpperCase() })} className={inputClass} /></Field><Field label="Cohort / class"><input value={draft.cohortName} onChange={(event) => update({ cohortName: event.target.value.toUpperCase() })} className={inputClass} /></Field><Field label="Cohort number"><input type="number" min="1" value={draft.cohort} onChange={(event) => update({ cohort: Number(event.target.value) })} className={inputClass} /></Field></div><Field label="Course description"><textarea rows={4} value={draft.description ?? ''} onChange={(event) => update({ description: event.target.value })} className={inputClass} placeholder="Course outline, outcomes, and learning details" /></Field><div className="mt-7 border-t border-slate-100 pt-5"><div className="flex items-center justify-between"><div><h3 className="font-black text-slate-900">Edit sessions</h3><p className="text-xs text-slate-500">Weekends are skipped when generating a date range.</p></div><button type="button" onClick={() => update({ sessions: [...draft.sessions, newSession()] })} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold"><Plus size={14} /> Single session</button></div><div className="mt-3 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-5"><input type="date" value={range.startDate} onChange={(event) => setRange({ ...range, startDate: event.target.value })} className={inputClass} /><input type="date" value={range.endDate} onChange={(event) => setRange({ ...range, endDate: event.target.value })} className={inputClass} /><input type="time" value={range.start} onChange={(event) => setRange({ ...range, start: event.target.value })} className={inputClass} /><input type="time" value={range.end} onChange={(event) => setRange({ ...range, end: event.target.value })} className={inputClass} /><button type="button" onClick={generate} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white">Generate sessions</button></div></div><div className="mt-5 space-y-2">{draft.sessions.map((session) => <div key={session.id} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_0.7fr_0.7fr_1fr_auto]"><input type="date" value={session.date} onChange={(event) => updateSession(session.id, { date: event.target.value })} className={inputClass} /><input type="time" value={session.start} onChange={(event) => updateSession(session.id, { start: event.target.value })} className={inputClass} /><input type="time" value={session.end} onChange={(event) => updateSession(session.id, { end: event.target.value })} className={inputClass} /><input value={session.notes} onChange={(event) => updateSession(session.id, { notes: event.target.value })} placeholder="Notes" className={inputClass} /><button type="button" onClick={() => update({ sessions: draft.sessions.filter((item) => item.id !== session.id) })} className="rounded-lg p-2 text-red-600" aria-label="Delete session"><Trash2 size={16} /></button></div>)}</div><div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">Cancel</button><button type="button" disabled={saving} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-black text-white disabled:opacity-50"><Check size={14} /> {saving ? 'Saving...' : 'Save changes'}</button></div></div></div>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="text-xs font-bold text-slate-600">{label}<span className="mt-1 block">{children}</span></label>; }