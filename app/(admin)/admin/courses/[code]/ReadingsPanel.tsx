'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { BookOpen, ExternalLink, FileText, Link2, Plus, Save, Trash2, UploadCloud, X } from 'lucide-react';
import { api } from '@/lib/api';
import { courseReadingUrl, type CourseReading } from '@/lib/course-readings';

type ReadingDraft = {
  id?: number;
  title: string;
  session_name: string;
  description: string;
  owner: string;
  external_url: string;
  file_url: string;
  status: 'Draft' | 'Published' | 'Live';
};

const blankDraft = (): ReadingDraft => ({
  title: '',
  session_name: '',
  description: '',
  owner: '',
  external_url: '',
  file_url: '',
  status: 'Draft',
});

export default function ReadingsPanel({ course }: { course: string }) {
  const [readings, setReadings] = useState<CourseReading[]>([]);
  const [draft, setDraft] = useState<ReadingDraft | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const loadReadings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.library.list() as { success?: boolean; message?: string; data?: CourseReading[] };
      if (!response.success || !response.data) throw new Error(response.message ?? 'Unable to load course readings.');
      setReadings(response.data.filter((reading) =>
        reading.course.trim().toLowerCase() === course.trim().toLowerCase()
        && reading.resource_type !== 'Audio'
      ));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to load course readings.');
    } finally {
      setLoading(false);
    }
  }, [course]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadReadings(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadReadings]);

  const openEditor = (reading?: CourseReading) => {
    setFile(null);
    setDraft(reading ? {
      id: reading.id,
      title: reading.title,
      session_name: reading.session_name,
      description: reading.description ?? '',
      owner: reading.owner ?? '',
      external_url: reading.external_url ?? '',
      file_url: reading.file_url ?? '',
      status: reading.status,
    } : blankDraft());
  };

  const saveReading = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft || !draft.title.trim()) return;
    if (!file && !draft.external_url.trim() && !draft.file_url) {
      setNotice('Upload a reading file or enter an external reading link.');
      return;
    }
    setSaving(true);
    setNotice('');
    try {
      let fileUrl = draft.file_url;
      let externalUrl = draft.external_url.trim();
      if (file) {
        const upload = await api.library.upload(file) as { success?: boolean; message?: string; data?: { path?: string } };
        if (!upload.success || !upload.data?.path) throw new Error(upload.message ?? 'The reading file upload did not return a file path.');
        fileUrl = upload.data.path;
        externalUrl = '';
      }
      const response = await api.library.save({
        ...(draft.id ? { id: draft.id } : {}),
        resource_type: externalUrl ? 'Link' : 'Document',
        title: draft.title.trim(),
        course,
        session_name: draft.session_name.trim(),
        description: draft.description.trim(),
        owner: draft.owner.trim(),
        file_url: fileUrl,
        external_url: externalUrl,
        status: draft.status,
      }) as { success?: boolean; message?: string };
      if (!response.success) throw new Error(response.message ?? 'Unable to save the reading.');
      setDraft(null);
      setFile(null);
      setNotice('Course reading saved.');
      await loadReadings();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to save the reading.');
    } finally {
      setSaving(false);
    }
  };

  const deleteReading = async (reading: CourseReading) => {
    if (!window.confirm(`Delete "${reading.title}" from ${course}?`)) return;
    try {
      const response = await api.library.remove(reading.id) as { success?: boolean; message?: string };
      if (!response.success) throw new Error(response.message ?? 'Unable to delete the reading.');
      setReadings((current) => current.filter((item) => item.id !== reading.id));
      setNotice('Course reading deleted.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to delete the reading.');
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900">Course reading list</h2>
          <p className="mt-1 text-xs text-slate-500">Add files or trusted links, group them by session, and publish readings to students.</p>
        </div>
        <button type="button" onClick={() => openEditor()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white">
          <Plus size={15} /> Add reading
        </button>
      </div>

      {notice && <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-800">{notice}</div>}

      {loading ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Loading course readings...</div>
        : readings.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><BookOpen className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-700">No readings added yet.</p><p className="mt-1 text-xs text-slate-500">Add a reading and publish it when it is ready for students.</p></div>
          : <div className="space-y-3">{readings.map((reading) => {
            const href = courseReadingUrl(reading);
            return <article key={reading.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">{reading.resource_type === 'Link' ? <Link2 size={17} /> : <FileText size={17} />}</div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-slate-900">{reading.title}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${reading.status === 'Published' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{reading.status}</span></div>
                  <p className="mt-1 text-xs text-slate-500">{reading.session_name || 'General reading'}{reading.owner ? ` · ${reading.owner}` : ''}</p>
                  {reading.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{reading.description}</p>}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                {href && <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"><ExternalLink size={13} /> Open</a>}
                <button type="button" onClick={() => openEditor(reading)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Edit</button>
                <button type="button" onClick={() => void deleteReading(reading)} aria-label={`Delete ${reading.title}`} className="rounded-lg border border-red-100 p-2 text-red-600"><Trash2 size={14} /></button>
              </div>
            </article>;
          })}</div>}

      {draft && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
        <form onSubmit={saveReading} className="max-h-[92vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">{course}</p><h3 className="mt-1 text-2xl font-black text-slate-900">{draft.id ? 'Edit reading' : 'Add course reading'}</h3></div><button type="button" onClick={() => setDraft(null)} aria-label="Close" className="rounded-full bg-slate-100 p-2 text-slate-500"><X size={16} /></button></div>
          <label className="block text-xs font-bold text-slate-600">Reading title<input required maxLength={255} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold text-slate-600">Session / week<input maxLength={150} value={draft.session_name} onChange={(event) => setDraft({ ...draft, session_name: event.target.value })} placeholder="Week 1 · Introduction" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" /></label>
            <label className="block text-xs font-bold text-slate-600">Author / source<input maxLength={150} value={draft.owner} onChange={(event) => setDraft({ ...draft, owner: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" /></label>
          </div>
          <label className="block text-xs font-bold text-slate-600">Description / reading instructions<textarea rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" /></label>
          <label className="block text-xs font-bold text-slate-600">External reading URL<input type="url" value={draft.external_url} onChange={(event) => setDraft({ ...draft, external_url: event.target.value })} placeholder="https://..." className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" /></label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><input ref={fileInput} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt" className="hidden" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><button type="button" onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700"><UploadCloud size={15} /> Choose reading file</button><span className="ml-2 text-xs text-slate-500">{file?.name ?? (draft.file_url ? 'An uploaded file is attached' : 'No file selected')}</span></div>
            <label className="text-xs font-bold text-slate-600">Visibility<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as ReadingDraft['status'] })} className="ml-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"><option value="Draft">Draft</option><option value="Published">Published to students</option><option value="Live">Live</option></select></label>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setDraft(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white disabled:opacity-60"><Save size={14} /> {saving ? 'Saving...' : 'Save reading'}</button></div>
        </form>
      </div>}
    </section>
  );
}
