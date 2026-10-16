'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, FileText, Headphones, Link2, Pencil, Plus, Search, Trash2, UploadCloud, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAdminAudioPlayer, type AdminAudioTrack } from '@/components/admin/AdminAudioPlayer';

type ResourceType = 'Document' | 'Link' | 'Audio';
type ResourceStatus = 'Draft' | 'Published' | 'Live';
type SessionOption = { id: string; date: string; start: string; end: string; notes: string };
type CourseOption = {
  id: string;
  name: string;
  cohort: string;
  moodle_course_id: number | null;
  sessions: SessionOption[];
};
type CourseResponse = {
  id: string;
  course: string;
  cohortName?: string;
  sessions?: SessionOption[];
};
type MoodleMappingResponse = {
  id: string;
  moodle_course_id: number | null;
};
type LibraryResource = {
  id: number;
  audio_id?: number;
  resource_type: ResourceType;
  title: string;
  course: string;
  course_title?: string;
  cohort_name?: string;
  session_id?: string | null;
  session_name: string;
  session_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  description?: string;
  owner?: string;
  file_url?: string;
  external_url?: string;
  price?: number;
  currency?: string;
  duration_seconds?: number;
  required_for_absence?: boolean | number;
  status: ResourceStatus;
  created_at?: string;
};
type ResourceDraft = {
  key: string;
  resourceId?: number;
  audioId?: number;
  resource_type: ResourceType;
  title: string;
  courseId: string;
  sessionId: string;
  description: string;
  owner: string;
  url: string;
  filePath: string;
  file: File | null;
  price: string;
  currency: string;
  durationSeconds: string;
  requiredForAbsence: boolean;
  status: ResourceStatus;
};
type ApiList<T> = { data?: T[] };

const typeStyles: Record<ResourceType, string> = { Document: 'bg-sky-100 text-sky-700', Link: 'bg-violet-100 text-violet-700', Audio: 'bg-amber-100 text-amber-700' };
const typeIcons: Record<ResourceType, typeof FileText> = { Document: FileText, Link: Link2, Audio: Headphones };

function newDraft(type: ResourceType = 'Document'): ResourceDraft {
  return {
    key: crypto.randomUUID(),
    resource_type: type,
    title: '',
    courseId: '',
    sessionId: '',
    description: '',
    owner: '',
    url: '',
    filePath: '',
    file: null,
    price: '0',
    currency: 'ZMW',
    durationSeconds: '0',
    requiredForAbsence: type === 'Audio',
    status: 'Draft',
  };
}

function sessionLabel(session: SessionOption): string {
  const time = `${session.start.slice(0, 5)}–${session.end.slice(0, 5)}`;
  return `${session.date} · ${time}${session.notes ? ` · ${session.notes}` : ''}`;
}

function fileTitle(file: File): string {
  return file.name.replace(/\.[^.]+$/, '');
}

