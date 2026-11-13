"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";

type EnrollmentCampaignVideoPlayerProps = {
  src: string;
  title?: string;
};

export default function EnrollmentCampaignVideoPlayer({
  src,
  title = "Emit Academy enrollment video",
}: EnrollmentCampaignVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    void video.play().catch(() => setIsPlaying(false));
  }, [src]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused || video.ended) {
      void video.play().catch(() => setIsPlaying(false));
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  return (
    <div className="group relative aspect-video overflow-hidden rounded-2xl bg-slate-950">
      <video
        ref={videoRef}
        title={title}
        src={src}
        autoPlay
        muted
        playsInline
        preload="auto"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        className="h-full w-full object-contain"
      />
      <button
        type="button"
        onClick={togglePlayback}
        aria-label={isPlaying ? "Pause enrollment video" : "Play enrollment video"}
        className={`absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-950 shadow-xl ring-1 ring-white/60 transition hover:scale-105 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 ${
          isPlaying ? "opacity-0 group-hover:opacity-100 focus-visible:opacity-100" : "opacity-100"
        }`}
      >
        {isPlaying ? <Pause className="h-7 w-7 fill-current" /> : <Play className="ml-1 h-7 w-7 fill-current" />}
      </button>
      <button
        type="button"
        onClick={toggleMute}
        aria-label={isMuted ? "Unmute enrollment video" : "Mute enrollment video"}
        aria-pressed={!isMuted}
        className="absolute bottom-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-slate-950/75 text-white transition hover:bg-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
      >
        {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>
    </div>
  );
}
