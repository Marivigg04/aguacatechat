import React, { useEffect, useRef, useState } from 'react';

function formatTime(sec) {
  if (!Number.isFinite(sec)) return '00:00';
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export default function AudioPlayer({ src, className = '' }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [seeking, setSeeking] = useState(false);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onLoaded = () => setDuration(a.duration || 0);
    const onTime = () => {
      if (!seeking) setCurrent(a.currentTime || 0);
    };
    const onEnded = () => setIsPlaying(false);
    a.addEventListener('loadedmetadata', onLoaded);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('ended', onEnded);
    return () => {
      a.removeEventListener('loadedmetadata', onLoaded);
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('ended', onEnded);
    };
  }, [seeking]);

  useEffect(() => {
    // Pause playback when src changes
    setIsPlaying(false);
    setCurrent(0);
    const a = audioRef.current;
    if (a) {
      try { a.pause(); } catch {}
      try { a.currentTime = 0; } catch {}
    }
  }, [src]);

  const togglePlay = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) {
      a.pause();
      setIsPlaying(false);
    } else {
      try {
        await a.play();
        setIsPlaying(true);
      } catch (e) {
        // Autoplay restrictions or other errors
        console.error('Audio play error', e);
      }
    }
  };

  const onSeekStart = () => setSeeking(true);
  const onSeekEnd = (e) => {
    const a = audioRef.current;
    if (!a) return;
    const value = Number(e.target.value);
    const t = (value / 100) * (a.duration || 0);
    try { a.currentTime = t; } catch {}
    setCurrent(t);
    setSeeking(false);
  };
  const onSeekChange = (e) => {
    const a = audioRef.current;
    if (!a) return;
    const value = Number(e.target.value);
    const t = (value / 100) * (a.duration || 0);
    setCurrent(t);
  };

  const progress = duration > 0 ? Math.min(100, Math.max(0, (current / duration) * 100)) : 0;

  return (
    <div className={`audio-player flex items-center gap-3 rounded-lg border theme-border px-3 py-2 ${className}`}
         style={{ background: 'transparent' }}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        type="button"
        onClick={togglePlay}
        className={`shrink-0 w-8 h-8 rounded-full text-white flex items-center justify-center hover:opacity-90 transition-opacity ${isPlaying ? 'bg-red-500' : 'bg-gradient-to-r from-teal-primary to-teal-secondary'}`}
        aria-label={isPlaying ? 'Pausar audio' : 'Reproducir audio'}
        title={isPlaying ? 'Pausar' : 'Reproducir'}
      >
        {isPlaying ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1"></rect>
            <rect x="14" y="5" width="4" height="14" rx="1"></rect>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z"></path>
          </svg>
        )}
      </button>
      <div className="flex items-center gap-2 min-w-[10rem]">
        <span className="text-[11px] opacity-80">{formatTime(current)}</span>
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onMouseDown={onSeekStart}
          onTouchStart={onSeekStart}
          onMouseUp={onSeekEnd}
          onTouchEnd={onSeekEnd}
          onChange={onSeekChange}
          className="audio-range w-40"
          aria-label="Posición de reproducción"
        />
        <span className="text-[11px] opacity-80">{formatTime(duration)}</span>
      </div>
    </div>
  );
}
