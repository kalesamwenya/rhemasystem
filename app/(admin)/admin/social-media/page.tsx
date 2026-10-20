'use client';

import { confirmWithApp } from '@/components/ui/app-dialogs';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays, ChevronLeft, ChevronRight, Clock3, ImagePlus, LoaderCircle,
  Pencil, Plus, Send, Share2, Trash2, Video, X,
} from 'lucide-react';
import { api, assetUrl } from '@/lib/api';

type ContentKind = 'social_post' | 'graphic' | 'video';
type Platform = 'facebook' | 'instagram' | 'both';
type WorkflowStatus = 'draft' | 'in_review' | 'approved' | 'rejected' | 'scheduled' | 'published';
type Post = {
  id: number;
  title: string;
  content_kind: ContentKind;
  platform: Platform;
  caption: string | null;
  task_brief: string | null;
  media_path: string;
  media_type: 'image' | 'video' | null;
  media_paths?: string[];
  assigned_to: string | null;
  scheduled_at: string | null;
  status: WorkflowStatus;
  reviewer_note: string | null;
  created_at: string;
  updated_at: string;
};
type Assignee = { id: string; name: string; department: string };
type ApiList<T> = { data?: T[] };
type Draft = {
  id?: number;
  title: string;
  content_kind: ContentKind;
  platform: Platform;
  caption: string;
  task_brief: string;
  assigned_to: string;
  scheduled_at: string;
  status: Exclude<WorkflowStatus, 'published'>;
  reviewer_note: string;
  media_paths: string[];
  newMedia: { file: File; previewUrl: string }[];
};

const inputClass = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-red-400';
const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const statusLabels: Record<WorkflowStatus, string> = {
  draft: 'Draft',
  in_review: 'In review',
  approved: 'Approved',
  rejected: 'Changes requested',
  scheduled: 'Scheduled',
  published: 'Published',
};
const statusStyles: Record<WorkflowStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  in_review: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800',
  scheduled: 'bg-blue-100 text-blue-800',
  published: 'bg-violet-100 text-violet-800',
};

function dateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function localInputDate(value?: string | null): string {
  if (!value) return '';
  return value.slice(0, 16).replace(' ', 'T');
}

function mediaFileType(file: File): 'image' | 'video' {
  return file.type.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(file.name) ? 'video' : 'image';
}

function isVideoPath(path: string): boolean {
  return /\.(mp4|mov|webm)$/i.test(path);
}

function postMediaPaths(post: Post): string[] {
  return post.media_paths?.length ? post.media_paths : (post.media_path ? [post.media_path] : []);
}

function newDraft(date = new Date()): Draft {
  return {
    title: '',
    content_kind: 'social_post',
    platform: 'both',
    caption: '',
    task_brief: '',
    assigned_to: '',
    scheduled_at: `${dateKey(date)}T09:00`,
    status: 'draft',
    reviewer_note: '',
    media_paths: [],
    newMedia: [],
  };
}

function toDraft(post: Post): Draft {
  const mediaPaths = postMediaPaths(post);
  return {
    id: post.id,
    title: post.title,
    content_kind: post.content_kind,
    platform: post.platform,
    caption: post.caption ?? '',
    task_brief: post.task_brief ?? '',
    assigned_to: post.assigned_to ?? '',
    scheduled_at: localInputDate(post.scheduled_at),
    status: post.status === 'published' ? 'approved' : post.status,
    reviewer_note: post.reviewer_note ?? '',
    media_paths: mediaPaths,
    newMedia: [],
  };
}

function postDay(post: Post): string {
  return post.scheduled_at?.slice(0, 10) ?? post.created_at.slice(0, 10);
}

