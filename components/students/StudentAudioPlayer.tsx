'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Headphones, ListMusic, Maximize2, Minimize2, Pause, Play, SkipBack, SkipForward, Volume2, X } from 'lucide-react';
import { assetUrl } from '@/lib/api';

export type AudioSession = {
  id: number;
  title: string;
  url: string;
  course: string;
  session: string;
  duration: number;
};

export const formatAudioTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
};

type StudentAudioContextValue = {
  setPlaylist: (audio: AudioSession[]) => void;
  playAudio: (audio: AudioSession) => void;
};

const StudentAudioContext = createContext<StudentAudioContextValue | null>(null);

export function useStudentAudio() {
  const context = useContext(StudentAudioContext);
  if (!context) throw new Error('useStudentAudio must be used inside StudentAudioProvider');
  return context;
}

export function StudentAudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playlist, setPlaylist] = useState<AudioSession[]>([]);
  const [currentTrack, setCurrentTrack] = useState<AudioSession | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [error, setError] = useState('');

  const tracks = useMemo(() => {
    const uniqueTracks = new Map(playlist.map((track) => [track.id, track]));
    if (currentTrack && !uniqueTracks.has(currentTrack.id)) uniqueTracks.set(currentTrack.id, currentTrack);
    return [...uniqueTracks.values()];
  }, [currentTrack, playlist]);

  useEffect(() => {
    const player = audioRef.current;
    if (!player || !currentTrack) return;
    player.src = assetUrl(currentTrack.url);
    player.load();
    setCurrentTime(0);
    setDuration(0);
    void player.play().then(() => setError('')).catch((cause: unknown) => {
      setIsPlaying(false);
      setError(cause instanceof Error ? cause.message : 'Unable to play this audio.');
    });
  }, [currentTrack]);

  const playAudio = (audio: AudioSession) => {
    setError('');
    if (currentTrack?.id === audio.id && audioRef.current) {
      audioRef.current.currentTime = 0;
      void audioRef.current.play().catch((cause: unknown) => {
        setIsPlaying(false);
        setError(cause instanceof Error ? cause.message : 'Unable to play this audio.');
      });
      setQueueOpen(false);
      return;
    }
    setCurrentTrack(audio);
    setQueueOpen(false);
  };

  const playRelativeTrack = (offset: number) => {
    if (!currentTrack || tracks.length < 2) return;
    const currentIndex = tracks.findIndex((track) => track.id === currentTrack.id);
    const nextIndex = (currentIndex + offset + tracks.length) % tracks.length;
    playAudio(tracks[nextIndex]);
  };

  const closePlayer = () => {
    audioRef.current?.pause();
    setCurrentTrack(null);
    setIsPlaying(false);
    setQueueOpen(false);
    setError('');
  };

  const togglePlayback = () => {
    const player = audioRef.current;
    if (!player || !currentTrack) return;
    if (player.paused) {
      void player.play().catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Unable to play this audio.');
      });
    } else {
      player.pause();
    }
  };

  const seek = (seconds: number) => {
    const player = audioRef.current;
    if (!player || !Number.isFinite(player.duration)) return;
    player.currentTime = Math.max(0, Math.min(player.duration, seconds));
    setCurrentTime(player.currentTime);
  };

  return (
    <StudentAudioContext.Provider value={{ setPlaylist, playAudio }}>
      {children}
      {currentTrack && (
        <section className={`fixed bottom-5 z-40 border-t border-slate-700 bg-slate-950 text-white shadow-2xl transition-all ${isPlayerExpanded ? 'inset-0 min-h-screen' : 'inset-x-0 min-h-[96px] md:left-20 lg:left-64 sm:min-h-[72px]'} ${isPlayerExpanded ? '' : 'rounded-t-2xl'}`} aria-label="Audio player">
          <audio
            ref={audioRef}
            preload="metadata"
            onLoadedMetadata={(event) => {
              const playerDuration = event.currentTarget.duration;
              setDuration(Number.isFinite(playerDuration) ? playerDuration : 0);
              event.currentTarget.volume = volume;
            }}
            onDurationChange={(event) => {
              const playerDuration = event.currentTarget.duration;
              setDuration(Number.isFinite(playerDuration) ? playerDuration : 0);
            }}
            onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false);
              if (tracks.length > 1) playRelativeTrack(1);
            }}
            onError={() => {
              setIsPlaying(false);
              setError('Audio could not be loaded. Check that this resource is available to your account.');
            }}
            className="hidden"
            aria-hidden="true"
          />
          <div className={`relative mx-auto flex h-full w-full flex-col px-3 py-2 pb-4 sm:px-6 sm:py-2.5 sm:pb-4 ${isPlayerExpanded ? 'min-h-screen justify-center' : 'sm:flex-row sm:items-center sm:gap-5'}`}>
            <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-xl border border-slate-600 bg-slate-800 p-0.5 shadow-lg sm:right-5 sm:top-3">
              <button type="button" onClick={() => setIsPlayerExpanded((current) => !current)} className="rounded-lg p-2 text-slate-100 hover:bg-slate-700 hover:text-amber-300" aria-label={isPlayerExpanded ? 'Minimize player' : 'Expand player'}>{isPlayerExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</button>
              <button type="button" onClick={closePlayer} className="rounded-lg bg-red-600 p-2 text-white hover:bg-red-500" aria-label="Close player"><X className="h-4 w-4" /></button>
            </div>
            <div className="mx-auto w-full min-w-0 px-20 text-center sm:flex-1 sm:px-0">
              <div className="flex items-center justify-center gap-2"><Headphones className="h-4 w-4 shrink-0 text-amber-400" /><p className="truncate text-sm font-black sm:text-base">{currentTrack.title}</p></div>
              <p className="mt-1 truncate text-xs text-slate-400">{currentTrack.course} · {currentTrack.session}</p>
            </div>
            <div className="mt-2 flex items-center justify-center gap-1.5 sm:mt-0 sm:shrink-0 sm:gap-2 sm:pr-28">
              <button type="button" onClick={() => playRelativeTrack(-1)} disabled={tracks.length < 2} className="rounded-lg border border-slate-600 bg-slate-800 p-2 text-slate-100 hover:bg-slate-700 hover:text-amber-300 disabled:opacity-40" aria-label="Play previous audio"><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" onClick={() => seek(currentTime - 15)} disabled={!duration} className="inline-flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-800 p-2 text-slate-100 hover:bg-slate-700 disabled:opacity-40" aria-label="Back 15 seconds"><SkipBack className="h-4 w-4" /><span className="text-[9px] font-bold">15s</span></button>
              <button type="button" onClick={togglePlayback} aria-label={isPlaying ? 'Pause audio' : 'Play audio'} className="rounded-full border-2 border-amber-300 bg-amber-500 p-3 text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400">{isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}</button>
              <button type="button" onClick={() => seek(currentTime + 15)} disabled={!duration} className="inline-flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-800 p-2 text-slate-100 hover:bg-slate-700 disabled:opacity-40" aria-label="Forward 15 seconds"><SkipForward className="h-4 w-4" /><span className="text-[9px] font-bold">15s</span></button>
              <button type="button" onClick={() => playRelativeTrack(1)} disabled={tracks.length < 2} className="rounded-lg border border-slate-600 bg-slate-800 p-2 text-slate-100 hover:bg-slate-700 hover:text-amber-300 disabled:opacity-40" aria-label="Play next audio"><ChevronRight className="h-4 w-4" /></button>
              <button type="button" onClick={() => setQueueOpen((current) => !current)} className={`ml-1 rounded-lg border border-slate-600 bg-slate-800 p-2 hover:bg-slate-700 ${queueOpen ? 'text-amber-300' : 'text-slate-100'}`} aria-label="Toggle audio queue"><ListMusic className="h-4 w-4" /></button>
              <Volume2 className="ml-1 hidden h-4 w-4 text-slate-400 sm:block" />
              <input aria-label="Volume" type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => {
                const nextVolume = Number(event.target.value);
                setVolume(nextVolume);
                if (audioRef.current) audioRef.current.volume = nextVolume;
              }} className="hidden w-20 accent-amber-500 sm:block" />
            </div>
            <div className="mt-2 flex items-center gap-2 text-[10px] font-medium tabular-nums text-slate-400">
              <span className="w-9 text-right">{formatAudioTime(currentTime)}</span>
              <input aria-label="Audio progress" type="range" min="0" max={duration || 1} step="0.1" value={Math.min(currentTime, duration || 1)} disabled={!duration} onChange={(event) => seek(Number(event.target.value))} className="h-1.5 min-w-0 flex-1 accent-amber-500 disabled:opacity-40" />
              <span className="w-9">{formatAudioTime(duration)}</span>
            </div>
            {error && <p role="alert" className="mt-1 text-xs text-rose-300">{error}</p>}
            {queueOpen && <div className="absolute bottom-full right-3 mb-2 w-[min(92vw,22rem)] rounded-2xl border border-slate-600 bg-slate-900 p-3 shadow-2xl sm:right-6"><div className="mb-2 flex items-center justify-between"><h3 className="text-xs font-black uppercase tracking-[0.14em] text-white">Available audio</h3><span className="text-[10px] text-slate-400">{tracks.length} tracks</span></div><div className="max-h-60 space-y-1 overflow-y-auto">{tracks.map((track) => <button type="button" key={track.id} onClick={() => playAudio(track)} className={`flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/10 ${track.id === currentTrack.id ? 'bg-amber-500/15 text-amber-300' : 'text-slate-200'}`}><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10"><Play className="h-3 w-3" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{track.title}</span><span className="block text-[10px] text-slate-400">{track.course} · {track.session}</span></span><span className="text-[10px] text-slate-400">{formatAudioTime(track.duration)}</span></button>)}</div></div>}
          </div>
        </section>
      )}
    </StudentAudioContext.Provider>
  );
}
