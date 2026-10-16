'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Headphones, ListMusic, Maximize2, Minimize2, Pause, Play, SkipBack, SkipForward, Volume2, X } from 'lucide-react';

export type AudioSession = {
  id: string;
  title: string;
  course: string;
  session: string;
  duration: number;
  price: number;
  format: string;
  missed: boolean;
  date: string;
};

export type AssessmentPricingPlan = {
  audioRecording: number;
  requiredAudio: number;
  missedExam: number;
  missedQuiz: number;
  missedAssignment: number;
};

export const audioPricingRules: AssessmentPricingPlan = {
  audioRecording: 20,
  requiredAudio: 25,
  missedExam: 30,
  missedQuiz: 15,
  missedAssignment: 10,
};

export const audioSessions: AudioSession[] = [
  { id: 'AUD-101', title: 'Database Fundamentals', course: 'Database Systems', session: 'Session 1', duration: 1080, price: 15, format: 'MP3', missed: true, date: 'Tue, 19 May' },
  { id: 'AUD-102', title: 'SQL Query Lab', course: 'Database Systems', session: 'Session 2', duration: 1320, price: 20, format: 'MP3', missed: true, date: 'Thu, 21 May' },
  { id: 'AUD-103', title: 'Systems Design Review', course: 'Systems Analysis', session: 'Session 3', duration: 960, price: 18, format: 'MP3', missed: false, date: 'Fri, 22 May' },
  { id: 'AUD-104', title: 'API Routing Workshop', course: 'Advanced Web Architecture', session: 'Session 4', duration: 1500, price: 22, format: 'MP3', missed: false, date: 'Mon, 25 May' },
];

