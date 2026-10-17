'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, CreditCard, Download, ExternalLink, FileText, Headphones, Loader2, LockKeyhole, Play, Search } from 'lucide-react';
import { api, assetUrl } from '@/lib/api';
import { openFlutterwaveInlineCheckout, type FlutterwaveInlineCheckout } from '@/lib/flutterwave-inline';
import { useStudentAudio, type AudioSession } from '@/components/students/StudentAudioPlayer';

type CourseResource = {
  id: number;
  resource_type: string;
  title: string;
  course_id: string;
  course_name: string;
  session_name: string | null;
  description: string | null;
  file_url: string | null;
  external_url: string | null;
  created_at: string;
};

type SessionAudioResource = {
  id: number;
  title: string;
  description: string | null;
  rhema_course_id: string;
  course_name: string;
  rhema_session_id: string | null;
  session_date: string | null;
  start_time: string | null;
  end_time: string | null;
  duration_seconds: number;
  price: number;
  currency: string;
  required_for_absence: boolean;
  has_access: boolean;
  audio_url: string | null;
  created_at: string;
};

type ApiResponse<T> = { success: boolean; message?: string; data: T };

function isApiResponse<T>(
  value: unknown,
  isData: (data: unknown) => data is T,
): value is ApiResponse<T> {
  if (!value || typeof value !== 'object') return false;
  const response = value as { success?: unknown; message?: unknown; data?: unknown };
  return response.success === true && isData(response.data);
}

function isCourseResourceList(value: unknown): value is Array<Omit<CourseResource, 'id'> & { id: number | string }> {
  return Array.isArray(value) && value.every((resource) =>
    resource && typeof resource === 'object'
    && (typeof resource.id === 'number' || (typeof resource.id === 'string' && /^\d+$/.test(resource.id)))
    && typeof resource.title === 'string'
    && typeof resource.course_name === 'string'
  );
}

function isSessionAudioList(value: unknown): value is Array<Record<string, unknown>> {
  return Array.isArray(value) && value.every((resource) =>
    resource && typeof resource === 'object'
    && (typeof resource.id === 'number' || (typeof resource.id === 'string' && /^\d+$/.test(resource.id)))
    && typeof resource.title === 'string'
    && typeof resource.course_name === 'string'
    && (typeof resource.has_access === 'boolean' || resource.has_access === 0 || resource.has_access === 1 || resource.has_access === '0' || resource.has_access === '1')
  );
}

function normalizeSessionAudio(resource: Record<string, unknown>): SessionAudioResource {
  return {
    id: Number(resource.id),
    title: String(resource.title),
    description: typeof resource.description === 'string' ? resource.description : null,
    rhema_course_id: String(resource.rhema_course_id ?? ''),
    course_name: String(resource.course_name),
    rhema_session_id: typeof resource.rhema_session_id === 'string' ? resource.rhema_session_id : null,
    session_date: typeof resource.session_date === 'string' ? resource.session_date : null,
    start_time: typeof resource.start_time === 'string' ? resource.start_time : null,
    end_time: typeof resource.end_time === 'string' ? resource.end_time : null,
    duration_seconds: Number(resource.duration_seconds) || 0,
    price: Number(resource.price) || 0,
    currency: typeof resource.currency === 'string' ? resource.currency : 'ZMW',
    required_for_absence: resource.required_for_absence === true || resource.required_for_absence === 1 || resource.required_for_absence === '1',
    has_access: resource.has_access === true || resource.has_access === 1 || resource.has_access === '1',
    audio_url: typeof resource.audio_url === 'string' && resource.audio_url ? resource.audio_url : null,
    created_at: typeof resource.created_at === 'string' ? resource.created_at : '',
  };
}

function formatSessionTime(audio: SessionAudioResource): string {
  if (!audio.session_date) return 'Session date unavailable';
  const date = new Date(`${audio.session_date}T00:00:00`);
  const formattedDate = Number.isNaN(date.getTime()) ? audio.session_date : date.toLocaleDateString();
  const time = audio.start_time && audio.end_time ? ` · ${audio.start_time.slice(0, 5)}–${audio.end_time.slice(0, 5)}` : '';
  return `${formattedDate}${time}`;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds ? `${minutes}:${String(remainingSeconds).padStart(2, '0')}` : `${minutes} min`;
}

