'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Headphones, Pause, Play, SkipBack, SkipForward, Volume2, X } from 'lucide-react';
import { assetUrl } from '@/lib/api';

export type AdminAudioTrack = {
  id: number;
  title: string;
  url: string;
  course: string;
  session: string;
};

type AdminAudioPlayerContextValue = {
  setPlaylist: (tracks: AdminAudioTrack[]) => void;
  playTrack: (track: AdminAudioTrack) => void;
};

const AdminAudioPlayerContext = createContext<AdminAudioPlayerContextValue | null>(null);

export function useAdminAudioPlayer() {
  const context = useContext(AdminAudioPlayerContext);
  if (!context) throw new Error('useAdminAudioPlayer must be used inside AdminAudioPlayerProvider');
  return context;
}

export default function AdminAudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playlist, setPlaylist] = useState<AdminAudioTrack[]>([]);
  const [currentTrack, setCurrentTrack] = useState<AdminAudioTrack | null>(null);
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.75);
  useEffect(() => {
    const player = audioRef.current;
    if (!currentTrack || !player) return;
    player.src = assetUrl(currentTrack.url);
    player.load();
    player.currentTime = 0;
    void player.play().catch((cause: unknown) => {
      setIsPlaying(false);
      setError(cause instanceof Error ? cause.message : 'Unable to play this audio.');
    });
  }, [currentTrack]);

  const tracks = useMemo(() => {
    const available = new Map(playlist.map((track) => [track.id, track]));
    if (currentTrack && !available.has(currentTrack.id)) available.set(currentTrack.id, currentTrack);
    return [...available.values()];
  }, [playlist, currentTrack]);

  const playTrack = (track: AdminAudioTrack) => {
    const player = audioRef.current;
    setError('');
    setCurrentTime(0);
    setDuration(0);
    if (currentTrack?.id === track.id && player) {
      player.currentTime = 0;
      void player.play().catch((cause: unknown) => {
        setIsPlaying(false);
        setError(cause instanceof Error ? cause.message : 'Unable to play this audio.');
      });
      return;
    }
    setCurrentTrack(track);
  };

  const playRelativeTrack = (offset: number) => {
    if (!currentTrack || tracks.length < 2) return;
    const index = tracks.findIndex((track) => track.id === currentTrack.id);
    const nextIndex = (index + offset + tracks.length) % tracks.length;
    playTrack(tracks[nextIndex]);
  };

  const closePlayer = () => {
    audioRef.current?.pause();
    setCurrentTrack(null);
    setIsPlaying(false);
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

  const skip = (seconds: number) => {
    const player = audioRef.current;
    if (!player || !Number.isFinite(player.duration)) return;
    player.currentTime = Math.max(0, Math.min(player.duration, player.currentTime + seconds));
    setCurrentTime(player.currentTime);
  };

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const wholeSeconds = Math.floor(seconds);
    const hours = Math.floor(wholeSeconds / 3600);
    const minutes = Math.floor((wholeSeconds % 3600) / 60);
    const remainder = wholeSeconds % 60;
    return hours
      ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
      : `${minutes}:${String(remainder).padStart(2, '0')}`;
  };

  return (
    <AdminAudioPlayerContext.Provider value={{ setPlaylist, playTrack }}>
      {children}
      {currentTrack && (
        <aside className="fixed inset-x-0 bottom-0 z-[55] border-t border-slate-700 bg-slate-950 px-4 pb-3 pt-3 text-white shadow-2xl md:left-[var(--sidebar-width,260px)]" aria-label="Audio player">
          <audio
            ref={audioRef}
            preload="metadata"
            controlsList="nodownload"
            src={assetUrl(currentTrack.url)}
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
            onEnded={() => setIsPlaying(false)}
            onError={() => {
              setIsPlaying(false);
              setError('Audio could not be loaded. Check the file URL and server access settings.');
            }}
            className="hidden"
            aria-hidden="true"
          />
          <div className="mx-auto max-w-[1600px]">
            <div className="flex items-center gap-3 sm:gap-5">
              <div className="flex min-w-0 flex-1 items-center gap-3 sm:w-64 sm:flex-none">
                <Headphones className="h-5 w-5 shrink-0 text-amber-400" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{currentTrack.title}</p>
                  <p className="truncate text-xs text-slate-400">{currentTrack.course} · {currentTrack.session}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 sm:flex-1 sm:justify-center">
                <button type="button" onClick={() => playRelativeTrack(-1)} disabled={tracks.length < 2} aria-label="Play previous audio" className="hidden rounded-lg p-2 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40 sm:inline-flex"><ChevronLeft className="h-4 w-4" /></button>
                <button type="button" onClick={() => skip(-15)} disabled={!duration} aria-label="Back 15 seconds" className="inline-flex items-center gap-1 rounded-lg p-2 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40"><SkipBack className="h-4 w-4" /><span className="text-[9px] font-bold">15s</span></button>
                <button type="button" onClick={togglePlayback} aria-label={isPlaying ? 'Pause audio' : 'Play audio'} className="rounded-full bg-amber-400 p-2.5 text-slate-950 hover:bg-amber-300">{isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}</button>
                <button type="button" onClick={() => skip(15)} disabled={!duration} aria-label="Forward 15 seconds" className="inline-flex items-center gap-1 rounded-lg p-2 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40"><SkipForward className="h-4 w-4" /><span className="text-[9px] font-bold">15s</span></button>
                <button type="button" onClick={() => playRelativeTrack(1)} disabled={tracks.length < 2} aria-label="Play next audio" className="hidden rounded-lg p-2 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40 sm:inline-flex"><ChevronRight className="h-4 w-4" /></button>
              </div>
              <div className="hidden items-center gap-2 sm:flex sm:w-64 sm:justify-end">
                <Volume2 className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(event) => {
                    const nextVolume = Number(event.target.value);
                    setVolume(nextVolume);
                    if (audioRef.current) audioRef.current.volume = nextVolume;
                  }}
                  aria-label="Volume"
                  className="w-20 accent-amber-400"
                />
                <button type="button" onClick={closePlayer} aria-label="Close audio player" className="ml-2 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-4 w-4" /></button>
              </div>
              <button type="button" onClick={closePlayer} aria-label="Close audio player" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white sm:hidden"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[10px] font-medium tabular-nums text-slate-400">
              <span className="w-9 text-right">{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration || 1}
                step="0.1"
                value={Math.min(currentTime, duration || 1)}
                disabled={!duration}
                onChange={(event) => {
                  const nextTime = Number(event.target.value);
                  setCurrentTime(nextTime);
                  if (audioRef.current) audioRef.current.currentTime = nextTime;
                }}
                aria-label="Seek audio"
                className="admin-audio-seek h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background: `linear-gradient(to right, #fbbf24 0%, #fbbf24 ${duration ? (currentTime / duration) * 100 : 0}%, #475569 ${duration ? (currentTime / duration) * 100 : 0}%, #475569 100%)`,
                }}
              />
              <span className="w-9">{formatTime(duration)}</span>
            </div>
            {error && <p role="alert" className="mt-1 text-xs text-rose-300">{error}</p>}
          </div>
          <style>{`
            .admin-audio-seek::-webkit-slider-thumb {
              appearance: none;
              width: 12px;
              height: 12px;
              border-radius: 9999px;
              background: #fbbf24;
              border: 2px solid #0f172a;
            }
            .admin-audio-seek::-moz-range-thumb {
              width: 9px;
              height: 9px;
              border-radius: 9999px;
              background: #fbbf24;
              border: 2px solid #0f172a;
            }
          `}</style>
        </aside>
      )}
    </AdminAudioPlayerContext.Provider>
  );
}