function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio');
    const objectUrl = URL.createObjectURL(file);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        resolve(Math.round(audio.duration));
      } else {
        reject(new Error(`Could not read the duration from "${file.name}".`));
      }
    };
    audio.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Could not read the duration from "${file.name}". Choose a supported audio file.`));
    };
    audio.src = objectUrl;
  });
}

function getDraftTitle(draft: ResourceDraft): string {
  if (draft.file) return fileTitle(draft.file);
  if (draft.title.trim()) return draft.title.trim();
  if (draft.resource_type === 'Link' && draft.url.trim()) {
    try {
      const url = new URL(draft.url.trim());
      return url.pathname.split('/').filter(Boolean).pop() || url.hostname;
    } catch {
      return draft.url.trim();
    }
  }
  return '';
}

function mapAudioStatus(status: string): ResourceStatus {
  if (status === 'published') return 'Published';
  if (status === 'archived') return 'Draft';
  return 'Draft';
}

export default function LibraryList() {
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [drafts, setDrafts] = useState<ResourceDraft[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [audioDragActive, setAudioDragActive] = useState(false);
  const { setPlaylist, playTrack } = useAdminAudioPlayer();
  const itemsPerPage = 8;

  useEffect(() => {
    const tracks: AdminAudioTrack[] = resources
      .filter((resource) => resource.resource_type === 'Audio' && resource.file_url)
      .map((resource) => ({
        id: resource.audio_id ?? resource.id,
        title: resource.title,
        url: resource.file_url!,
        course: resource.course_title ?? resource.course,
        session: resource.session_name || 'Session not assigned',
      }));
    setPlaylist(tracks);
  }, [resources, setPlaylist]);

  const loadResources = async () => {
    setLoading(true);
    try {
      const [coursesResult, mappingsResult, libraryResult, audioResult] = await Promise.allSettled([
        api.courses.list() as Promise<ApiList<CourseResponse>>,
        api.library.resourceOptions() as Promise<ApiList<MoodleMappingResponse>>,
        api.library.list() as Promise<ApiList<LibraryResource>>,
        api.audio.resources() as Promise<ApiList<Record<string, unknown>>>,
      ]);
      const courseRows = coursesResult.status === 'fulfilled' ? coursesResult.value.data ?? [] : [];
      const mappings = mappingsResult.status === 'fulfilled' ? mappingsResult.value.data ?? [] : [];
      const courseOptions: CourseOption[] = courseRows.map((course) => ({
        id: String(course.id),
        name: course.course,
        cohort: course.cohortName ?? '',
        moodle_course_id: mappings.find((mapping) => String(mapping.id) === String(course.id))?.moodle_course_id ?? null,
        sessions: (course.sessions ?? []).map((session) => ({
          id: String(session.id),
          date: session.date,
          start: session.start,
          end: session.end,
          notes: session.notes ?? '',
        })),
      }));
      setCourses(courseOptions);
      const materials = libraryResult.status === 'fulfilled' ? libraryResult.value.data ?? [] : [];
      const audioResources: LibraryResource[] = (audioResult.status === 'fulfilled' ? audioResult.value.data ?? [] : []).map((audio) => {
        const audioId = Number(audio.id);
        const moodleCourseId = Number(audio.moodle_course_id);
        const course = courseOptions.find((item) => item.moodle_course_id === moodleCourseId);
        const sessionId = String(audio.rhema_session_id ?? '');
        const session = course?.sessions.find((item) => item.id === sessionId);
        return {
          id: -audioId,
          audio_id: audioId,
          resource_type: 'Audio',
          title: String(audio.title ?? ''),
          course: course?.id ?? '',
          course_title: course?.name ?? `Moodle course ${moodleCourseId}`,
          cohort_name: course?.cohort ?? '',
          session_id: sessionId,
          session_name: session ? sessionLabel(session) : 'Session not assigned',
          session_date: session?.date ?? null,
          start_time: session?.start ?? null,
          end_time: session?.end ?? null,
          description: String(audio.description ?? ''),
          file_url: String(audio.audio_url ?? ''),
          price: Number(audio.price) || 0,
          currency: String(audio.currency ?? 'ZMW'),
          duration_seconds: Number(audio.duration_seconds) || 0,
          required_for_absence: audio.required_for_absence === true || audio.required_for_absence === 1 || audio.required_for_absence === '1',
          status: mapAudioStatus(String(audio.status ?? 'draft')),
          created_at: String(audio.created_at ?? ''),
        };
      });
      setResources([...materials, ...audioResources].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')));
      const failures = [
        coursesResult.status === 'rejected' ? `Courses and sessions could not be fetched: ${coursesResult.reason instanceof Error ? coursesResult.reason.message : 'request failed'}` : '',
        mappingsResult.status === 'rejected' ? `Audio course mappings could not be fetched: ${mappingsResult.reason instanceof Error ? mappingsResult.reason.message : 'request failed'}` : '',
        libraryResult.status === 'rejected' ? `Library resources could not be fetched: ${libraryResult.reason instanceof Error ? libraryResult.reason.message : 'request failed'}` : '',
        audioResult.status === 'rejected' ? `Session audio could not be fetched: ${audioResult.reason instanceof Error ? audioResult.reason.message : 'request failed'}` : '',
      ].filter(Boolean);
      setNotice(failures.join(' ') || (courseOptions.length === 0 ? 'No courses or sessions were returned. Add courses and schedule sessions before attaching resources.' : ''));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to load library resources.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadResources(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filteredResources = useMemo(() => resources.filter((item) => {
    const term = search.trim().toLowerCase();
    return (typeFilter === 'All' || item.resource_type === typeFilter)
      && (statusFilter === 'All' || item.status === statusFilter)
      && (!term || `${item.title} ${item.course_title ?? item.course} ${item.session_name} ${item.owner ?? ''}`.toLowerCase().includes(term));
  }), [resources, search, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredResources.length / itemsPerPage));
  const visiblePage = Math.min(currentPage, totalPages);
  const paginatedResources = filteredResources.slice((visiblePage - 1) * itemsPerPage, visiblePage * itemsPerPage);

  const openCreate = () => {
    setNotice('');
    setDrafts([newDraft()]);
  };

  const openEdit = (resource: LibraryResource) => {
    const course = courses.find((item) => item.id === resource.course)
      ?? courses.find((item) => item.name === (resource.course_title ?? resource.course));
    setNotice('');
    setDrafts([{
      ...newDraft(resource.resource_type),
      key: String(resource.id),
      resourceId: resource.audio_id ? undefined : resource.id,
      audioId: resource.audio_id,
      title: resource.title,
      courseId: course?.id ?? '',
      sessionId: resource.session_id ?? '',
      description: resource.description ?? '',
      owner: resource.owner ?? '',
      url: resource.resource_type === 'Link' ? resource.external_url ?? '' : '',
      filePath: resource.resource_type === 'Link' ? '' : resource.file_url ?? '',
      price: String(resource.price ?? 0),
      currency: resource.currency ?? 'ZMW',
      durationSeconds: String(resource.duration_seconds ?? 0),
      requiredForAbsence: Boolean(resource.required_for_absence),
      status: resource.status,
    }]);
  };

  const updateDraft = (key: string, update: Partial<ResourceDraft>) => {
    setDrafts((current) => current?.map((draft) => draft.key === key ? { ...draft, ...update } : draft) ?? null);
  };

  const addSelectedFiles = (files: FileList | null, type: ResourceType) => {
    const selectedFiles = Array.from(files ?? []).filter((file) => {
      if (type !== 'Audio') return true;
      const extension = file.name.split('.').pop()?.toLowerCase();
      const supported = file.type.startsWith('audio/') || ['mp3', 'wav', 'm4a', 'ogg'].includes(extension ?? '');
      if (!supported) setNotice(`"${file.name}" is not a supported audio file.`);
      return supported;
    });
    if (!selectedFiles.length) return;
    setDrafts((current) => [
      ...(current ?? []),
      ...selectedFiles.map((file) => ({ ...newDraft(type), title: fileTitle(file), file })),
    ]);
    if (type === 'Audio') {
      void Promise.all(selectedFiles.map(async (file) => ({ file, durationSeconds: await getAudioDuration(file) })))
        .then((audioFiles) => {
          setDrafts((current) => current?.map((draft) => {
            const metadata = audioFiles.find(({ file }) => draft.file === file);
            return metadata ? { ...draft, durationSeconds: String(metadata.durationSeconds) } : draft;
          }) ?? null);
        })
        .catch((error: unknown) => setNotice(error instanceof Error ? error.message : 'Unable to read audio file metadata.'));
    }
  };

  const saveResources = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!drafts?.length) return;
    const incomplete = drafts.find((draft) =>
      !getDraftTitle(draft) || !draft.courseId || !draft.sessionId
      || (draft.resource_type === 'Link' && !draft.url.trim())
      || ((draft.resource_type === 'Document' || draft.resource_type === 'Audio') && !draft.file && !draft.filePath)
      || (draft.resource_type === 'Audio' && !courses.find((course) => course.id === draft.courseId)?.moodle_course_id)
    );
    if (incomplete) {
      setNotice('Each item needs a course and session. Select a file for documents and audio, or provide a URL for links. Session audio also requires the course to be connected to Moodle.');
      return;
    }
    setSaving(true);
    setNotice('');
    try {
      for (const draft of drafts) {
        const title = getDraftTitle(draft);
        let fileUrl = draft.url.trim() || draft.filePath;
        if (draft.file) {
          const upload = await api.library.upload(draft.file) as { data?: { path?: string } };
          if (!upload.data?.path) throw new Error(`The upload for "${draft.title}" did not return a file path.`);
          fileUrl = upload.data.path;
        }
        const durationSeconds = draft.file && draft.resource_type === 'Audio'
          ? await getAudioDuration(draft.file)
          : Number(draft.durationSeconds) || 0;
        const course = courses.find((item) => item.id === draft.courseId);
        const session = course?.sessions.find((item) => item.id === draft.sessionId);
        if (!course || !session) throw new Error(`The selected course or session for "${title}" is no longer available.`);
        if (draft.resource_type === 'Audio') {
          const audioData = {
            ...(draft.audioId ? { id: draft.audioId } : {}),
            moodle_course_id: course.moodle_course_id,
            rhema_session_id: session.id,
            title,
            audio_url: fileUrl,
            duration_seconds: durationSeconds,
            price: Number(draft.price) || 0,
            currency: draft.currency.trim().toUpperCase() || 'ZMW',
            required_for_absence: draft.requiredForAbsence ? 1 : 0,
            status: draft.status === 'Published' || draft.status === 'Live' ? 'published' : 'draft',
          };
          await api.audio.saveResource(audioData);
        } else {
          await api.library.save({
            ...(draft.resourceId ? { id: draft.resourceId } : {}),
            resource_type: draft.resource_type,
            title,
            course: course.id,
            session_id: session.id,
            file_url: draft.resource_type === 'Link' ? '' : fileUrl,
            external_url: draft.resource_type === 'Link' ? fileUrl : '',
            status: draft.status,
          });
        }
      }
      const count = drafts.length;
      setDrafts(null);
      setNotice(`${count} resource${count === 1 ? '' : 's'} saved with the selected course and session.`);
      await loadResources();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to save library resources.');
    } finally {
      setSaving(false);
    }
  };

  const deleteResource = async (resource: LibraryResource) => {
    if (!window.confirm(`Delete ${resource.title}?`)) return;
    try {
      if (resource.audio_id) await api.audio.removeResource(resource.audio_id);
      else await api.library.remove(resource.id);
      setResources((current) => current.filter((item) => item.id !== resource.id));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to delete resource.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-600">Academic repository</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Resource Center</h1><p className="mt-1 text-sm text-slate-500">Attach documents, links, and session audio to a selected course and class session.</p></div>
        <button type="button" onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white hover:bg-slate-800"><Plus className="h-4 w-4" /> Add resources</button>
      </header>
      {notice && <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-800">{notice}</div>}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); }} placeholder="Search title, course, or session" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-red-400 focus:bg-white" /></div>
        <select value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setCurrentPage(1); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"><option value="All">All types</option><option value="Document">Documents</option><option value="Link">Links</option><option value="Audio">Audio</option></select>
        <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setCurrentPage(1); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"><option value="All">All statuses</option><option value="Draft">Draft</option><option value="Published">Published</option><option value="Live">Live</option></select>
      </div>

      {loading ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">Loading library resources...</div> : !paginatedResources.length ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><BookOpen className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-600">No resources match these filters.</p></div> : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{paginatedResources.map((resource) => { const Icon = typeIcons[resource.resource_type] ?? BookOpen; return <article key={`${resource.resource_type}-${resource.id}`} className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300"><div><div className="mb-4 flex items-center justify-between"><Icon className="h-6 w-6 text-slate-400" /><span className={`rounded-md px-2 py-0.5 text-[9px] font-bold ${typeStyles[resource.resource_type]}`}>{resource.resource_type}</span></div><h2 className="text-sm font-black text-slate-900">{resource.title}</h2><p className="mt-1 text-xs font-semibold text-slate-500">{resource.course_title ?? resource.course}</p><p className="mt-1 text-[11px] text-slate-400">{resource.session_date ? `${resource.session_date} · ${(resource.start_time ?? '').slice(0, 5)}–${(resource.end_time ?? '').slice(0, 5)}` : resource.session_name || 'No session assigned'}</p>{resource.resource_type === 'Audio' && resource.file_url && <button type="button" onClick={() => playTrack({ id: resource.audio_id ?? resource.id, title: resource.title, url: resource.file_url!, course: resource.course_title ?? resource.course, session: resource.session_name || 'Session not assigned' })} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"><Headphones className="h-4 w-4" /> Play audio</button>}<div className="mt-4 flex items-center justify-between"><span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">{resource.status}</span><span className="text-[10px] font-mono text-slate-400">#{resource.audio_id ?? resource.id}</span></div></div><div className="mt-4 flex gap-2"><button type="button" onClick={() => openEdit(resource)} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 py-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50"><Pencil className="h-3 w-3" /> Edit</button><button type="button" onClick={() => deleteResource(resource)} aria-label={`Delete ${resource.title}`} className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-3 w-3" /></button></div></article>; })}</div>}

      <div className="flex items-center justify-center gap-3"><button type="button" disabled={visiblePage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} className="rounded-xl border border-slate-200 p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><span className="text-xs font-bold text-slate-500">Page {visiblePage} of {totalPages}</span><button type="button" disabled={visiblePage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} className="rounded-xl border border-slate-200 p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div>

      {drafts && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"><form onSubmit={saveResources} className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600">Resource editor</p><h2 className="mt-1 text-2xl font-black text-slate-900">{drafts[0]?.audioId ? 'Edit resource' : 'Add multiple resources'}</h2><p className="mt-1 text-sm text-slate-500">Choose the course and exact session for every item before attaching its file or link.</p></div><button type="button" onClick={() => setDrafts(null)} className="rounded-full bg-slate-100 p-2 text-slate-500" aria-label="Close editor"><X className="h-4 w-4" /></button></div>
        {!courses.length && <div role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">Courses and sessions are not available. <button type="button" onClick={() => void loadResources()} className="ml-1 underline">Fetch again</button></div>}
        <div className="mt-5 flex flex-wrap gap-2">
          {(['Document', 'Link', 'Audio'] as ResourceType[]).map((type) => <button key={type} type="button" onClick={() => setDrafts((current) => [...(current ?? []), newDraft(type)])} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Plus className="h-3.5 w-3.5" /> Add {type.toLowerCase()}</button>)}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><UploadCloud className="h-3.5 w-3.5" /> Add multiple documents<input type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.txt" onChange={(event) => { addSelectedFiles(event.target.files, 'Document'); event.currentTarget.value = ''; }} className="sr-only" /></label>
          <div
            onDragEnter={(event) => { event.preventDefault(); setAudioDragActive(true); }}
            onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; }}
            onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setAudioDragActive(false); }}
            onDrop={(event) => { event.preventDefault(); setAudioDragActive(false); addSelectedFiles(event.dataTransfer.files, 'Audio'); }}
            className={`rounded-lg border border-dashed px-3 py-2 text-xs font-bold transition ${audioDragActive ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
          >
            <label className="inline-flex cursor-pointer items-center gap-2"><Headphones className="h-3.5 w-3.5" /> Drop multiple audio files here or browse<input type="file" multiple accept="audio/*,.mp3,.wav,.m4a,.ogg" onChange={(event) => { addSelectedFiles(event.target.files, 'Audio'); event.currentTarget.value = ''; }} className="sr-only" /></label>
          </div>
        </div>
        <div className="mt-4 space-y-4">
          {drafts.map((draft, index) => {
            const selectedCourse = courses.find((course) => course.id === draft.courseId);
            return <section key={draft.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-black text-slate-800">{draft.resource_type} {index + 1}</h3>{drafts.length > 1 && <button type="button" onClick={() => setDrafts((current) => current?.filter((item) => item.key !== draft.key) ?? null)} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50" aria-label={`Remove ${draft.resource_type.toLowerCase()} ${index + 1}`}><X className="h-4 w-4" /></button>}</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-600">Type<select value={draft.resource_type} onChange={(event) => updateDraft(draft.key, { resource_type: event.target.value as ResourceType, file: null, requiredForAbsence: event.target.value === 'Audio' })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">{(['Document', 'Link', 'Audio'] as ResourceType[]).map((type) => <option key={type}>{type}</option>)}</select></label>
                <label className="text-xs font-bold text-slate-600">Status<select value={draft.status} onChange={(event) => updateDraft(draft.key, { status: event.target.value as ResourceStatus })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">{(['Draft', 'Published', 'Live'] as ResourceStatus[]).map((status) => <option key={status}>{status}</option>)}</select></label>
                <label className="text-xs font-bold text-slate-600">Course<select required value={draft.courseId} onChange={(event) => updateDraft(draft.key, { courseId: event.target.value, sessionId: '' })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">Select a course</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.name} · {course.cohort}</option>)}</select></label>
                <label className="text-xs font-bold text-slate-600">Session<select required value={draft.sessionId} onChange={(event) => updateDraft(draft.key, { sessionId: event.target.value })} disabled={!selectedCourse} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm disabled:bg-slate-100"><option value="">Select a session</option>{selectedCourse?.sessions.map((session) => <option key={session.id} value={session.id}>{sessionLabel(session)}</option>)}</select>{selectedCourse && !selectedCourse.sessions.length && <span className="mt-1 block text-[11px] font-medium text-amber-700">This course has no scheduled sessions.</span>}</label>
                {draft.resource_type === 'Link' ? <label className="text-xs font-bold text-slate-600 sm:col-span-2">Resource URL<input required type="url" value={draft.url} onChange={(event) => updateDraft(draft.key, { url: event.target.value })} placeholder="https://..." className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" /></label> : <>
                  <label className="text-xs font-bold text-slate-600 sm:col-span-2">{draft.resource_type} file<input type="file" accept={draft.resource_type === 'Audio' ? 'audio/*,.mp3,.wav,.m4a,.ogg' : '.pdf,.doc,.docx,.ppt,.pptx,.txt'} onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (!file) return;
                    updateDraft(draft.key, { file, title: fileTitle(file) });
                    if (draft.resource_type === 'Audio') {
                      void getAudioDuration(file)
                        .then((duration) => updateDraft(draft.key, { durationSeconds: String(duration) }))
                        .catch((error: unknown) => setNotice(error instanceof Error ? error.message : 'Unable to read audio file metadata.'));
                    }
                  }} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />{draft.file && <span className="mt-1 block text-[11px] text-slate-500">Selected: {draft.file.name}</span>}</label>
                  {draft.filePath && !draft.file && <p className="text-[11px] text-slate-500 sm:col-span-2">Current file: {draft.filePath}</p>}
                </>}
                {draft.resource_type === 'Audio' && <>
                  <label className="text-xs font-bold text-slate-600">Price<input required type="number" min="0" step="0.01" value={draft.price} onChange={(event) => updateDraft(draft.key, { price: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" /></label>
                  <label className="text-xs font-bold text-slate-600">Currency<input required maxLength={3} value={draft.currency} onChange={(event) => updateDraft(draft.key, { currency: event.target.value.toUpperCase() })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" /></label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 sm:col-span-2"><input type="checkbox" checked={draft.requiredForAbsence} onChange={(event) => updateDraft(draft.key, { requiredForAbsence: event.target.checked })} /> Required for an absence</label>
                  {!selectedCourse?.moodle_course_id && <p className="text-xs text-amber-800 sm:col-span-2">This course needs a Moodle course mapping before session audio can be added.</p>}
                </>}
              </div>
            </section>;
          })}
        </div>
        <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setDrafts(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">Cancel</button><button type="submit" disabled={saving || drafts.length === 0} className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-black text-white disabled:opacity-50">{saving ? 'Saving resources...' : `Save ${drafts.length} resource${drafts.length === 1 ? '' : 's'}`}</button></div>
      </form></div>}
    </div>
  );
}