export default function StudentLibraryPage() {
  const { playAudio, setPlaylist } = useStudentAudio();
  const [resources, setResources] = useState<CourseResource[]>([]);
  const [audioResources, setAudioResources] = useState<SessionAudioResource[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [audioError, setAudioError] = useState('');
  const [audioNotice, setAudioNotice] = useState('');
  const [purchasingAudioId, setPurchasingAudioId] = useState<number | null>(null);
  const [downloadingAudioId, setDownloadingAudioId] = useState<number | null>(null);
  const handledAudioReturn = useRef(false);

  const refreshAudioResources = useCallback(async () => {
    const response: unknown = await api.audio.myResources();
    if (!isApiResponse(response, isSessionAudioList)) {
      throw new Error('The session audio response was invalid.');
    }
    setAudioResources(response.data.map(normalizeSessionAudio));
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      Promise.allSettled([api.library.myResources(), refreshAudioResources()])
        .then(([materialsResult, audioResult]) => {
          if (!active) return;

          if (materialsResult.status === 'fulfilled') {
            if (!isApiResponse(materialsResult.value, isCourseResourceList)) {
              setError('The course materials response was invalid.');
            } else {
              setResources(materialsResult.value.data.map((resource) => ({ ...resource, id: Number(resource.id) })));
            }
          } else {
            setError(materialsResult.reason instanceof Error ? materialsResult.reason.message : 'Unable to load course materials.');
          }

          if (audioResult.status === 'rejected') {
            setAudioError(audioResult.reason instanceof Error ? audioResult.reason.message : 'Unable to load session audio.');
          }
        })
        .finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [refreshAudioResources]);

  useEffect(() => {
    const parameters = new URLSearchParams(window.location.search);
    const transactionId = parameters.get('transaction_id');
    const reference = parameters.get('tx_ref');
    const paymentStatus = parameters.get('status');
    if (handledAudioReturn.current || (!transactionId && !paymentStatus)) return;
    handledAudioReturn.current = true;

    const clearCheckoutParameters = () => window.history.replaceState({}, '', window.location.pathname);
    if (!transactionId || !reference) {
      queueMicrotask(() => {
        setAudioError('Audio purchase was not completed. No access has been granted.');
        clearCheckoutParameters();
      });
      return;
    }

    let active = true;
    queueMicrotask(() => {
      if (active) setAudioNotice('Confirming your audio payment securely...');
    });
    api.audio.verifyStudentPurchase(transactionId, reference)
      .then(async (response: { message?: string }) => {
        if (!active) return;
        setAudioNotice(response.message || 'Payment confirmed. Your audio is now available.');
        try {
          await refreshAudioResources();
        } catch (cause) {
          if (active) setAudioError(cause instanceof Error ? cause.message : 'Payment was confirmed, but the audio list could not be refreshed.');
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setAudioNotice('');
          setAudioError(cause instanceof Error ? cause.message : 'Unable to confirm your audio payment.');
        }
      })
      .finally(() => {
        if (!active) return;
        clearCheckoutParameters();
      });
    return () => { active = false; };
  }, [refreshAudioResources]);

  const buyAudio = async (audio: SessionAudioResource) => {
    setPurchasingAudioId(audio.id);
    setAudioError('');
    setAudioNotice('');
    try {
      const response = await api.audio.initiateStudentPurchase({
        audio_id: audio.id,
      }) as { data: FlutterwaveInlineCheckout };
      await openFlutterwaveInlineCheckout(response.data, async (transaction) => {
        const transactionId = String(transaction.transaction_id ?? '');
        if (!/^\d+$/.test(transactionId) || transaction.tx_ref !== response.data.reference) {
          setAudioError('Flutterwave returned invalid payment details. The payment has not been confirmed.');
          setPurchasingAudioId(null);
          return;
        }
        setAudioNotice('Confirming your audio payment securely...');
        try {
          const verification = await api.audio.verifyStudentPurchase(transactionId, response.data.reference) as { message?: string };
          setAudioNotice(verification.message || 'Payment confirmed. Your audio is now available.');
          await refreshAudioResources();
        } catch (cause) {
          setAudioNotice('');
          setAudioError(cause instanceof Error ? cause.message : 'Unable to confirm your audio payment.');
        } finally {
          setPurchasingAudioId(null);
        }
      }, () => {
        setPurchasingAudioId(null);
        setAudioNotice('Checkout closed. No purchase was confirmed.');
      });
    } catch (cause) {
      setAudioError(cause instanceof Error ? cause.message : 'Unable to start the audio purchase.');
      setPurchasingAudioId(null);
    }
  };

  const downloadAudio = async (audio: SessionAudioResource) => {
    setDownloadingAudioId(audio.id);
    setAudioError('');
    try {
      const file = await api.audio.downloadMyAudio(audio.id) as Blob;
      const objectUrl = URL.createObjectURL(file);
      const link = document.createElement('a');
      const extension = audio.audio_url?.split('?')[0].split('.').pop()?.match(/^[a-z0-9]{1,8}$/i)?.[0] || 'mp3';
      const filename = `${audio.title.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '') || 'session-audio'}.${extension}`;
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (cause) {
      setAudioError(cause instanceof Error ? cause.message : `Unable to download ${audio.title}.`);
    } finally {
      setDownloadingAudioId(null);
    }
  };

  const normalizedQuery = query.trim().toLowerCase();
  const filteredResources = useMemo(() => {
    if (!normalizedQuery) return resources;
    return resources.filter((resource) =>
      `${resource.title} ${resource.course_name} ${resource.session_name || ''} ${resource.description || ''}`.toLowerCase().includes(normalizedQuery)
    );
  }, [normalizedQuery, resources]);
  const filteredAudioResources = useMemo(() => {
    if (!normalizedQuery) return audioResources;
    return audioResources.filter((resource) =>
      `${resource.title} ${resource.course_name} ${resource.rhema_session_id || ''} ${resource.session_date || ''} ${resource.description || ''}`.toLowerCase().includes(normalizedQuery)
    );
  }, [normalizedQuery, audioResources]);
  const accessibleAudioTracks = useMemo(() => audioResources
    .filter((audio) => audio.has_access && audio.audio_url)
    .map((audio): AudioSession => ({
      id: audio.id,
      title: audio.title,
      url: audio.audio_url!,
      course: audio.course_name,
      session: audio.rhema_session_id ? `Session ${audio.rhema_session_id}` : formatSessionTime(audio),
      duration: audio.duration_seconds,
    })), [audioResources]);

  useEffect(() => {
    setPlaylist(accessibleAudioTracks);
  }, [accessibleAudioTracks, setPlaylist]);

  const hasResults = filteredResources.length > 0 || filteredAudioResources.length > 0;

  return (
    <main className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-black text-slate-900">Course library</h1>
        <p className="mt-1 text-sm text-slate-500">Published learning materials and session audio for your enrolled courses.</p>
      </header>

      <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search materials, audio or courses"
          aria-label="Search library materials and session audio"
          className="w-full bg-transparent text-sm text-slate-800 outline-none"
        />
      </label>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {audioError && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{audioError}</div>}
      {audioNotice && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4 shrink-0" />{audioNotice}</div>}

      {loading ? (
        <div className="flex items-center gap-2 p-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading course materials and session audio…</div>
      ) : !hasResults ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          {resources.length || audioResources.length ? 'No library items match your search.' : 'No published materials or session audio are available for your enrolled courses yet.'}
        </div>
      ) : (
        <div className="space-y-8">
          {filteredAudioResources.length > 0 && (
            <section className="space-y-4" aria-labelledby="session-audio-heading">
              <div>
                <h2 id="session-audio-heading" className="text-lg font-black text-slate-900">Session audio</h2>
                <p className="mt-1 text-sm text-slate-500">Audio linked to scheduled sessions in your enrolled courses.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {filteredAudioResources.map((audio) => {
                  const playableUrl = audio.has_access && audio.audio_url ? assetUrl(audio.audio_url) : '';
                  const externalAudioUrl = audio.audio_url?.startsWith('https://') ? audio.audio_url : '';
                  const duration = formatDuration(audio.duration_seconds);
                  return (
                    <article key={audio.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="rounded-xl bg-violet-50 p-3 text-violet-900"><Headphones className="h-5 w-5" /></div>
                        <div className="flex flex-wrap justify-end gap-2">
                          {audio.required_for_absence && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-800">Missed-session audio</span>}
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${audio.has_access ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                            {audio.has_access ? 'Available' : 'Access required'}
                          </span>
                        </div>
                      </div>
                      <p className="mt-4 text-xs font-bold uppercase tracking-wide text-blue-900">{audio.course_name} · {formatSessionTime(audio)}</p>
                      <h3 className="mt-1 font-bold text-slate-900">{audio.title}</h3>
                      {audio.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-slate-600">{audio.description}</p>}
                      <p className="mt-2 text-xs text-slate-500">
                        {duration ? `Duration ${duration} · ` : ''}
                        {audio.price > 0 ? `${audio.currency} ${audio.price.toFixed(2)}` : 'Free'}
                      </p>
                      {playableUrl ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const track = accessibleAudioTracks.find((item) => item.id === audio.id);
                              if (track) playAudio(track);
                            }}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800"
                          >
                            <Play className="h-3.5 w-3.5" /> Play in audio player
                          </button>
                          {externalAudioUrl ? (
                            <a href={externalAudioUrl} download className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                              <Download className="h-3.5 w-3.5" /> Download audio
                            </a>
                          ) : (
                            <button type="button" onClick={() => void downloadAudio(audio)} disabled={downloadingAudioId !== null} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60">
                              {downloadingAudioId === audio.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                              {downloadingAudioId === audio.id ? 'Preparing download…' : 'Download audio'}
                            </button>
                          )}
                        </div>
                      ) : audio.has_access ? (
                        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Audio playback is not configured for this resource. Please contact the school administrator.</p>
                      ) : (
                        <div className="mt-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
                          <div>
                            <p>Purchase this session audio to unlock playback.</p>
                            {audio.price > 0 ? (
                              <button
                                type="button"
                                onClick={() => void buyAudio(audio)}
                                disabled={purchasingAudioId !== null}
                                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-900 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {purchasingAudioId === audio.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                                {purchasingAudioId === audio.id ? 'Starting checkout…' : `Buy audio · ${audio.currency} ${audio.price.toFixed(2)}`}
                              </button>
                            ) : (
                              <p className="mt-1 text-amber-800">Online purchase is unavailable because a price has not been set. Contact the school office.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {filteredResources.length > 0 && (
            <section className="space-y-4" aria-labelledby="course-materials-heading">
              <div>
                <h2 id="course-materials-heading" className="text-lg font-black text-slate-900">Course materials</h2>
                <p className="mt-1 text-sm text-slate-500">Published readings and learning materials for your enrolled courses.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {filteredResources.map((resource) => {
                  const href = resource.external_url || (resource.file_url ? assetUrl(resource.file_url) : '');
                  return (
                    <article key={resource.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="rounded-xl bg-blue-50 p-3 text-blue-900"><FileText className="h-5 w-5" /></div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-600">{resource.resource_type}</span>
                      </div>
                      <p className="mt-4 text-xs font-bold uppercase tracking-wide text-blue-900">{resource.course_name}{resource.session_name ? ` · ${resource.session_name}` : ''}</p>
                      <h3 className="mt-1 font-bold text-slate-900">{resource.title}</h3>
                      {resource.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-slate-600">{resource.description}</p>}
                      {href && <a href={href} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-800 hover:underline">Open material <ExternalLink className="h-4 w-4" /></a>}
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
