"use client";

import { useEffect, useRef, useState } from "react";
import { absoluteUrl } from "@/config/site";
import { event } from "@/lib/analytics";

const shareUrl = absoluteUrl("/audio");
const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffdd00]";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

function track(action: string) {
  event(action, { track_name: "We Are Leeds", page_path: "/audio" });
}

export function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const viewed = useRef(false);
  const mounted = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [pending, setPending] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [showLink, setShowLink] = useState(false);

  useEffect(() => {
    mounted.current = true;
    const audio = audioRef.current;
    let active = true;
    // Preloaded media may finish before hydration attaches React's handlers.
    queueMicrotask(() => {
      if (!active || !audio) return;
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
      if (audio.error) setError("The track couldn’t load. Check your connection and try again.");
    });
    if (!viewed.current) {
      track("audio_page_view");
      viewed.current = true;
    }
    return () => {
      active = false;
      mounted.current = false;
      audio?.pause();
    };
  }, []);

  async function play() {
    const audio = audioRef.current;
    if (!audio) return;
    setError("");
    setPending(true);
    try {
      if (audio.error) audio.load();
      if (audio.ended) audio.currentTime = 0;
      await audio.play();
    } catch (cause) {
      if (mounted.current && !(cause instanceof DOMException && cause.name === "AbortError")) {
        setError("We couldn’t play the track. Please try again.");
      }
    } finally {
      if (mounted.current) setPending(false);
    }
  }

  async function share() {
    setShareMessage("");
    if (typeof navigator.share !== "function") {
      setShowLink(true);
      setShareMessage("Select and copy the link below to share.");
      track("audio_share");
      return;
    }
    try {
      await navigator.share({ title: "We Are Leeds | LeedsWire", text: "We Are Leeds. Listen on LeedsWire.", url: shareUrl });
      track("audio_share");
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setShowLink(true);
      setShareMessage("Sharing is unavailable. Select and copy the link below.");
    }
  }

  return (
    <section aria-labelledby="audio-title" className="mx-auto max-w-[960px] rounded-[1.15rem] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(14,29,48,0.94),rgba(8,24,42,0.9))] px-5 py-8 shadow-[0_22px_68px_rgba(0,0,0,0.22)] sm:px-10 sm:py-12 lg:p-14">
      <p className="text-xs font-bold tracking-[0.22em] text-[#ffdd00]/85">LEEDSWIRE AUDIO</p>
      <h1 id="audio-title" className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">We Are Leeds</h1>
      <p className="mt-4 text-base leading-7 text-zinc-300 sm:text-lg">A LeedsWire track for the Mighty Whites.</p>

      <audio
        ref={audioRef}
        src="/We-Are-Leeds.wav"
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
        onDurationChange={(e) => setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
        onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
        onPlay={() => {
          setPlaying(true);
          setComplete(false);
          track("audio_play");
        }}
        onPause={(e) => {
          if (!mounted.current) return;
          setPlaying(false);
          if (!e.currentTarget.ended) track("audio_pause");
        }}
        onEnded={() => {
          setPlaying(false);
          setComplete(true);
          track("audio_complete");
        }}
        onError={() => {
          setPlaying(false);
          setPending(false);
          setError("The track couldn’t load. Check your connection and try again.");
        }}
      />

      <div className="mt-10 border-t border-white/10 pt-7 sm:mt-14">
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" disabled={pending} onClick={() => playing ? audioRef.current?.pause() : void play()} className={`flex min-h-14 min-w-32 items-center justify-center gap-3 rounded-full bg-[#ffdd00] px-6 font-bold text-[#071827] disabled:opacity-60 ${focus}`}>
            <span aria-hidden="true">{playing ? "Ⅱ" : "▶"}</span>
            {pending ? "Loading…" : playing ? "Pause" : complete ? "Replay" : "Play"}
          </button>
          <p role="status" className="text-sm text-zinc-300">{pending ? "Loading track…" : playing ? "Now playing" : complete ? "Track finished" : position > 0 ? "Paused" : "Ready to listen"}</p>
        </div>

        <div className="mt-6">
          <label htmlFor="audio-progress" className="sr-only">Playback position</label>
          <input id="audio-progress" type="range" min="0" max={duration || 1} step="0.1" value={Math.min(position, duration || 1)} disabled={!duration} aria-valuetext={`${formatTime(position)} of ${formatTime(duration)}`} onChange={(e) => {
            if (!audioRef.current || !duration) return;
            audioRef.current.currentTime = Number(e.target.value);
            setPosition(Number(e.target.value));
            setComplete(false);
          }} className={`block h-11 w-full cursor-pointer accent-[#ffdd00] disabled:cursor-wait ${focus}`} />
          <div className="flex justify-between text-xs tabular-nums text-zinc-400">
            <span aria-label="Current playback time">{formatTime(position)}</span>
            <span aria-label="Total duration">{duration ? formatTime(duration) : "–:––"}</span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <button type="button" disabled={!duration} onClick={() => {
            if (!audioRef.current) return;
            audioRef.current.currentTime = 0;
            setPosition(0);
            setComplete(false);
          }} className={`min-h-11 text-sm font-medium text-zinc-300 hover:text-white disabled:opacity-40 ${focus}`}>Restart</button>
          <div className="hidden items-center gap-3 sm:flex">
            <label htmlFor="audio-volume" className="text-xs text-zinc-400">Volume</label>
            <input id="audio-volume" type="range" min="0" max="1" step="0.01" value={volume} aria-valuetext={`${Math.round(volume * 100)}%`} onChange={(e) => {
              const value = Number(e.target.value);
              if (audioRef.current) audioRef.current.volume = value;
              setVolume(value);
            }} className={`h-11 w-24 accent-[#ffdd00] ${focus}`} />
          </div>
          <button type="button" onClick={() => void share()} className={`min-h-11 text-xs font-bold tracking-[0.16em] text-zinc-300 hover:text-white ${focus}`}>SHARE</button>
        </div>
        {error && <p role="alert" className="mt-4 text-sm leading-6 text-amber-200">{error}</p>}
        <p role="status" className="mt-3 text-sm text-zinc-400">{shareMessage}</p>
        {showLink && <input aria-label="Share link" readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()} className={`mt-3 min-h-11 w-full min-w-0 rounded-lg border border-white/15 bg-[#06111f] px-3 text-sm text-zinc-300 ${focus}`} />}
      </div>
    </section>
  );
}
