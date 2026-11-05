'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BarChart3, ExternalLink, ImagePlus, LoaderCircle, MessageCircle,
  Pencil, RefreshCw, Send, Share2, Users, X,
} from 'lucide-react';
import { api } from '@/lib/api';

type FacebookPageInfo = {
  id: string;
  name?: string;
  about?: string;
  description?: string;
  website?: string;
  link?: string;
  category?: string;
  fan_count?: number;
  followers_count?: number;
  picture?: { data?: { url?: string } };
  cover?: { source?: string };
};
type PagePost = {
  id: string;
  message?: string;
  created_time?: string;
  permalink_url?: string;
  full_picture?: string;
};
type PageComment = {
  id: string;
  message?: string;
  created_time?: string;
  from?: { name?: string };
  comments?: { data?: PageComment[] };
};
type FacebookMessage = {
  id: string;
  message?: string;
  created_time?: string;
  from?: { id?: string; name?: string };
};
type Participant = { id: string; name?: string };
type Conversation = {
  id: string;
  updated_time?: string;
  participants?: { data?: Participant[] };
  messages?: { data?: FacebookMessage[] };
};
type Insight = { name: string; title?: string; values?: Array<{ value?: number | Record<string, number> }> };
type Business = { id: string; name?: string; owned_pages?: Array<{ id: string; name?: string; category?: string }> };
type DashboardData = {
  page: FacebookPageInfo | null;
  posts: PagePost[];
  conversations: Conversation[];
  insights: Insight[];
  businesses: Business[];
  business_configured: boolean;
  errors: Record<string, string>;
};
type DashboardResponse = { data: DashboardData };

type Tab = 'overview' | 'posts' | 'inbox' | 'insights' | 'page';
const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'posts', label: 'Posts' },
  { id: 'inbox', label: 'Inbox' },
  { id: 'insights', label: 'Insights' },
  { id: 'page', label: 'Page & business' },
];
const inputClass = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500';

function messageText(conversation?: Conversation): string {
  return conversation?.messages?.data?.[0]?.message || 'No message preview';
}

function latestInsightValue(insight: Insight): number | null {
  const values = insight.values ?? [];
  for (let index = values.length - 1; index >= 0; index--) {
    const value = values[index]?.value;
    if (typeof value === 'number') return value;
    if (value && typeof value === 'object') {
      return Object.values(value).reduce((sum, item) => sum + (Number(item) || 0), 0);
    }
  }
  return null;
}