export const formatAudioTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export function downloadAudio(audio: AudioSession) {
  const blob = new Blob([`Student Portal audio preview\n${audio.title}\n${audio.course} - ${audio.session}`], { type: 'audio/mpeg' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${audio.id}-${audio.title.replaceAll(' ', '-').toLowerCase()}.mp3`;
  link.click();
  URL.revokeObjectURL(url);
}

type StudentAudioContextValue = {
  ownedAudio: string[];
  playAudio: (audio: AudioSession) => void;
  purchaseAudio: (audio: AudioSession) => void;
  purchaseBundle: (audios: AudioSession[]) => void;
};

const StudentAudioContext = createContext<StudentAudioContextValue | null>(null);

export function useStudentAudio() {
  const context = useContext(StudentAudioContext);
  if (!context) throw new Error('useStudentAudio must be used inside StudentAudioProvider');
  return context;
}

export function StudentAudioProvider({ children }: { children: React.ReactNode }) {
  const [ownedAudio, setOwnedAudio] = useState<string[]>(['AUD-101']);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(75);

  const playingAudio = audioSessions.find((audio) => audio.id === playingId) ?? null;
  const ownedSessions = useMemo(() => audioSessions.filter((audio) => ownedAudio.includes(audio.id)), [ownedAudio]);
  const playingIndex = ownedSessions.findIndex((audio) => audio.id === playingId);

  useEffect(() => {
    if (!playingAudio || !isPlaying) return;
    const timer = window.setInterval(() => setProgress((current) => current >= 100 ? 0 : current + 1), 1000);
    return () => window.clearInterval(timer);
  }, [playingAudio, isPlaying]);

  const playAudio = (audio: AudioSession) => {
    setPlayingId(audio.id);
    setIsPlaying(true);
    setProgress(0);
  };

  const purchaseAudio = (audio: AudioSession) => {
    setOwnedAudio((current) => current.includes(audio.id) ? current : [...current, audio.id]);
    playAudio(audio);
  };

  const purchaseBundle = (audios: AudioSession[]) => {
    setOwnedAudio((current) => [...new Set([...current, ...audios.map((audio) => audio.id)])]);
    if (audios[0]) playAudio(audios[0]);
  };

  const playNext = () => {
    if (!ownedSessions.length) return;
    playAudio(ownedSessions[(playingIndex + 1) % ownedSessions.length]);
  };

  const playPrevious = () => {
    if (!ownedSessions.length) return;
    playAudio(ownedSessions[(playingIndex - 1 + ownedSessions.length) % ownedSessions.length]);
  };

  return (
    <StudentAudioContext.Provider value={{ ownedAudio, playAudio, purchaseAudio, purchaseBundle }}>
      {children}
      {playingAudio && ownedAudio.includes(playingAudio.id) && <section className={`fixed bottom-5 z-40 border-t border-slate-700 bg-slate-950 text-white shadow-2xl transition-all ${isPlayerExpanded ? 'inset-0 min-h-screen' : 'inset-x-0 min-h-[96px] md:left-20 lg:left-64 sm:min-h-[72px]'} ${isPlayerExpanded ? '' : 'rounded-t-2xl'}`} aria-label="Audio player">
        <div className={`relative mx-auto flex h-full w-full flex-col px-3 py-2 pb-4 sm:px-6 sm:py-2.5 sm:pb-4 ${isPlayerExpanded ? 'min-h-screen justify-center' : 'sm:flex-row sm:items-center sm:gap-5'}`}>
          <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-xl border border-slate-600 bg-slate-800 p-0.5 shadow-lg sm:right-5 sm:top-3">
            <button type="button" onClick={() => setIsPlayerExpanded((current) => !current)} className="rounded-lg p-2 text-slate-100 hover:bg-slate-700 hover:text-amber-300" aria-label={isPlayerExpanded ? 'Minimize player' : 'Expand player'}>{isPlayerExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</button>
            <button type="button" onClick={() => { setPlayingId(null); setIsPlaying(false); setQueueOpen(false); }} className="rounded-lg bg-red-600 p-2 text-white hover:bg-red-500" aria-label="Close player"><X className="h-4 w-4" /></button>
          </div>
          <div className="mx-auto w-full min-w-0 px-20 text-center sm:flex-1 sm:px-0">
            <div className="flex items-center justify-center gap-2"><Headphones className="h-4 w-4 shrink-0 text-amber-400" /><p className="truncate text-sm font-black sm:text-base">{playingAudio.title}</p></div>
            <p className="mt-1 truncate text-xs text-slate-400">{playingAudio.course} • {playingAudio.session}</p>
          </div>
          <div className="mt-2 flex items-center justify-center gap-1.5 sm:mt-0 sm:shrink-0 sm:gap-2 sm:pr-28">
            <button type="button" onClick={playPrevious} className="rounded-lg border border-slate-600 bg-slate-800 p-2 text-slate-100 hover:bg-slate-700 hover:text-amber-300" aria-label="Play previous owned audio"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" onClick={() => setProgress(Math.max(0, progress - 5))} className="rounded-lg border border-slate-600 bg-slate-800 p-2 text-slate-100 hover:bg-slate-700 hover:text-amber-300" aria-label="Back 15 seconds"><SkipBack className="h-4 w-4" /></button>
            <button type="button" onClick={() => setIsPlaying((current) => !current)} className="rounded-full border-2 border-amber-300 bg-amber-500 p-3 text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400" aria-label={isPlaying ? 'Pause audio' : 'Play audio'}>{isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}</button>
            <button type="button" onClick={() => setProgress(Math.min(100, progress + 5))} className="rounded-lg border border-slate-600 bg-slate-800 p-2 text-slate-100 hover:bg-slate-700 hover:text-amber-300" aria-label="Forward 15 seconds"><SkipForward className="h-4 w-4" /></button>
            <button type="button" onClick={playNext} className="rounded-lg border border-slate-600 bg-slate-800 p-2 text-slate-100 hover:bg-slate-700 hover:text-amber-300" aria-label="Play next owned audio"><ChevronRight className="h-4 w-4" /></button>
            <button type="button" onClick={() => setQueueOpen((current) => !current)} className={`ml-1 rounded-lg border border-slate-600 bg-slate-800 p-2 hover:bg-slate-700 ${queueOpen ? 'text-amber-300' : 'text-slate-100'}`} aria-label="Toggle audio queue"><ListMusic className="h-4 w-4" /></button>
            <Volume2 className="ml-1 hidden h-4 w-4 text-slate-400 sm:block" /><input aria-label="Volume" type="range" min="0" max="100" value={volume} onChange={(event) => setVolume(Number(event.target.value))} className="hidden w-20 accent-amber-500 sm:block" />
          </div>
          <div className="absolute bottom-0 left-0 right-0"><input aria-label="Audio progress" type="range" min="0" max="100" value={progress} onChange={(event) => setProgress(Number(event.target.value))} className="block h-1 w-full cursor-pointer accent-amber-500" /></div>
          {queueOpen && <div className="absolute bottom-full right-3 mb-2 w-[min(92vw,22rem)] rounded-2xl border border-slate-600 bg-slate-900 p-3 shadow-2xl sm:right-6"><div className="mb-2 flex items-center justify-between"><h3 className="text-xs font-black uppercase tracking-[0.14em] text-white">Your audio queue</h3><span className="text-[10px] text-slate-400">{ownedSessions.length} owned</span></div><div className="max-h-60 space-y-1 overflow-y-auto">{ownedSessions.map((audio) => <button type="button" key={audio.id} onClick={() => playAudio(audio)} className={`flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/10 ${audio.id === playingAudio.id ? 'bg-amber-500/15 text-amber-300' : 'text-slate-200'}`}><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10"><Play className="h-3 w-3" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{audio.title}</span><span className="block text-[10px] text-slate-400">{audio.course} • {audio.session}</span></span><span className="text-[10px] text-slate-400">{formatAudioTime(audio.duration)}</span></button>)}</div></div>}
        </div>
      </section>}
    </StudentAudioContext.Provider>
  );
}
