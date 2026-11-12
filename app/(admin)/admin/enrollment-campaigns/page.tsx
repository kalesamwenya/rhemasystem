'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Eye, GraduationCap, Loader2, Megaphone, Save, UploadCloud, Video, X } from 'lucide-react';
import { api, assetUrl } from '@/lib/api';
import EnrollmentCampaignVideoPlayer from '@/components/main/EnrollmentCampaignVideoPlayer';

type EnrollmentCampaign = {
  enabled: boolean;
  title: string;
  description: string;
  apply_url: string;
  know_more_url: string;
  video_enabled: boolean;
  video_attached?: boolean;
  video_url: string | null;
  video_type: 'upload' | 'embed' | null;
  video_library?: EnrollmentVideo[];
};

type EnrollmentVideo = { path: string; size: number };
type ApiResponse<T> = { success?: boolean; message?: string; data?: T };

const initialCampaign: EnrollmentCampaign = {
  enabled: true,
  title: 'Your next chapter starts here.',
  description: 'Explore your study options and take the first step today.',
  apply_url: '/application',
  know_more_url: '/apply',
  video_enabled: false,
  video_url: '',
  video_type: null,
};

const linkOptions = [
  { value: '/application', label: 'Application form' },
  { value: '/apply', label: 'Admissions guide' },
  { value: '/offered-programs', label: 'Explore programmes' },
];

function getVideoPreviewUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host)) {
      const videoId = url.pathname === '/watch'
        ? url.searchParams.get('v')
        : url.pathname.match(/^\/(?:embed|shorts)\/([A-Za-z0-9_-]+)$/)?.[1];
      return videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)
        ? `https://www.youtube-nocookie.com/embed/${videoId}`
        : null;
    }
    if (['youtu.be', 'www.youtu.be'].includes(host)) {
      const videoId = url.pathname.slice(1).replace(/\/$/, '');
      return /^[A-Za-z0-9_-]{11}$/.test(videoId) ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
    }
    if (['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(host)) {
      const videoId = url.pathname.match(/^\/(?:video\/)?([0-9]{6,12})$/)?.[1];
      return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

export default function EnrollmentCampaignsPage() {
  const [campaign, setCampaign] = useState<EnrollmentCampaign>(initialCampaign);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [videoSource, setVideoSource] = useState<'upload' | 'link'>('upload');
  const [notice, setNotice] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      api.admissions.getEnrollmentCampaign()
        .then((response: ApiResponse<EnrollmentCampaign>) => {
          if (!active) return;
          if (!response.data) throw new Error(response.message || 'The campaign settings were not returned.');
          setCampaign(response.data);
          setVideoSource(response.data.video_type === 'embed' ? 'link' : 'upload');
        })
        .catch((cause: unknown) => {
          if (active) {
            setNotice(cause instanceof Error ? cause.message : 'Unable to load the campaign.');
            setIsError(true);
          }
        })
        .finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  const updateCampaign = (update: Partial<EnrollmentCampaign>) => {
    setCampaign((current) => ({
      ...current,
      ...update,
      ...('video_url' in update ? { video_attached: Boolean(update.video_url) } : {}),
    }));
    setNotice('');
  };

  const uploadVideo = async (file: File | undefined) => {
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['video/mp4', 'video/webm'].includes(file.type) && !['mp4', 'webm'].includes(extension ?? '')) {
      setNotice('Choose an MP4 or WebM video file.');
      setIsError(true);
      return;
    }
    if (file.size > 360 * 1024 * 1024) {
      setNotice('Video files must be 360 MB or smaller.');
      setIsError(true);
      return;
    }
    setUploadingVideo(true);
    setUploadProgress(0);
    setNotice('');
    setIsError(false);
    try {
      const response = await api.admissions.uploadEnrollmentCampaignVideo(file, (progress: number) => setUploadProgress(progress)) as ApiResponse<{ path: string; type: 'upload' }>;
      if (!response.data?.path) throw new Error(response.message || 'The video upload did not return a file path.');
      updateCampaign({
        video_url: response.data.path,
        video_type: 'upload',
        video_library: [
          { path: response.data.path, size: file.size },
          ...(campaign.video_library ?? []).filter((video) => video.path !== response.data?.path),
        ],
      });
      setVideoSource('upload');
      setNotice('Video uploaded and selected. Turn on “Include a video popup” to show it in the ad.');
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Unable to upload the video.');
      setIsError(true);
    } finally {
      setUploadingVideo(false);
      setUploadProgress(null);
    }
  };

  const saveCampaign = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    setIsError(false);
    try {
      const campaignData = { ...campaign };
      delete campaignData.video_library;
      const response = await api.admissions.saveEnrollmentCampaign(campaignData) as ApiResponse<EnrollmentCampaign>;
      if (!response.data) throw new Error(response.message || 'The saved campaign was not returned.');
      setCampaign({ ...response.data, video_library: campaign.video_library });
      setNotice('Enrollment campaign saved.');
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Unable to save the campaign.');
      setIsError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-teal-700">Public website</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Enrollment campaigns</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">Control the popup shown to visitors while enrollment is open. Add a video, update the message, and choose where the Apply and Know more buttons lead.</p>
        </div>
        <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-xs font-black ${campaign.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
          <span className={`h-2 w-2 rounded-full ${campaign.enabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          {campaign.enabled ? 'Campaign enabled' : 'Campaign paused'}
        </span>
      </header>

      {notice && <p role={isError ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-sm ${isError ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{notice}</p>}

      {loading ? (
        <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading campaign settings…</div>
      ) : (
        <form onSubmit={saveCampaign} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
          <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="rounded-xl bg-teal-50 p-2.5 text-teal-800"><Megaphone className="h-5 w-5" /></div>
              <div><h2 className="font-black text-slate-900">Campaign content</h2><p className="text-xs text-slate-500">Changes are published when you save.</p></div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <input type="checkbox" checked={campaign.enabled} onChange={(event) => updateCampaign({ enabled: event.target.checked })} className="mt-0.5 h-4 w-4 accent-teal-700" />
              <span><span className="block text-sm font-bold text-slate-900">Show enrollment popup</span><span className="mt-1 block text-xs leading-5 text-slate-600">The popup is shown only when applications are open. Pause it without closing enrollment.</span></span>
            </label>

            <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
              Headline
              <input required maxLength={240} value={campaign.title} onChange={(event) => updateCampaign({ title: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-slate-900 outline-none focus:border-teal-600" />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
              Message
              <textarea rows={4} maxLength={2000} value={campaign.description} onChange={(event) => updateCampaign({ description: event.target.value })} placeholder="Share a short message with prospective students." className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-900 outline-none focus:border-teal-600" />
              <span className="mt-1 block text-right text-[11px] font-normal normal-case text-slate-400">{campaign.description.length}/2000</span>
            </label>

            <div className="rounded-xl border border-slate-200 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" checked={campaign.video_enabled} onChange={(event) => updateCampaign({ video_enabled: event.target.checked })} className="mt-0.5 h-4 w-4 accent-teal-700" />
                <span><span className="block text-sm font-bold text-slate-900">Include a video popup</span><span className="mt-1 block text-xs leading-5 text-slate-600">Turn this on only when you want the selected video to appear in the enrollment ad. Uploaded videos are saved to your library either way.</span></span>
              </label>
              <div className="mt-4 space-y-4">
                  <p role="status" className={`text-xs font-semibold ${campaign.video_attached ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {campaign.video_attached ? 'A video is attached to this campaign.' : 'No video is attached yet.'}
                    {campaign.video_attached && !campaign.video_enabled ? ' It will remain hidden from the popup until you enable it.' : ''}
                  </p>
                  <div className="flex w-fit rounded-lg border border-slate-200 bg-slate-50 p-1">
                    <button type="button" onClick={() => { setVideoSource('upload'); if (campaign.video_type !== 'upload') updateCampaign({ video_url: '', video_type: null }); }} className={`rounded-md px-3 py-2 text-xs font-bold ${videoSource === 'upload' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Uploaded videos</button>
                    <button type="button" onClick={() => { setVideoSource('link'); if (campaign.video_type !== 'embed') updateCampaign({ video_url: '', video_type: null }); }} className={`rounded-md px-3 py-2 text-xs font-bold ${videoSource === 'link' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Use video link</button>
                  </div>
                  {videoSource === 'upload' ? (
                    <div className="space-y-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                      <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                        Attach an uploaded video
                        <select
                          value={campaign.video_type === 'upload' ? campaign.video_url ?? '' : ''}
                          onChange={(event) => updateCampaign({ video_url: event.target.value || '', video_type: event.target.value ? 'upload' : null })}
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-slate-900"
                        >
                          <option value="">No video selected</option>
                          {(campaign.video_library ?? []).map((video) => (
                            <option key={video.path} value={video.path}>{video.path.split('/').pop()} ({(video.size / (1024 * 1024)).toFixed(1)} MB)</option>
                          ))}
                        </select>
                      </label>
                      <label className="flex cursor-pointer flex-col items-center gap-2 text-center">
                        <UploadCloud className="h-6 w-6 text-teal-700" />
                        <span className="text-sm font-bold text-slate-800">{uploadingVideo ? 'Uploading video…' : 'Choose a video from your device'}</span>
                        <span className="text-xs text-slate-500">MP4 or WebM · Maximum 360 MB</span>
                        <input type="file" accept="video/mp4,video/webm,.mp4,.webm" disabled={uploadingVideo} onChange={(event) => { void uploadVideo(event.target.files?.[0]); event.currentTarget.value = ''; }} className="sr-only" />
                      </label>
                      {uploadingVideo && uploadProgress !== null && (
                        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3" role="status" aria-live="polite">
                          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold text-slate-600">
                            <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin text-teal-700" />{uploadProgress === 100 ? 'Processing upload…' : 'Uploading video…'}</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <div role="progressbar" aria-label="Video upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={uploadProgress} className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-teal-600 transition-[width]" style={{ width: `${uploadProgress}%` }} />
                          </div>
                        </div>
                      )}
                      {campaign.video_type === 'upload' && campaign.video_url && (
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                          <span className="truncate text-xs font-semibold text-slate-600">{campaign.video_url.split('/').pop()}</span>
                          <button type="button" onClick={() => updateCampaign({ video_url: '', video_type: null })} aria-label="Remove uploaded video" className="shrink-0 rounded p-1 text-slate-500 hover:bg-rose-50 hover:text-rose-600"><X className="h-4 w-4" /></button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                      YouTube or Vimeo video URL
                      <input required={campaign.video_enabled} type="url" maxLength={2048} value={campaign.video_type === 'embed' ? campaign.video_url ?? '' : ''} onChange={(event) => updateCampaign({ video_url: event.target.value, video_type: 'embed' })} placeholder="https://youtu.be/… or https://vimeo.com/…" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-900 outline-none focus:border-teal-600" />
                      <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-slate-500">Paste a share link. Only secure YouTube and Vimeo links are accepted.</span>
                    </label>
                  )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                Apply button destination
                <select value={campaign.apply_url} onChange={(event) => updateCampaign({ apply_url: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-slate-900">
                  {linkOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                Know more destination
                <select value={campaign.know_more_url} onChange={(event) => updateCampaign({ know_more_url: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-slate-900">
                  {linkOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-4">
              <button type="submit" disabled={saving || uploadingVideo || (campaign.video_enabled && !campaign.video_url)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving campaign…' : 'Save campaign'}
              </button>
            </div>
          </section>

          <section className="h-fit overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4"><Eye className="h-4 w-4 text-slate-500" /><h2 className="text-sm font-black text-slate-900">Popup preview</h2><span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-slate-400">Approximate</span></div>
            <div className="bg-slate-100 p-4 sm:p-6">
              <div className="mx-auto max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
                <div className="bg-[#10283a] p-5 text-white sm:p-7">
                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/30 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-200"><GraduationCap className="h-3.5 w-3.5" /> Applications now open</span>
                  <h3 className="mt-4 text-2xl font-black leading-tight sm:text-3xl">{campaign.title || 'Your campaign headline'}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-100">Applications are open. {campaign.description}</p>
                </div>
                <div className="space-y-3 p-5">
                  {campaign.video_enabled && (
                    campaign.video_type === 'upload' && campaign.video_url
                      ? <EnrollmentCampaignVideoPlayer src={assetUrl(campaign.video_url)} title="Enrollment campaign preview" />
                      : getVideoPreviewUrl(campaign.video_type === 'embed' ? campaign.video_url ?? '' : '')
                      ? <div className="aspect-video overflow-hidden rounded-xl bg-slate-950"><iframe title="Campaign video preview" src={getVideoPreviewUrl(campaign.video_url ?? '') ?? ''} sandbox="allow-scripts allow-same-origin allow-presentation" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="h-full w-full" /></div>
                      : <div className="flex aspect-video items-center justify-center gap-2 rounded-xl bg-slate-900 text-xs font-semibold text-white/80"><Video className="h-5 w-5" /> Add a valid YouTube or Vimeo URL to preview it</div>
                  )}
                  <div className="flex items-center justify-between rounded-xl bg-rhema-red px-4 py-3 text-sm font-black text-white">Apply now <span aria-hidden="true">→</span></div>
                  <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">Know more</div>
                  {!campaign.enabled && <p className="text-center text-xs font-bold text-amber-700">Campaign is paused and will not display publicly.</p>}
                </div>
              </div>
            </div>
            <p className="flex items-center gap-2 px-5 py-4 text-xs leading-5 text-slate-500"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> The campaign appears on the public website while enrollment is open and the campaign is enabled.</p>
          </section>
        </form>
      )}
    </div>
  );
}
