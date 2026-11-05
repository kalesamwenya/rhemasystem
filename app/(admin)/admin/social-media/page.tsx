'use client';

import { confirmWithApp } from '@/components/ui/app-dialogs';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpDown, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp,
  Clock3, Eye, ImagePlus, LoaderCircle, Pencil, Plus, Search, Send, Share2,
  Trash2, X,
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
  facebook_post_id: string | null;
  instagram_media_id: string | null;
  publish_error: string | null;
  publish_attempts: number;
  created_at: string;
  updated_at: string;
};
type Assignee = { id: string; name: string; department: string };
type ApiList<T> = { data?: T[]; meta_configured?: { facebook: boolean; instagram: boolean } };
type DraftMedia =
  | { kind: 'saved'; path: string }
  | { kind: 'new'; file: File; previewUrl: string };
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
  media: DraftMedia[];
};
type QueueSortKey = 'title' | 'status' | 'platform' | 'scheduled_at' | 'assigned_to';

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
    media: [],
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
    media: mediaPaths.map((path) => ({ kind: 'saved', path })),
  };
}

function postDay(post: Post): string {
  return post.scheduled_at?.slice(0, 10) ?? post.created_at.slice(0, 10);
}

export default function SocialMediaPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [metaConfigured, setMetaConfigured] = useState<{ facebook: boolean; instagram: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [retryingPostId, setRetryingPostId] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [filter, setFilter] = useState<'all' | 'review' | 'assigned'>('all');
  const [activeTab, setActiveTab] = useState<'calendar' | 'queue'>('calendar');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [queueSearch, setQueueSearch] = useState('');
  const [queueStatus, setQueueStatus] = useState<'all' | WorkflowStatus>('all');
  const [queuePlatform, setQueuePlatform] = useState<'all' | Platform>('all');
  const [queueAssignee, setQueueAssignee] = useState('all');
  const [queueSort, setQueueSort] = useState<{ key: QueueSortKey; direction: 'asc' | 'desc' }>({ key: 'scheduled_at', direction: 'desc' });
  const [queuePage, setQueuePage] = useState(1);
  const [queuePageSize, setQueuePageSize] = useState(10);
  const [mediaDragActive, setMediaDragActive] = useState(false);
  const [draggedMediaIndex, setDraggedMediaIndex] = useState<number | null>(null);
  const [mediaDropIndex, setMediaDropIndex] = useState<number | null>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const publishNowButtonRef = useRef<HTMLButtonElement>(null);
  const mediaPreviewUrlsRef = useRef(new Set<string>());

  const loadData = useCallback(async () => {
    setLoading(true);
    setQueuePage(1);
    const [postsResult, assigneesResult] = await Promise.allSettled([
      api.socialMedia.posts() as Promise<ApiList<Post>>,
      api.socialMedia.assignees() as Promise<ApiList<Assignee>>,
    ]);
    if (postsResult.status === 'fulfilled') {
      setPosts(postsResult.value.data ?? []);
      setMetaConfigured(postsResult.value.meta_configured ?? null);
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

  const queuePosts = useMemo(() => {
    const query = queueSearch.trim().toLowerCase();
    const visiblePosts = posts.filter((post) => {
      if (queueStatus !== 'all' && post.status !== queueStatus) return false;
      if (queuePlatform !== 'all' && post.platform !== queuePlatform) return false;
      if (queueAssignee !== 'all' && (post.assigned_to ?? '') !== queueAssignee) return false;
      if (!query) return true;
      return [post.title, post.caption, post.task_brief, post.reviewer_note]
        .some((value) => value?.toLowerCase().includes(query));
    });
    const direction = queueSort.direction === 'asc' ? 1 : -1;
    return visiblePosts.sort((a, b) => {
      let left = '';
      let right = '';
      if (queueSort.key === 'assigned_to') {
        left = assignees.find((person) => person.id === a.assigned_to)?.name ?? (a.assigned_to ? 'Unavailable' : 'Unassigned');
        right = assignees.find((person) => person.id === b.assigned_to)?.name ?? (b.assigned_to ? 'Unavailable' : 'Unassigned');
      } else if (queueSort.key === 'scheduled_at') {
        left = a.scheduled_at ?? a.created_at;
        right = b.scheduled_at ?? b.created_at;
      } else if (queueSort.key === 'status') {
        left = statusLabels[a.status];
        right = statusLabels[b.status];
      } else {
        left = a[queueSort.key];
        right = b[queueSort.key];
      }
      return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }) * direction;
    });
  }, [assignees, posts, queueAssignee, queuePlatform, queueSearch, queueSort, queueStatus]);

  const queuePageCount = Math.max(1, Math.ceil(queuePosts.length / queuePageSize));
  const visibleQueuePosts = queuePosts.slice((queuePage - 1) * queuePageSize, queuePage * queuePageSize);
  const selectedPostMedia = selectedPost ? postMediaPaths(selectedPost) : [];
  const selectedMediaPath = selectedPostMedia[selectedMediaIndex];

  const openPostDetails = (post: Post) => {
    setSelectedMediaIndex(0);
    setSelectedPost(post);
  };

  const toggleQueueSort = (key: QueueSortKey) => {
    setQueueSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
    setQueuePage(1);
  };

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

  const saveDraft = async (event: React.FormEvent<HTMLFormElement>, publishImmediately = false) => {
    event.preventDefault();
    if (!draft) return;
    if (!draft.title.trim()) {
      setNotice('Add a title for this post or creative task.');
      return;
    }
    setSaving(true);
    setNotice('');
    let wasSaved = false;
    try {
      const mediaPaths: string[] = [];
      for (const media of draft.media) {
        if (media.kind === 'saved') {
          mediaPaths.push(media.path);
          continue;
        }
        const upload = await api.socialMedia.upload(media.file) as { data?: { path?: string; media_type?: 'image' | 'video' } };
        if (!upload.data?.path || !upload.data.media_type) throw new Error('Media upload did not return a usable file path.');
        mediaPaths.push(upload.data.path);
      }
      const mediaPath = mediaPaths[0] ?? '';
      const mediaType = mediaPath ? (isVideoPath(mediaPath) ? 'video' : 'image') : null;
      const scheduledAt = draft.scheduled_at ? `${draft.scheduled_at.replace('T', ' ')}:00` : '';
      const saved = await api.socialMedia.save({
        id: draft.id,
        title: draft.title.trim(),
        content_kind: draft.content_kind,
        platform: draft.platform,
        caption: draft.caption.trim(),
        task_brief: draft.task_brief.trim(),
        media_path: mediaPath,
        media_type: mediaType,
        media_paths: mediaPaths,
        scheduled_at: publishImmediately ? '' : scheduledAt,
        assigned_to: draft.assigned_to || null,
        status: publishImmediately ? 'approved' : draft.status,
        reviewer_note: draft.reviewer_note.trim(),
      }) as { data?: { id?: number } };
      wasSaved = true;
      if (publishImmediately) {
        const postId = saved.data?.id ?? draft.id;
        if (!postId) throw new Error('The saved post did not return an ID for immediate publishing.');
        await api.socialMedia.publishNow(postId);
      }
      closeDraft();
      setNotice(publishImmediately
        ? `"${draft.title}" was published successfully.`
        : draft.status === 'approved' && draft.scheduled_at
        ? 'Post approved and queued. It will publish automatically when its scheduled time arrives.'
        : 'Content item saved to the calendar.');
      await loadData();
    } catch (error) {
      if (publishImmediately && wasSaved) {
        closeDraft();
        await loadData();
      }
      setNotice(error instanceof Error ? error.message : 'Unable to save this content item.');
    } finally {
      setSaving(false);
    }
  };

  const handleDraftSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    void saveDraft(event, submitter === publishNowButtonRef.current);
  };

  const deletePost = async (post: Post) => {
    if (!(await confirmWithApp(`Delete "${post.title}" from the content calendar?`, { title: 'Delete calendar post?', confirmText: 'Delete', tone: 'danger' }))) return;
    try {
      await api.socialMedia.remove(post.id);
      setPosts((current) => current.filter((item) => item.id !== post.id));
      setQueuePage(1);
      setNotice('Content item deleted.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to delete this content item.');
    }
  };

  const retryPublishing = async (post: Post) => {
    setRetryingPostId(post.id);
    try {
      await api.socialMedia.retry(post.id);
      setNotice(`"${post.title}" has been added back to the publishing queue.`);
      await loadData();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to retry this post.');
    } finally {
      setRetryingPostId(null);
    }
  };

  const setDraftField = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => current ? { ...current, [key]: value } : null);
  };

  const clearMediaPreview = () => {
    draft?.media.forEach((media) => {
      if (media.kind !== 'new') return;
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
    const tooLarge = selected.find((file) => mediaFileType(file) === 'video'
      ? file.size > 100 * 1024 * 1024
      : file.size >= 10 * 1024 * 1024);
    if (tooLarge) {
      setNotice(mediaFileType(tooLarge) === 'video'
        ? `${tooLarge.name} is larger than the 100 MB video limit.`
        : `${tooLarge.name} must be smaller than 10 MB for Meta publishing.`);
      return;
    }
    const currentMediaTypes = [
      ...(draft?.media ?? []).map((media) => media.kind === 'saved'
        ? (isVideoPath(media.path) ? 'video' : 'image')
        : mediaFileType(media.file)),
    ];
    const addedTypes = selected.map(mediaFileType);
    const combinedTypes = [...currentMediaTypes, ...addedTypes];
    if (combinedTypes.includes('video') && (combinedTypes.length > 1 || addedTypes.length > 1)) {
      setNotice('Attach multiple images, or one video. Videos cannot be combined with other media.');
      return;
    }
    setNotice('');
    const newMedia: DraftMedia[] = selected.map((file) => ({
      kind: 'new',
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    newMedia.forEach((media) => {
      if (media.kind === 'new') mediaPreviewUrlsRef.current.add(media.previewUrl);
    });
    setDraft((current) => current ? { ...current, media: [...current.media, ...newMedia] } : null);
  };

  const removeMedia = (media: DraftMedia) => {
    if (media.kind === 'new') {
      URL.revokeObjectURL(media.previewUrl);
      mediaPreviewUrlsRef.current.delete(media.previewUrl);
    }
    setDraft((current) => current ? {
      ...current,
      media: current.media.filter((item) => item !== media),
    } : null);
  };

  const moveMedia = (fromIndex: number, toIndex: number) => {
    setDraft((current) => {
      if (!current || fromIndex === toIndex || fromIndex < 0 || toIndex < 0
        || fromIndex >= current.media.length || toIndex >= current.media.length) return current;
      const media = [...current.media];
      const [moved] = media.splice(fromIndex, 1);
      media.splice(toIndex, 0, moved);
      return { ...current, media };
    });
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
          <p className="mt-1 text-sm text-slate-500">Plan posts and creative work, assign owners, attach media, and publish approved posts immediately or on a schedule.</p>
        </div>
        <button type="button" onClick={() => openNew()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white"><Plus className="h-4 w-4" /> Create content task</button>
      </header>

      <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-xs leading-5 ${metaConfigured?.facebook || metaConfigured?.instagram ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
        <Share2 className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <strong>Meta publishing:</strong>{' '}
          {metaConfigured?.facebook || metaConfigured?.instagram
            ? `Connected platforms: ${[metaConfigured.facebook ? 'Facebook' : '', metaConfigured.instagram ? 'Instagram' : ''].filter(Boolean).join(' and ')}.`
            : 'Not configured yet. Add the Meta server credentials described in the deployment notes; cron is only needed for scheduled publishing.'}
          {' '}Use “Publish now” for immediate posting, or approve with a scheduled time for automatic publishing. The post and media remain archived in this system.
        </p>
      </div>
      {notice && <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-800">{notice}</div>}

      <section className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Planned content" value={posts.length} />
        <SummaryCard label="Awaiting review" value={reviewCount} highlight />
        <SummaryCard label="Assigned tasks" value={posts.filter((post) => post.assigned_to).length} />
      </section>

      <div className="flex gap-2 border-b border-slate-200" role="tablist" aria-label="Social media workspace">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'calendar'}
          aria-controls="social-calendar-panel"
          onClick={() => setActiveTab('calendar')}
          className={`border-b-2 px-4 py-3 text-sm font-bold ${activeTab === 'calendar' ? 'border-red-600 text-red-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        ><CalendarDays className="mr-2 inline h-4 w-4" />Calendar</button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'queue'}
          aria-controls="social-queue-panel"
          onClick={() => setActiveTab('queue')}
          className={`border-b-2 px-4 py-3 text-sm font-bold ${activeTab === 'queue' ? 'border-red-600 text-red-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        ><Share2 className="mr-2 inline h-4 w-4" />Content &amp; review queue <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px]">{posts.length}</span></button>
      </div>

      {activeTab === 'calendar' && <section id="social-calendar-panel" role="tabpanel" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
              <div className="space-y-1">{dayPosts.slice(0, 3).map((post) => <button key={post.id} type="button" disabled={post.status === 'published'} onClick={() => setDraft(toDraft(post))} className="block w-full truncate rounded px-1.5 py-1 text-left text-[9px] font-bold text-slate-700 hover:opacity-80 disabled:cursor-default" style={{ backgroundColor: post.status === 'in_review' ? '#fef3c7' : post.status === 'approved' || post.status === 'scheduled' ? '#dbeafe' : '#f1f5f9' }} title={`${post.title} · ${statusLabels[post.status]}`}>{post.scheduled_at ? post.scheduled_at.slice(11, 16) + ' ' : ''}{post.title}</button>)}{dayPosts.length > 3 && <button type="button" onClick={() => setFilter('all')} className="px-1 text-[9px] font-bold text-red-600">+{dayPosts.length - 3} more</button>}</div>
            </div>;
          })}
        </div>}
      </section>}

      {activeTab === 'queue' && <section id="social-queue-panel" role="tabpanel" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-lg font-black text-slate-900">Content and review queue</h2><p className="text-xs text-slate-500">Search, filter, sort, and open a post to read all its details.</p></div>
          <span className="text-xs text-slate-500">{queuePosts.length} item{queuePosts.length === 1 ? '' : 's'}</span>
        </div>
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className="relative text-[11px] font-bold text-slate-600 sm:col-span-2 xl:col-span-1">Search posts
            <Search className="absolute left-3 top-8 h-4 w-4 text-slate-400" />
            <input value={queueSearch} onChange={(event) => { setQueueSearch(event.target.value); setQueuePage(1); }} className={`${inputClass} pl-9`} placeholder="Title, caption, notes..." />
          </label>
          <label className="text-[11px] font-bold text-slate-600">Status
            <select value={queueStatus} onChange={(event) => { setQueueStatus(event.target.value as typeof queueStatus); setQueuePage(1); }} className={inputClass}>
              <option value="all">All statuses</option>
              {(Object.keys(statusLabels) as WorkflowStatus[]).map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
            </select>
          </label>
          <label className="text-[11px] font-bold text-slate-600">Platform
            <select value={queuePlatform} onChange={(event) => { setQueuePlatform(event.target.value as typeof queuePlatform); setQueuePage(1); }} className={inputClass}>
              <option value="all">All platforms</option><option value="facebook">Facebook</option><option value="instagram">Instagram</option><option value="both">Facebook + Instagram</option>
            </select>
          </label>
          <label className="text-[11px] font-bold text-slate-600">Assignee
            <select value={queueAssignee} onChange={(event) => { setQueueAssignee(event.target.value); setQueuePage(1); }} className={inputClass}>
              <option value="all">All assignees</option><option value="">Unassigned</option>
              {assignees.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
          </label>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading content queue...</div> : queuePosts.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">No posts match these filters.</div>
          ) : <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-black">Cover</th>
                    {([
                      ['title', 'Post'],
                      ['platform', 'Platform'],
                      ['scheduled_at', 'Scheduled / created'],
                      ['assigned_to', 'Assignee'],
                      ['status', 'Status'],
                    ] as [QueueSortKey, string][]).map(([key, label]) => (
                      <th key={key} scope="col" className="px-4 py-3 font-black">
                        <button type="button" onClick={() => toggleQueueSort(key)} className="inline-flex items-center gap-1 hover:text-slate-900">
                          {label}<ArrowUpDown className="h-3 w-3" />
                          {queueSort.key === key && <span className="sr-only">{queueSort.direction === 'asc' ? 'ascending' : 'descending'}</span>}
                        </button>
                      </th>
                    ))}
                    <th scope="col" className="px-4 py-3 text-right font-black">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleQueuePosts.map((post) => {
                    const assigned = assignees.find((person) => person.id === post.assigned_to);
                    const mediaPaths = postMediaPaths(post);
                    const coverPath = mediaPaths[0];
                    return <tr key={post.id} className="align-middle hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openPostDetails(post)}
                          aria-label={`Read ${post.title}`}
                          className="relative block h-14 w-16 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                        >
                          {coverPath
                            ? isVideoPath(coverPath)
                              ? <video src={assetUrl(coverPath)} className="h-full w-full object-cover" />
                              : <div role="img" aria-label={`${post.title} cover image`} className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url("${assetUrl(coverPath)}")` }} />
                            : <span className="flex h-full w-full items-center justify-center text-slate-400"><ImagePlus className="h-5 w-5" /></span>}
                          {mediaPaths.length > 1 && <span className="absolute bottom-0.5 right-0.5 rounded bg-slate-950/75 px-1 text-[9px] font-bold text-white">{mediaPaths.length}</span>}
                        </button>
                      </td>
                      <td className="max-w-sm px-4 py-3">
                        <button type="button" onClick={() => openPostDetails(post)} className="block max-w-full truncate text-left font-bold text-slate-900 hover:text-red-700">{post.title}</button>
                        <p className="mt-1 max-w-sm truncate text-xs text-slate-500">{post.caption || post.task_brief || 'No caption or brief'}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">{post.platform === 'both' ? 'Facebook + Instagram' : post.platform}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">{post.scheduled_at ? new Date(post.scheduled_at.replace(' ', 'T')).toLocaleString() : `Created ${new Date(post.created_at.replace(' ', 'T')).toLocaleDateString()}`}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{assigned?.name ?? (post.assigned_to ? 'Assignee unavailable' : 'Unassigned')}</td>
                      <td className="px-4 py-3"><span className={`whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-black ${statusStyles[post.status]}`}>{statusLabels[post.status]}</span></td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button type="button" onClick={() => openPostDetails(post)} className="mr-1 inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-700"><Eye className="h-3.5 w-3.5" /> Read</button>
                        {post.status !== 'published' && <button type="button" onClick={() => setDraft(toDraft(post))} className="mr-1 inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-700"><Pencil className="h-3.5 w-3.5" /> Edit</button>}
                        {post.status !== 'published' && <button type="button" onClick={() => void deletePost(post)} className="rounded-lg border border-rose-100 p-1.5 text-rose-600" aria-label={`Delete ${post.title}`}><Trash2 className="h-3.5 w-3.5" /></button>}
                      </td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span>Rows per page</span>
                <select value={queuePageSize} onChange={(event) => { setQueuePageSize(Number(event.target.value)); setQueuePage(1); }} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5">
                  <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option>
                </select>
                <span>{queuePosts.length ? `${(queuePage - 1) * queuePageSize + 1}–${Math.min(queuePage * queuePageSize, queuePosts.length)} of ${queuePosts.length}` : '0 posts'}</span>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" disabled={queuePage <= 1} onClick={() => setQueuePage((page) => Math.max(1, page - 1))} className="rounded-lg border border-slate-200 px-3 py-1.5 font-bold disabled:opacity-40">Previous</button>
                <span>Page {queuePage} of {queuePageCount}</span>
                <button type="button" disabled={queuePage >= queuePageCount} onClick={() => setQueuePage((page) => Math.min(queuePageCount, page + 1))} className="rounded-lg border border-slate-200 px-3 py-1.5 font-bold disabled:opacity-40">Next</button>
              </div>
            </div>
          </>}
        </div>
      </section>}

      {selectedPost && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedPost(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="post-details-title" className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
          {selectedMediaPath && <div className="mb-5">
            <div className="relative overflow-hidden rounded-2xl bg-slate-950">
              {isVideoPath(selectedMediaPath)
                ? <video src={assetUrl(selectedMediaPath)} controls className="mx-auto max-h-[48vh] w-full object-contain" />
                : <div role="img" aria-label={`${selectedPost.title}, photo ${selectedMediaIndex + 1}`} className="h-[min(48vh,480px)] w-full bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${assetUrl(selectedMediaPath)}")` }} />}
              {selectedPostMedia.length > 1 && <>
                <button
                  type="button"
                  onClick={() => setSelectedMediaIndex((index) => (index - 1 + selectedPostMedia.length) % selectedPostMedia.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-950/70 p-2 text-white hover:bg-slate-950"
                  aria-label="Previous photo"
                ><ChevronLeft className="h-5 w-5" /></button>
                <button
                  type="button"
                  onClick={() => setSelectedMediaIndex((index) => (index + 1) % selectedPostMedia.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-950/70 p-2 text-white hover:bg-slate-950"
                  aria-label="Next photo"
                ><ChevronRight className="h-5 w-5" /></button>
                <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/75 px-3 py-1 text-xs font-bold text-white">{selectedMediaIndex + 1} / {selectedPostMedia.length}</span>
              </>}
            </div>
            {selectedPostMedia.length > 1 && <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {selectedPostMedia.map((path, index) => <button
                key={`${path}-${index}`}
                type="button"
                onClick={() => setSelectedMediaIndex(index)}
                aria-label={`Show photo ${index + 1}`}
                aria-current={index === selectedMediaIndex}
                className={`relative h-14 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${index === selectedMediaIndex ? 'border-red-600' : 'border-slate-200'}`}
              >
                {isVideoPath(path)
                  ? <video src={assetUrl(path)} className="h-full w-full object-cover" />
                  : <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url("${assetUrl(path)}")` }} />}
              </button>)}
            </div>}
          </div>}
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600">Post details</p><h2 id="post-details-title" className="mt-1 text-2xl font-black text-slate-900">{selectedPost.title}</h2></div>
            <button type="button" onClick={() => setSelectedPost(null)} className="rounded-full bg-slate-100 p-2 text-slate-500" aria-label="Close post details"><X className="h-4 w-4" /></button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-black ${statusStyles[selectedPost.status]}`}>{statusLabels[selectedPost.status]}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{selectedPost.platform === 'both' ? 'Facebook + Instagram' : selectedPost.platform}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{selectedPost.content_kind.replace('_', ' ')}</span>
          </div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div><dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">Scheduled</dt><dd className="mt-1 text-sm text-slate-800">{selectedPost.scheduled_at ? new Date(selectedPost.scheduled_at.replace(' ', 'T')).toLocaleString() : 'Not scheduled'}</dd></div>
            <div><dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">Assigned to</dt><dd className="mt-1 text-sm text-slate-800">{assignees.find((person) => person.id === selectedPost.assigned_to)?.name ?? (selectedPost.assigned_to ? 'Assignee unavailable' : 'Unassigned')}</dd></div>
            <div className="sm:col-span-2"><dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">Caption / post text</dt><dd className="mt-1 whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-800">{selectedPost.caption || 'No caption provided.'}</dd></div>
            <div className="sm:col-span-2"><dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">Production brief</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{selectedPost.task_brief || 'No production brief.'}</dd></div>
            {selectedPost.reviewer_note && <div className="sm:col-span-2"><dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">Reviewer note</dt><dd className="mt-1 whitespace-pre-wrap break-words rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-900">{selectedPost.reviewer_note}</dd></div>}
            {(selectedPost.facebook_post_id || selectedPost.instagram_media_id) && <div className="space-y-1 sm:col-span-2">
              {selectedPost.facebook_post_id && <p className="break-all text-xs text-slate-600">Facebook post ID: <code>{selectedPost.facebook_post_id}</code></p>}
              {selectedPost.instagram_media_id && <p className="break-all text-xs text-slate-600">Instagram post ID: <code>{selectedPost.instagram_media_id}</code></p>}
            </div>}
          </dl>
          {selectedPost.publish_error && <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm leading-5 text-rose-800"><strong>Publishing failed · Attempt {selectedPost.publish_attempts} of 5</strong><p className="mt-1 whitespace-pre-wrap">{selectedPost.publish_error}</p><button type="button" disabled={retryingPostId === selectedPost.id} onClick={() => { setSelectedPost(null); void retryPublishing(selectedPost); }} className="mt-2 rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-bold disabled:opacity-50">{retryingPostId === selectedPost.id ? 'Queuing retry...' : 'Retry publishing'}</button></div>}
          <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
            {selectedPost.status !== 'published' && <button type="button" onClick={() => { setDraft(toDraft(selectedPost)); setSelectedPost(null); }} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white"><Pencil className="h-4 w-4" /> Review / edit</button>}
            <button type="button" onClick={() => setSelectedPost(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">Close</button>
          </div>
        </section>
      </div>}

      {draft && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
        <form onSubmit={handleDraftSubmit} className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600">{draft.id ? 'Review and edit' : 'Content planning'}</p><h2 className="mt-1 text-2xl font-black text-slate-900">{draft.id ? 'Edit content item' : 'Create content task'}</h2></div><button type="button" onClick={closeDraft} className="rounded-full bg-slate-100 p-2 text-slate-500" aria-label="Close editor"><X className="h-4 w-4" /></button></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-600 sm:col-span-2">Task / post title<input required maxLength={255} value={draft.title} onChange={(event) => setDraftField('title', event.target.value)} className={inputClass} placeholder="e.g. Sunday service highlights" /></label>
            <label className="text-xs font-bold text-slate-600">Content type<select value={draft.content_kind} onChange={(event) => setDraftField('content_kind', event.target.value as ContentKind)} className={inputClass}><option value="social_post">Social media post</option><option value="graphic">Graphic design task</option><option value="video">Video production task</option></select></label>
            <label className="text-xs font-bold text-slate-600">Platform<select value={draft.platform} onChange={(event) => setDraftField('platform', event.target.value as Platform)} className={inputClass}><option value="both">Facebook and Instagram</option><option value="facebook">Facebook</option><option value="instagram">Instagram</option></select></label>
            <label className="text-xs font-bold text-slate-600">Schedule / due date<input type="datetime-local" value={draft.scheduled_at} onChange={(event) => setDraftField('scheduled_at', event.target.value)} className={inputClass} /><span className="mt-1 block font-normal text-slate-500">Set a time to schedule; use “Publish now” to send immediately.</span></label>
            <label className="text-xs font-bold text-slate-600">Assign task to<select value={draft.assigned_to} onChange={(event) => setDraftField('assigned_to', event.target.value)} className={inputClass}><option value="">Unassigned</option>{assignees.map((person) => <option key={person.id} value={person.id}>{person.name}{person.department ? ` · ${person.department}` : ''}</option>)}</select></label>
            <label className="text-xs font-bold text-slate-600">Workflow status<select value={draft.status} onChange={(event) => setDraftField('status', event.target.value as Draft['status'])} className={inputClass}><option value="draft">Draft</option><option value="in_review">Submit for review</option><option value="approved">Approved</option><option value="rejected">Changes requested</option><option value="scheduled">Scheduled</option></select>{draft.status === 'approved' && draft.scheduled_at && <span className="mt-1 block font-normal text-emerald-700">Approval will queue this post to publish automatically at the scheduled time.</span>}{draft.status === 'scheduled' && <span className="mt-1 block font-normal text-amber-700">Scheduled publishing requires prior approval, Meta credentials, and the publishing cron.</span>}</label>
            <label className="text-xs font-bold text-slate-600 sm:col-span-2">Post caption / copy<textarea rows={4} maxLength={5000} value={draft.caption} onChange={(event) => setDraftField('caption', event.target.value)} className={inputClass} placeholder="Write the proposed message or creative direction." /></label>
            <label className="text-xs font-bold text-slate-600 sm:col-span-2">Production brief / reviewer notes<textarea rows={3} maxLength={5000} value={draft.task_brief} onChange={(event) => setDraftField('task_brief', event.target.value)} className={inputClass} placeholder="Describe the graphic/video task, requirements, or reviewer edits." /></label>
            {draft.id && <label className="text-xs font-bold text-slate-600 sm:col-span-2">Note to content owner<textarea rows={2} maxLength={5000} value={draft.reviewer_note} onChange={(event) => setDraftField('reviewer_note', event.target.value)} className={inputClass} placeholder="Optional review feedback or requested changes." /></label>}
            <div className="text-xs font-bold text-slate-600 sm:col-span-2">
              <span>Attach images or video</span>
              {draft.platform !== 'facebook' && <p className="mt-1 font-normal text-slate-500">Instagram accepts JPG photos or a single MP4 video; carousels support up to 10 JPG photos.</p>}
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setMediaDragActive(event.dataTransfer.types.includes('Files'));
                }}
                onDragLeave={(event) => {
                  const target = event.relatedTarget;
                  if (!(target instanceof Node) || !event.currentTarget.contains(target)) setMediaDragActive(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setMediaDragActive(false);
                  setDraggedMediaIndex(null);
                  setMediaDropIndex(null);
                  chooseMediaFiles(event.dataTransfer.files);
                }}
                className={`mt-1 rounded-2xl border border-dashed p-5 transition-colors ${mediaDragActive ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-slate-50'}`}
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
                {draft.media.length > 0 && (
                  <>
                    <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-slate-800">Story order</p>
                        <p className="mt-1 text-[11px] font-normal text-slate-500">Drag any photo onto another photo to set its place. The numbered order is used when publishing.</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold text-slate-600">{draft.media.length} item{draft.media.length === 1 ? '' : 's'}</span>
                    </div>
                    <div className="mt-3 grid max-h-[55vh] grid-cols-2 gap-4 overflow-y-auto rounded-xl border border-slate-200 bg-white/70 p-3 sm:grid-cols-3 xl:grid-cols-4">
                      {draft.media.map((media, index) => {
                        const previewUrl = media.kind === 'saved' ? assetUrl(media.path) : media.previewUrl;
                        const isVideo = media.kind === 'saved'
                          ? isVideoPath(media.path)
                          : mediaFileType(media.file) === 'video';
                        const key = media.kind === 'saved' ? `saved-${media.path}` : media.previewUrl;
                        return (
                          <div
                            key={key}
                            draggable={draft.media.length > 1}
                            onDragStart={(event) => {
                              setDraggedMediaIndex(index);
                              setMediaDropIndex(null);
                              event.dataTransfer.effectAllowed = 'move';
                              event.dataTransfer.setData('application/x-social-media-index', String(index));
                            }}
                            onDragEnd={() => {
                              setDraggedMediaIndex(null);
                              setMediaDropIndex(null);
                            }}
                            onDragOver={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              const isReordering = event.dataTransfer.types.includes('application/x-social-media-index');
                              event.dataTransfer.dropEffect = isReordering ? 'move' : 'copy';
                              setMediaDropIndex(isReordering ? index : null);
                            }}
                            onDragLeave={(event) => {
                              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                                setMediaDropIndex((current) => current === index ? null : current);
                              }
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setMediaDragActive(false);
                              setDraggedMediaIndex(null);
                              setMediaDropIndex(null);
                              const rawSourceIndex = event.dataTransfer.getData('application/x-social-media-index');
                              const sourceIndex = Number(rawSourceIndex);
                              if (rawSourceIndex !== '' && Number.isInteger(sourceIndex)) {
                                moveMedia(sourceIndex, index);
                              } else if (event.dataTransfer.files.length > 0) {
                                chooseMediaFiles(event.dataTransfer.files);
                              }
                            }}
                            className={`overflow-hidden rounded-xl border bg-white shadow-sm transition duration-150 ${draggedMediaIndex === index ? 'scale-[0.98] opacity-40' : ''} ${mediaDropIndex === index && draggedMediaIndex !== index ? 'border-red-500 ring-4 ring-red-100' : 'border-slate-200'} ${draft.media.length > 1 ? 'cursor-grab active:cursor-grabbing' : ''}`}
                          >
                            <div className="relative aspect-square bg-slate-200">
                              {isVideo
                                ? <video src={previewUrl} controls draggable={false} className="h-full w-full object-contain" />
                                : <div role="img" aria-label={`Photo ${index + 1} preview`} className="h-full w-full bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${previewUrl}")` }} />}
                              <span className="absolute left-2 top-2 rounded-full bg-slate-950/75 px-2 py-0.5 text-[10px] font-bold text-white">{index + 1}</span>
                              {draft.media.length > 1 && <span className="absolute right-2 top-2 rounded-full bg-slate-950/75 px-2 py-1 text-[10px] font-bold text-white">Drag to reorder</span>}
                            </div>
                            {media.kind === 'new' && <p className="truncate px-2 pt-2 text-center text-[10px] font-medium text-slate-600">{media.file.name}</p>}
                            <div className="flex items-center justify-between px-2 py-2">
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  disabled={index === 0 || saving}
                                  onClick={() => moveMedia(index, index - 1)}
                                  className="rounded p-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                                  aria-label={`Move media ${index + 1} earlier`}
                                ><ChevronUp className="h-4 w-4" /></button>
                                <button
                                  type="button"
                                  disabled={index === draft.media.length - 1 || saving}
                                  onClick={() => moveMedia(index, index + 1)}
                                  className="rounded p-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                                  aria-label={`Move media ${index + 1} later`}
                                ><ChevronDown className="h-4 w-4" /></button>
                              </div>
                              <button type="button" disabled={saving} onClick={() => removeMedia(media)} className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold text-rose-700 disabled:opacity-50"><X className="h-3.5 w-3.5" /> Remove</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
              <span className="mt-1 block font-normal text-slate-400">Images: JPG, PNG, WEBP, GIF (each under 10 MB). Video: MP4, MOV, WEBM (one video only, up to 100 MB).</span>
            </div>
            {draft.reviewer_note && <p className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-900 sm:col-span-2">Reviewer note: {draft.reviewer_note}</p>}
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={closeDraft} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-black text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : draft.status === 'in_review' ? <Send className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}{saving ? 'Saving...' : draft.id ? 'Save review and edits' : 'Save to calendar'}</button>
            {draft.content_kind === 'social_post' && <button ref={publishNowButtonRef} type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-black text-white disabled:opacity-50"><Send className="h-4 w-4" />{saving ? 'Publishing...' : 'Publish now'}</button>}
          </div>
        </form>
      </div>}
    </main>
  );
}

function SummaryCard({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</p><p className={`mt-2 text-2xl font-black ${highlight ? 'text-amber-600' : 'text-slate-900'}`}>{value}</p></div>;
}