export default function SocialMediaPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [filter, setFilter] = useState<'all' | 'review' | 'assigned'>('all');
  const [mediaDragActive, setMediaDragActive] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const mediaPreviewUrlsRef = useRef(new Set<string>());

  const loadData = useCallback(async () => {
    setLoading(true);
    const [postsResult, assigneesResult] = await Promise.allSettled([
      api.socialMedia.posts() as Promise<ApiList<Post>>,
      api.socialMedia.assignees() as Promise<ApiList<Assignee>>,
    ]);
    if (postsResult.status === 'fulfilled') {
      setPosts(postsResult.value.data ?? []);
    } else {
      setNotice(postsResult.reason instanceof Error ? postsResult.reason.message : 'Unable to load content calendar.');
    }
    if (assigneesResult.status === 'fulfilled') {
      setAssignees(assigneesResult.value.data ?? []);
    } else {
      setNotice((current) => [current, assigneesResult.reason instanceof Error ? assigneesResult.reason.message : 'Unable to load assignees.'].filter(Boolean).join(' '));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadData(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  useEffect(() => () => {
    mediaPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const filteredPosts = useMemo(() => posts.filter((post) => {
    if (filter === 'review') return post.status === 'in_review';
    if (filter === 'assigned') return Boolean(post.assigned_to);
    return true;
  }), [filter, posts]);

  const calendarDays = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const days = Array.from({ length: 42 }, (_, index) => new Date(first.getFullYear(), first.getMonth(), index - offset + 1));
    return days;
  }, [month]);

  const groupedPosts = useMemo(() => {
    const grouped = new Map<string, Post[]>();
    for (const post of filteredPosts) {
      const key = postDay(post);
      grouped.set(key, [...(grouped.get(key) ?? []), post]);
    }
    return grouped;
  }, [filteredPosts]);

  const openNew = (date = new Date()) => {
    setNotice('');
    setDraft(newDraft(date));
  };

  const saveDraft = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft) return;
    if (!draft.title.trim()) {
      setNotice('Add a title for this post or creative task.');
      return;
    }
    setSaving(true);
    setNotice('');
    try {
      const mediaPaths = [...draft.media_paths];
      for (const media of draft.newMedia) {
        const upload = await api.socialMedia.upload(media.file) as { data?: { path?: string; media_type?: 'image' | 'video' } };
        if (!upload.data?.path || !upload.data.media_type) throw new Error('Media upload did not return a usable file path.');
        mediaPaths.push(upload.data.path);
      }
      const mediaPath = mediaPaths[0] ?? '';
      const mediaType = mediaPath ? (isVideoPath(mediaPath) ? 'video' : 'image') : null;
      const scheduledAt = draft.scheduled_at ? `${draft.scheduled_at.replace('T', ' ')}:00` : '';
      await api.socialMedia.save({
        id: draft.id,
        title: draft.title.trim(),
        content_kind: draft.content_kind,
        platform: draft.platform,
        caption: draft.caption.trim(),
        task_brief: draft.task_brief.trim(),
        media_path: mediaPath,
        media_type: mediaType,
        media_paths: mediaPaths,
        scheduled_at: scheduledAt,
        assigned_to: draft.assigned_to || null,
        status: draft.status,
        reviewer_note: draft.reviewer_note.trim(),
      });
      closeDraft();
      setNotice('Content item saved to the calendar.');
      await loadData();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to save this content item.');
    } finally {
      setSaving(false);
    }
  };

  const deletePost = async (post: Post) => {
    if (!(await confirmWithApp(`Delete "${post.title}" from the content calendar?`, { title: 'Delete calendar post?', confirmText: 'Delete', tone: 'danger' }))) return;
    try {
      await api.socialMedia.remove(post.id);
      setPosts((current) => current.filter((item) => item.id !== post.id));
      setNotice('Content item deleted.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to delete this content item.');
    }
  };

  const setDraftField = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => current ? { ...current, [key]: value } : null);
  };

  const clearMediaPreview = () => {
    draft?.newMedia.forEach((media) => {
      URL.revokeObjectURL(media.previewUrl);
      mediaPreviewUrlsRef.current.delete(media.previewUrl);
    });
  };

  const chooseMediaFiles = (files: FileList | File[]) => {
    const selected = Array.from(files);
    if (!selected.length) return;
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm'];
    const supportedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'mov', 'webm'];
    const unsupported = selected.find((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
      return !supportedTypes.includes(file.type) && !supportedExtensions.includes(extension);
    });
    if (unsupported) {
      setNotice(`${unsupported.name} is not a supported media format. Use JPG, PNG, WEBP, GIF, MP4, MOV, or WEBM.`);
      return;
    }
    const tooLarge = selected.find((file) => file.size > 100 * 1024 * 1024);
    if (tooLarge) {
      setNotice(`${tooLarge.name} is larger than the 100 MB per-file limit.`);
      return;
    }
    const currentMediaTypes = [
      ...(draft?.media_paths ?? []).map((path) => isVideoPath(path) ? 'video' : 'image'),
      ...(draft?.newMedia ?? []).map((media) => mediaFileType(media.file)),
    ];
    const addedTypes = selected.map(mediaFileType);
    const combinedTypes = [...currentMediaTypes, ...addedTypes];
    if (combinedTypes.includes('video') && (combinedTypes.length > 1 || addedTypes.length > 1)) {
      setNotice('Attach multiple images, or one video. Videos cannot be combined with other media.');
      return;
    }
    setNotice('');
    const newMedia = selected.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    newMedia.forEach((media) => mediaPreviewUrlsRef.current.add(media.previewUrl));
    setDraft((current) => current ? { ...current, newMedia: [...current.newMedia, ...newMedia] } : null);
  };

  const removeNewMedia = (previewUrl: string) => {
    URL.revokeObjectURL(previewUrl);
    mediaPreviewUrlsRef.current.delete(previewUrl);
    setDraft((current) => current ? {
      ...current,
      newMedia: current.newMedia.filter((media) => media.previewUrl !== previewUrl),
    } : null);
  };

  const removeSavedMedia = (path: string) => {
    setDraft((current) => current ? {
      ...current,
      media_paths: current.media_paths.filter((mediaPath) => mediaPath !== path),
    } : null);
  };

  const closeDraft = () => {
    clearMediaPreview();
    setDraft(null);
  };

  const monthName = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const reviewCount = posts.filter((post) => post.status === 'in_review').length;

  return (
    <main className="space-y-6 pb-12">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-600">Marketing workspace</p>
          <h1 className="mt-2 flex items-center gap-2 text-3xl font-black tracking-tight text-slate-900"><Share2 className="h-7 w-7 text-red-600" /> Social Media & Content</h1>
          <p className="mt-1 text-sm text-slate-500">Plan posts and creative work, assign owners, attach media, and review content before approval.</p>
        </div>
        <button type="button" onClick={() => openNew()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white"><Plus className="h-4 w-4" /> Create content task</button>
      </header>

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
        <Share2 className="mt-0.5 h-4 w-4 shrink-0" />
        <p><strong>Meta auto-publishing is not connected.</strong> Approved and scheduled items are saved in this calendar. Facebook and Instagram publishing requires Meta app credentials and connected business accounts.</p>
      </div>
      {notice && <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-800">{notice}</div>}

      <section className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Planned content" value={posts.length} />
        <SummaryCard label="Awaiting review" value={reviewCount} highlight />
        <SummaryCard label="Assigned tasks" value={posts.filter((post) => post.assigned_to).length} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><CalendarDays className="h-5 w-5 text-red-600" /><div><h2 className="text-lg font-black text-slate-900">Content calendar</h2><p className="text-xs text-slate-500">Select a date to add a post or production task.</p></div></div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"><option value="all">All items</option><option value="review">Needs review</option><option value="assigned">Assigned tasks</option></select>
            <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-lg border border-slate-200 p-2" aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">Today</button>
            <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-lg border border-slate-200 p-2" aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
            <span className="min-w-32 text-right text-sm font-black text-slate-800">{monthName}</span>
          </div>
        </div>
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">{weekDays.map((day) => <div key={day} className="px-2 py-2 text-center text-[10px] font-black uppercase tracking-wider text-slate-500">{day}</div>)}</div>
        {loading ? <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading content calendar...</div> : <div className="grid grid-cols-7">
          {calendarDays.map((date) => {
            const key = dateKey(date);
            const dayPosts = groupedPosts.get(key) ?? [];
            const currentMonth = date.getMonth() === month.getMonth();
            return <div key={key} className={`min-h-28 border-b border-r border-slate-100 p-1.5 ${currentMonth ? 'bg-white' : 'bg-slate-50/70'}`}>
              <div className="mb-1 flex items-center justify-between"><span className={`text-xs font-bold ${currentMonth ? 'text-slate-700' : 'text-slate-300'}`}>{date.getDate()}</span><button type="button" onClick={() => openNew(date)} className="rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Add content on ${key}`}><Plus className="h-3.5 w-3.5" /></button></div>
              <div className="space-y-1">{dayPosts.slice(0, 3).map((post) => <button key={post.id} type="button" onClick={() => setDraft(toDraft(post))} className="block w-full truncate rounded px-1.5 py-1 text-left text-[9px] font-bold text-slate-700 hover:opacity-80" style={{ backgroundColor: post.status === 'in_review' ? '#fef3c7' : post.status === 'approved' || post.status === 'scheduled' ? '#dbeafe' : '#f1f5f9' }} title={`${post.title} · ${statusLabels[post.status]}`}>{post.scheduled_at ? post.scheduled_at.slice(11, 16) + ' ' : ''}{post.title}</button>)}{dayPosts.length > 3 && <button type="button" onClick={() => setFilter('all')} className="px-1 text-[9px] font-bold text-red-600">+{dayPosts.length - 3} more</button>}</div>
            </div>;
          })}
        </div>}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="text-lg font-black text-slate-900">Content and review queue</h2><span className="text-xs text-slate-500">{filteredPosts.length} item{filteredPosts.length === 1 ? '' : 's'}</span></div>
        {!loading && filteredPosts.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No content items yet. Add a post or production task from the calendar.</div> : <div className="grid gap-3 lg:grid-cols-2">{filteredPosts.map((post) => {
          const assigned = assignees.find((person) => person.id === post.assigned_to);
          const mediaPaths = postMediaPaths(post);
          const firstMediaPath = mediaPaths[0];
          return <article key={post.id} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            {firstMediaPath ? <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-xl bg-slate-100">{isVideoPath(firstMediaPath) ? <video src={assetUrl(firstMediaPath)} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url("${assetUrl(firstMediaPath)}")` }} />}{mediaPaths.length > 1 && <span className="absolute bottom-1 right-1 rounded bg-slate-950/75 px-1.5 py-0.5 text-[9px] font-bold text-white">+{mediaPaths.length - 1}</span>}</div> : <div className="flex h-24 w-28 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">{post.content_kind === 'video' ? <Video /> : <ImagePlus />}</div>}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-black text-slate-900">{post.title}</h3><span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${statusStyles[post.status]}`}>{statusLabels[post.status]}</span></div>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500">{post.task_brief || post.caption || 'No task details added.'}</p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500"><span>{post.platform === 'both' ? 'Facebook + Instagram' : post.platform}</span><span>{post.scheduled_at ? new Date(post.scheduled_at.replace(' ', 'T')).toLocaleString() : 'Date not set'}</span><span>{assigned?.name ?? (post.assigned_to ? 'Assignee unavailable' : 'Unassigned')}</span></div>
              <div className="mt-3 flex gap-2"><button type="button" onClick={() => setDraft(toDraft(post))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-700"><Pencil className="h-3 w-3" /> Review / edit</button><button type="button" onClick={() => void deletePost(post)} className="rounded-lg border border-rose-100 p-1.5 text-rose-600" aria-label={`Delete ${post.title}`}><Trash2 className="h-3.5 w-3.5" /></button></div>
            </div>
          </article>;
        })}</div>}
      </section>

      {draft && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
        <form onSubmit={saveDraft} className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600">{draft.id ? 'Review and edit' : 'Content planning'}</p><h2 className="mt-1 text-2xl font-black text-slate-900">{draft.id ? 'Edit content item' : 'Create content task'}</h2></div><button type="button" onClick={closeDraft} className="rounded-full bg-slate-100 p-2 text-slate-500" aria-label="Close editor"><X className="h-4 w-4" /></button></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-600 sm:col-span-2">Task / post title<input required maxLength={255} value={draft.title} onChange={(event) => setDraftField('title', event.target.value)} className={inputClass} placeholder="e.g. Sunday service highlights" /></label>
            <label className="text-xs font-bold text-slate-600">Content type<select value={draft.content_kind} onChange={(event) => setDraftField('content_kind', event.target.value as ContentKind)} className={inputClass}><option value="social_post">Social media post</option><option value="graphic">Graphic design task</option><option value="video">Video production task</option></select></label>
            <label className="text-xs font-bold text-slate-600">Platform<select value={draft.platform} onChange={(event) => setDraftField('platform', event.target.value as Platform)} className={inputClass}><option value="both">Facebook and Instagram</option><option value="facebook">Facebook</option><option value="instagram">Instagram</option></select></label>
            <label className="text-xs font-bold text-slate-600">Schedule / due date<input type="datetime-local" value={draft.scheduled_at} onChange={(event) => setDraftField('scheduled_at', event.target.value)} className={inputClass} /></label>
            <label className="text-xs font-bold text-slate-600">Assign task to<select value={draft.assigned_to} onChange={(event) => setDraftField('assigned_to', event.target.value)} className={inputClass}><option value="">Unassigned</option>{assignees.map((person) => <option key={person.id} value={person.id}>{person.name}{person.department ? ` · ${person.department}` : ''}</option>)}</select></label>
            <label className="text-xs font-bold text-slate-600">Workflow status<select value={draft.status} onChange={(event) => setDraftField('status', event.target.value as Draft['status'])} className={inputClass}><option value="draft">Draft</option><option value="in_review">Submit for review</option><option value="approved">Approved</option><option value="rejected">Changes requested</option><option value="scheduled">Scheduled</option></select>{draft.status === 'scheduled' && <span className="mt-1 block font-normal text-amber-700">Scheduling here plans the item; it does not publish to Meta automatically.</span>}</label>
            <label className="text-xs font-bold text-slate-600 sm:col-span-2">Post caption / copy<textarea rows={4} maxLength={5000} value={draft.caption} onChange={(event) => setDraftField('caption', event.target.value)} className={inputClass} placeholder="Write the proposed message or creative direction." /></label>
            <label className="text-xs font-bold text-slate-600 sm:col-span-2">Production brief / reviewer notes<textarea rows={3} maxLength={5000} value={draft.task_brief} onChange={(event) => setDraftField('task_brief', event.target.value)} className={inputClass} placeholder="Describe the graphic/video task, requirements, or reviewer edits." /></label>
            {draft.id && <label className="text-xs font-bold text-slate-600 sm:col-span-2">Note to content owner<textarea rows={2} maxLength={5000} value={draft.reviewer_note} onChange={(event) => setDraftField('reviewer_note', event.target.value)} className={inputClass} placeholder="Optional review feedback or requested changes." /></label>}
            <div className="text-xs font-bold text-slate-600 sm:col-span-2">
              <span>Attach images or video</span>
              <div
                onDragOver={(event) => { event.preventDefault(); setMediaDragActive(true); }}
                onDragLeave={(event) => {
                  const target = event.relatedTarget;
                  if (!(target instanceof Node) || !event.currentTarget.contains(target)) setMediaDragActive(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setMediaDragActive(false);
                  chooseMediaFiles(event.dataTransfer.files);
                }}
                className={`mt-1 rounded-2xl border border-dashed p-4 transition-colors ${mediaDragActive ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-slate-50'}`}
              >
                <input
                  ref={mediaInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
                  multiple
                  onChange={(event) => {
                    if (event.currentTarget.files) chooseMediaFiles(event.currentTarget.files);
                    event.currentTarget.value = '';
                  }}
                  className="sr-only"
                  aria-label="Choose images or a video"
                />
                <div className="flex flex-col items-center justify-center py-3 text-center">
                  <ImagePlus className={`h-7 w-7 ${mediaDragActive ? 'text-red-600' : 'text-slate-400'}`} />
                  <p className="mt-2 text-xs font-bold text-slate-700">{mediaDragActive ? 'Drop your media here' : 'Drag and drop images here'}</p>
                  <p className="mt-1 text-[11px] font-normal text-slate-500">Choose multiple images, or one video</p>
                  <button type="button" onClick={() => mediaInputRef.current?.click()} className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700">Choose media</button>
                </div>
                {(draft.media_paths.length > 0 || draft.newMedia.length > 0) && (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {draft.media_paths.map((path) => (
                      <div key={`saved-${path}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <div className="h-28 bg-slate-200">
                          {isVideoPath(path)
                            ? <video src={assetUrl(path)} controls className="h-full w-full object-contain" />
                            : <div role="img" aria-label="Attached image preview" className="h-full w-full bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${assetUrl(path)}")` }} />}
                        </div>
                        <button type="button" onClick={() => removeSavedMedia(path)} className="flex w-full items-center justify-center gap-1 px-2 py-2 text-[10px] font-bold text-rose-700"><X className="h-3.5 w-3.5" /> Remove</button>
                      </div>
                    ))}
                    {draft.newMedia.map((media) => (
                      <div key={media.previewUrl} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <div className="h-28 bg-slate-200">
                          {mediaFileType(media.file) === 'video'
                            ? <video src={media.previewUrl} controls className="h-full w-full object-contain" />
                            : <div role="img" aria-label={media.file.name} className="h-full w-full bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${media.previewUrl}")` }} />}
                        </div>
                        <p className="truncate px-2 pt-2 text-center text-[10px] font-medium text-slate-600">{media.file.name}</p>
                        <button type="button" onClick={() => removeNewMedia(media.previewUrl)} className="flex w-full items-center justify-center gap-1 px-2 py-2 text-[10px] font-bold text-rose-700"><X className="h-3.5 w-3.5" /> Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <span className="mt-1 block font-normal text-slate-400">Images: JPG, PNG, WEBP, GIF. Video: MP4, MOV, WEBM (one video only). Maximum 100 MB per file.</span>
            </div>
            {draft.reviewer_note && <p className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-900 sm:col-span-2">Reviewer note: {draft.reviewer_note}</p>}
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={closeDraft} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">Cancel</button><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-black text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : draft.status === 'in_review' ? <Send className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}{saving ? 'Saving...' : draft.id ? 'Save review and edits' : 'Save to calendar'}</button></div>
        </form>
      </div>}
    </main>
  );
}

function SummaryCard({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</p><p className={`mt-2 text-2xl font-black ${highlight ? 'text-amber-600' : 'text-slate-900'}`}>{value}</p></div>;
}