export default function FacebookPageDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [editingPost, setEditingPost] = useState<PagePost | null>(null);
  const [editPostText, setEditPostText] = useState('');
  const [replacementPhotos, setReplacementPhotos] = useState<File[]>([]);
  const [replacementPhotoPreviews, setReplacementPhotoPreviews] = useState<string[]>([]);
  const replacementPhotoInputRef = useRef<HTMLInputElement>(null);
  const [commentsPost, setCommentsPost] = useState<PagePost | null>(null);
  const [postComments, setPostComments] = useState<PageComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [replyingToComment, setReplyingToComment] = useState<string | null>(null);
  const [commentReplyText, setCommentReplyText] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<FacebookMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [about, setAbout] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.facebookPage.dashboard() as DashboardResponse;
      setDashboard(response.data);
      setAbout(response.data.page?.about ?? '');
      setDescription(response.data.page?.description ?? '');
      setWebsite(response.data.page?.website ?? '');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Facebook Page data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadDashboard(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  useEffect(() => () => {
    replacementPhotoPreviews.forEach((preview) => URL.revokeObjectURL(preview));
  }, [replacementPhotoPreviews]);

  const performAction = async (data: Record<string, string>) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await api.facebookPage.action(data) as { message?: string };
      setNotice(response.message ?? 'Facebook Page updated.');
      await loadDashboard();
      return true;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Facebook action could not be completed.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const savePostEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingPost) return;
    if (editPostText.length > 5000) {
      setError('Post text must be 5,000 characters or fewer.');
      return;
    }
    const saved = await performAction({
      action: 'edit_post',
      post_id: editingPost.id,
      message: editPostText,
    });
    if (saved) {
      setEditingPost(null);
      setEditPostText('');
      setReplacementPhotos([]);
    }
  };

  const chooseReplacementPhotos = (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files);
    if (selected.length > 10) {
      setError('Choose no more than 10 replacement photos.');
      return;
    }
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const supportedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    const unsupported = selected.find((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
      return !supportedTypes.includes(file.type) && !supportedExtensions.includes(extension);
    });
    if (unsupported) {
      setError(`${unsupported.name} is not a supported photo. Choose JPG, PNG, WEBP, or GIF.`);
      return;
    }
    const tooLarge = selected.find((file) => file.size >= 10 * 1024 * 1024);
    if (tooLarge) {
      setError(`${tooLarge.name} must be smaller than 10 MB for Meta publishing.`);
      return;
    }
    setError('');
    setReplacementPhotos(selected);
    setReplacementPhotoPreviews(selected.map((file) => URL.createObjectURL(file)));
  };

  const publishPhotoReplacement = async () => {
    if (!editingPost || !replacementPhotos.length) {
      setError('Choose at least one replacement photo.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    let calendarPostId: number | undefined;
    try {
      const uploaded = await Promise.all(replacementPhotos.map(async (file) => {
        const response = await api.socialMedia.upload(file) as { data?: { path?: string; media_type?: string } };
        if (!response.data?.path || response.data.media_type !== 'image') {
          throw new Error(`The photo "${file.name}" could not be uploaded.`);
        }
        return response.data.path;
      }));
      const saved = await api.socialMedia.save({
        title: `Replacement for Facebook post ${editingPost.id}`,
        content_kind: 'social_post',
        platform: 'facebook',
        caption: editPostText.trim(),
        task_brief: `Replacement photo for Facebook Page post ${editingPost.id}. The original post remains unchanged.`,
        media_path: uploaded[0],
        media_type: 'image',
        media_paths: uploaded,
        scheduled_at: '',
        status: 'approved',
        reviewer_note: '',
      }) as { data?: { id?: number } };
      calendarPostId = saved.data?.id;
      if (!calendarPostId) {
        throw new Error('The replacement was saved without a calendar ID. Check Social Media & Content before trying again.');
      }

      try {
        await api.socialMedia.publishNow(calendarPostId);
      } catch (publishError) {
        const reason = publishError instanceof Error ? publishError.message : 'Facebook could not publish the replacement.';
        setEditingPost(null);
        setReplacementPhotos([]);
        setReplacementPhotoPreviews([]);
        setNotice(`Replacement saved as calendar item #${calendarPostId}, but publishing failed: ${reason} Open Social Media & Content to review or retry it.`);
        await loadDashboard();
        return;
      }

      setEditingPost(null);
      setReplacementPhotos([]);
      setReplacementPhotoPreviews([]);
      setNotice('Replacement photo published as a new Facebook post. The original post and its engagement remain unchanged.');
      await loadDashboard();
    } catch (replacementError) {
      const detail = replacementError instanceof Error ? replacementError.message : 'The replacement photo could not be published.';
      setError(calendarPostId
        ? `Replacement saved as calendar item #${calendarPostId}. Check Social Media & Content before retrying: ${detail}`
        : detail);
    } finally {
      setBusy(false);
    }
  };

  const openConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setMessages([]);
    setError('');
    try {
      const response = await api.facebookPage.messages(conversation.id) as { data?: FacebookMessage[] };
      setMessages((response.data ?? []).slice().reverse());
    } catch (messageError) {
      setError(messageError instanceof Error ? messageError.message : 'Conversation could not be loaded.');
    }
  };

  const sendReply = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const pageId = dashboard?.page?.id;
    const recipient = selectedConversation?.participants?.data?.find((person) => person.id !== pageId);
    if (!selectedConversation || !recipient || !replyText.trim()) {
      setError('Select a conversation and enter a reply.');
      return;
    }
    const sent = await performAction({
      action: 'reply',
      conversation_id: selectedConversation.id,
      recipient_id: recipient.id,
      message: replyText.trim(),
    });
    if (sent) {
      setReplyText('');
      await openConversation(selectedConversation);
    }
  };

  const updatePage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await performAction({ action: 'update_page', about, description, website });
  };

  const openPostEditor = (post: PagePost) => {
    setError('');
    setEditingPost(post);
    setEditPostText(post.message ?? '');
    setReplacementPhotos([]);
    setReplacementPhotoPreviews([]);
  };

  const openPostComments = async (post: PagePost) => {
    setCommentsPost(post);
    setPostComments([]);
    setLoadingComments(true);
    setError('');
    try {
      const response = await api.facebookPage.comments(post.id) as { data?: PageComment[] };
      setPostComments(response.data ?? []);
    } catch (commentsError) {
      setError(commentsError instanceof Error ? commentsError.message : 'Post comments could not be loaded.');
    } finally {
      setLoadingComments(false);
    }
  };

  const sendCommentReply = async (event: React.FormEvent<HTMLFormElement>, commentId: string) => {
    event.preventDefault();
    if (!commentsPost || !commentReplyText.trim()) return;
    const sent = await performAction({
      action: 'reply_comment',
      post_id: commentsPost.id,
      comment_id: commentId,
      message: commentReplyText.trim(),
    });
    if (sent) {
      setCommentReplyText('');
      setReplyingToComment(null);
      await openPostComments(commentsPost);
    }
  };

  const page = dashboard?.page;
  const errorEntries = Object.entries(dashboard?.errors ?? {});

  return (
    <main className="space-y-6 pb-12">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-700">Communications workspace</p>
          <h1 className="mt-2 flex items-center gap-2 text-3xl font-black tracking-tight text-slate-900"><MessageCircle className="h-7 w-7 text-blue-700" /> Facebook Page Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">View and edit Facebook Page posts, change photos with a replacement post, and reply to comments or messages. Create and schedule other posts in Social Media & Content.</p>
        </div>
        <button type="button" onClick={() => void loadDashboard()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
      {errorEntries.map(([section, text]) => <div key={section} role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900"><strong>{section} unavailable:</strong> {text}</div>)}

      <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2" aria-label="Facebook dashboard sections">
        {tabs.map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-black ${tab === item.id ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{item.label}</button>)}
      </nav>

      {loading && !dashboard ? <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading Facebook Page...</div> : <>
        {tab === 'overview' && <section className="space-y-4">
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
            {page?.picture?.data?.url && <div role="img" aria-label={`${page.name ?? 'Facebook Page'} profile picture`} className="h-16 w-16 shrink-0 rounded-full bg-cover bg-center" style={{ backgroundImage: `url("${page.picture.data.url}")` }} />}
            <div className="min-w-0 flex-1"><h2 className="text-xl font-black text-slate-900">{page?.name ?? 'Facebook Page'}</h2><p className="text-sm text-slate-500">{page?.category ?? 'Page details unavailable'}</p>{page?.link && <a className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-blue-700" href={page.link} target="_blank" rel="noreferrer">Open Page <ExternalLink className="h-3 w-3" /></a>}</div>
            <div className="flex gap-3"><SummaryCard label="Followers" value={page?.followers_count ?? page?.fan_count} icon={<Users className="h-4 w-4" />} /><SummaryCard label="Recent posts" value={dashboard?.posts.length ?? 0} icon={<Share2 className="h-4 w-4" />} /><SummaryCard label="Conversations" value={dashboard?.conversations.length ?? 0} icon={<MessageCircle className="h-4 w-4" />} /></div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2"><Panel title="Recent Page posts"><PostList posts={(dashboard?.posts ?? []).slice(0, 5)} onEdit={openPostEditor} onComments={openPostComments} /></Panel><Panel title="Recent Messenger conversations"><ConversationList conversations={(dashboard?.conversations ?? []).slice(0, 5)} onSelect={(conversation) => { setTab('inbox'); void openConversation(conversation); }} /></Panel></div>
        </section>}

        {tab === 'posts' && <Panel title="Facebook Page posts"><p className="mb-4 text-xs text-slate-500">Review posts, edit text, or reply to comments. Post creation and scheduling are managed in Social Media & Content.</p><PostList posts={dashboard?.posts ?? []} onEdit={openPostEditor} onComments={openPostComments} /></Panel>}

        {tab === 'inbox' && <section className="grid min-h-[32rem] gap-4 lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.5fr)]">
          <Panel title="Messenger conversations"><ConversationList conversations={dashboard?.conversations ?? []} selectedId={selectedConversation?.id} onSelect={(conversation) => void openConversation(conversation)} /></Panel>
          <Panel title={selectedConversation ? selectedConversation.participants?.data?.map((person) => person.name).filter(Boolean).join(', ') || 'Conversation' : 'Select a conversation'}>
            {selectedConversation ? <><div className="mb-4 max-h-[24rem] space-y-3 overflow-y-auto">{messages.map((message) => <div key={message.id} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${message.from?.id === page?.id ? 'ml-auto bg-blue-700 text-white' : 'bg-slate-100 text-slate-800'}`}><p>{message.message || 'Unsupported message type'}</p><time className="mt-1 block text-[10px] opacity-70">{message.created_time ? new Date(message.created_time).toLocaleString() : ''}</time></div>)}</div><form onSubmit={sendReply} className="flex gap-2"><input value={replyText} onChange={(event) => setReplyText(event.target.value)} className={inputClass} placeholder="Write a Messenger reply" /><button type="submit" disabled={busy || !replyText.trim()} className="shrink-0 rounded-xl bg-blue-700 px-4 text-white disabled:opacity-50" aria-label="Send reply"><Send className="h-4 w-4" /></button></form><p className="mt-2 text-[10px] text-slate-500">Replies are subject to Meta Messenger messaging-window and policy restrictions.</p></> : <p className="text-sm text-slate-500">Choose a conversation to view messages and reply.</p>}
          </Panel>
        </section>}

        {tab === 'insights' && <section className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{(dashboard?.insights ?? []).map((insight) => <SummaryCard key={insight.name} label={insight.title ?? insight.name.replaceAll('_', ' ')} value={latestInsightValue(insight)} icon={<BarChart3 className="h-4 w-4" />} />)}</div><Panel title="Reporting access"><p className="text-sm text-slate-600">Page insights show post engagement for the last seven days. Audience Network reports are a separate Meta reporting product and may not be available through Page insights.</p></Panel></section>}

        {tab === 'page' && <section className="grid gap-4 lg:grid-cols-2">
          <Panel title="Facebook Page details">{page ? <><dl className="grid grid-cols-2 gap-3 text-sm"><Detail label="Page name" value={page.name} /><Detail label="Page ID" value={page.id} /><Detail label="Category" value={page.category} /><Detail label="Website" value={page.website} /><Detail label="Followers" value={page.followers_count ?? page.fan_count} /><Detail label="Facebook URL" value={page.link} /></dl><form onSubmit={updatePage} className="mt-5 space-y-3 border-t border-slate-100 pt-4"><label className="block text-xs font-bold text-slate-600">About<input value={about} onChange={(event) => setAbout(event.target.value)} maxLength={5000} className={inputClass} /></label><label className="block text-xs font-bold text-slate-600">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={5000} className={inputClass} /></label><label className="block text-xs font-bold text-slate-600">Website URL<input type="url" value={website} onChange={(event) => setWebsite(event.target.value)} className={inputClass} placeholder="https://" /></label><button type="submit" disabled={busy} className="rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">Save Page details</button></form></> : <p className="text-sm text-slate-500">Page details could not be loaded.</p>}</Panel>
          <Panel title="Business assets">{dashboard?.businesses.map((business) => <div key={business.id} className="mb-4"><h3 className="font-bold text-slate-800">{business.name ?? business.id}</h3><p className="mb-2 text-xs text-slate-500">Business ID: {business.id}</p>{(business.owned_pages ?? []).map((ownedPage) => <div key={ownedPage.id} className="rounded-xl border border-slate-100 p-3 text-sm">{ownedPage.name ?? ownedPage.id}<span className="ml-2 text-xs text-slate-500">{ownedPage.category ?? ''}</span></div>)}</div>)}{!dashboard?.businesses.length && <p className="text-sm text-slate-600">{dashboard?.business_configured ? 'No business assets were returned.' : 'Set META_BUSINESS_ID on the PHP API server to show this Business Manager account and its Pages.'}</p>}</Panel>
        </section>}
      </>}

      {editingPost && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
        <form onSubmit={savePostEdit} className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-black text-slate-900">Edit Facebook post</h2><p className="mt-1 text-xs text-slate-500">Update text here, or publish a new post with replacement photos from this dashboard.</p></div><button type="button" onClick={() => { setEditingPost(null); setReplacementPhotos([]); setReplacementPhotoPreviews([]); }} className="rounded-full bg-slate-100 p-2 text-slate-500" aria-label="Close editor"><X className="h-4 w-4" /></button></div>
          {error && <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</div>}
          {editingPost.full_picture && <div role="img" aria-label="Post media preview" className="mt-4 h-40 rounded-xl bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${editingPost.full_picture}")` }} />}
          <label className="mt-4 block text-xs font-bold text-slate-600">Post text<textarea autoFocus rows={6} maxLength={5000} value={editPostText} onChange={(event) => setEditPostText(event.target.value)} className={inputClass} /></label>
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3">
            <p className="text-xs text-blue-900">Facebook does not allow replacing the image on an existing post. Publishing replacement photos creates a new Facebook post; the original and its engagement stay unchanged.</p>
            <input ref={replacementPhotoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="sr-only" onChange={(event) => { chooseReplacementPhotos(event.target.files); event.target.value = ''; }} />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => replacementPhotoInputRef.current?.click()} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-800 disabled:opacity-50"><ImagePlus className="h-4 w-4" /> Choose replacement photos</button>
              {replacementPhotos.length > 0 && <span className="text-xs text-blue-900">{replacementPhotos.length} photo{replacementPhotos.length === 1 ? '' : 's'} selected</span>}
            </div>
            {replacementPhotos.length > 0 && <ul className="mt-2 space-y-1 text-[10px] text-blue-900">{replacementPhotos.map((photo) => <li key={`${photo.name}-${photo.size}-${photo.lastModified}`} className="truncate">{photo.name}</li>)}</ul>}
            {replacementPhotoPreviews.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2">{replacementPhotoPreviews.map((preview, index) => <div key={preview} role="img" aria-label={`Replacement photo ${index + 1} preview`} className="h-20 w-full rounded-lg border border-blue-100 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${preview}")` }} />)}</div>}
            <button type="button" onClick={() => void publishPhotoReplacement()} disabled={busy || replacementPhotos.length === 0} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Publish replacement post</button>
          </div>
          <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => { setEditingPost(null); setReplacementPhotos([]); setReplacementPhotoPreviews([]); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">Cancel</button><button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />} Save text changes</button></div>
        </form>
      </div>}
      {commentsPost && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
        <section role="dialog" aria-modal="true" aria-labelledby="post-comments-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-3"><div><h2 id="post-comments-title" className="text-lg font-black text-slate-900">Post comments</h2><p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-slate-500">{commentsPost.message || 'Facebook post'}</p></div><button type="button" onClick={() => setCommentsPost(null)} className="rounded-full bg-slate-100 p-2 text-slate-500" aria-label="Close comments"><X className="h-4 w-4" /></button></div>
          {loadingComments ? <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading comments...</div> : postComments.length ? <div className="mt-4 space-y-3">{postComments.map((comment) => <article key={comment.id} className="rounded-xl border border-slate-100 p-3"><p className="text-xs font-black text-slate-800">{comment.from?.name ?? 'Facebook user'}</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{comment.message || 'Attachment or unsupported comment'}</p><time className="mt-1 block text-[10px] text-slate-400">{comment.created_time ? new Date(comment.created_time).toLocaleString() : ''}</time>{comment.comments?.data?.map((reply) => <div key={reply.id} className="ml-4 mt-2 rounded-lg bg-slate-50 p-2"><p className="text-[10px] font-bold text-slate-700">{reply.from?.name ?? 'Facebook user'}</p><p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">{reply.message || 'Attachment or unsupported comment'}</p></div>)}<button type="button" onClick={() => { setReplyingToComment(replyingToComment === comment.id ? null : comment.id); setCommentReplyText(''); }} className="mt-2 text-xs font-bold text-blue-700">Reply</button>{replyingToComment === comment.id && <form onSubmit={(event) => void sendCommentReply(event, comment.id)} className="mt-2 flex gap-2"><input maxLength={8000} value={commentReplyText} onChange={(event) => setCommentReplyText(event.target.value)} className={inputClass} placeholder="Write a reply to this comment" /><button type="submit" disabled={busy || !commentReplyText.trim()} className="shrink-0 rounded-xl bg-blue-700 px-4 text-white disabled:opacity-50" aria-label="Send comment reply"><Send className="h-4 w-4" /></button></form>}</article>)}</div> : <p className="mt-5 text-sm text-slate-500">No comments were returned for this post.</p>}
          <p className="mt-4 text-[10px] text-slate-500">Comment replies require the Meta permission <code>pages_manage_engagement</code>.</p>
        </section>
      </div>}
    </main>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value?: number | string | null; icon: React.ReactNode }) {
  return <div className="min-w-28 rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-wide text-slate-500"><span>{label}</span><span className="text-blue-700">{icon}</span></div><p className="mt-2 text-xl font-black text-slate-900">{value ?? '—'}</p></div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="mb-4 text-sm font-black text-slate-900">{title}</h2>{children}</section>;
}

function PostList({ posts, onEdit, onComments }: { posts: PagePost[]; onEdit: (post: PagePost) => void; onComments: (post: PagePost) => void }) {
  return posts.length ? <div className="space-y-3">{posts.map((post) => <article key={post.id} className="flex gap-3 rounded-xl border border-slate-100 p-3">{post.full_picture ? <div role="img" aria-label="Facebook post media" className="h-16 w-16 shrink-0 rounded-lg bg-cover bg-center" style={{ backgroundImage: `url("${post.full_picture}")` }} /> : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><ImagePlus className="h-5 w-5" /></div>}<div className="min-w-0 flex-1"><p className="line-clamp-3 whitespace-pre-wrap text-xs text-slate-700">{post.message || 'Photo/video post'}</p><time className="mt-1 block text-[10px] text-slate-500">{post.created_time ? new Date(post.created_time).toLocaleString() : ''}</time>{post.permalink_url && <a href={post.permalink_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-blue-700">View on Facebook <ExternalLink className="h-3 w-3" /></a>}</div><div className="flex shrink-0 flex-col gap-2"><button type="button" onClick={() => onEdit(post)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50"><Pencil className="h-3.5 w-3.5" /> Edit</button><button type="button" onClick={() => onComments(post)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50"><MessageCircle className="h-3.5 w-3.5" /> Comments</button></div></article>)}</div> : <p className="text-sm text-slate-500">No recent posts were returned.</p>;
}

function ConversationList({ conversations, selectedId, onSelect }: { conversations: Conversation[]; selectedId?: string; onSelect: (conversation: Conversation) => void }) {
  return conversations.length ? <div className="space-y-2">{conversations.map((conversation) => { const participant = conversation.participants?.data?.find((item) => item.name); return <button key={conversation.id} type="button" onClick={() => onSelect(conversation)} className={`w-full rounded-xl border p-3 text-left ${selectedId === conversation.id ? 'border-blue-300 bg-blue-50' : 'border-slate-100 hover:bg-slate-50'}`}><span className="block truncate text-xs font-black text-slate-800">{participant?.name ?? 'Facebook user'}</span><span className="mt-1 block truncate text-[11px] text-slate-500">{messageText(conversation)}</span><time className="mt-1 block text-[10px] text-slate-400">{conversation.updated_time ? new Date(conversation.updated_time).toLocaleString() : ''}</time></button>; })}</div> : <p className="text-sm text-slate-500">No Messenger conversations were returned.</p>;
}

function Detail({ label, value }: { label: string; value?: string | number }) {
  return <div className="min-w-0"><dt className="text-[10px] font-bold uppercase text-slate-500">{label}</dt><dd className="mt-1 break-words text-xs font-semibold text-slate-800">{value || 'Not available'}</dd></div>;
}
