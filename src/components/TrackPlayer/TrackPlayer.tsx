import React, { useRef, useState, useEffect } from "react";
import styles from "./TrackPlayer.module.css";
import { Play, Pause } from "lucide-react";

interface TrackPlayerProps {
  url: string;
  title: string;
  trackNumber?: number | string | null;
  id?: string;
}

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const whole = Math.floor(seconds);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const TrackPlayer: React.FC<TrackPlayerProps> = ({
  url,
  trackNumber,
  id,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const playerId = id ?? url;

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0–1
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubProgress, setScrubProgress] = useState(0); // 0–1
  const [duration, setDuration] = useState(0); // seconds
  const [currentTime, setCurrentTime] = useState(0); // seconds

  const currentProgress = isScrubbing ? scrubProgress : progress;
  const progressPercent = Math.round(currentProgress * 100);
  const displayTime =
    isScrubbing && duration ? scrubProgress * duration : currentTime;

  const broadcastPlay = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("trackplayer:play", { detail: { id: playerId } })
    );
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!isReady) setIsReady(true);
    if (audio.paused) {
      broadcastPlay();
      audio.play().catch((err) => console.error("Audio play error", err));
    } else {
      audio.pause();
    }
  };

  // Basic playback state listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const markReady = () => {
      setIsReady(true);
      if (audio.duration) {
        setDuration(audio.duration);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    const handleTimeUpdate = () => {
      if (!audio.duration) return;
      const ratio = audio.currentTime / audio.duration;
      setCurrentTime(audio.currentTime);
      if (!isScrubbing) {
        setProgress(ratio);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setScrubProgress(0);
      setCurrentTime(0);
    };

    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      markReady();
    }

    audio.addEventListener("loadedmetadata", markReady);
    audio.addEventListener("canplay", markReady);
    audio.addEventListener("canplaythrough", markReady);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", broadcastPlay);

    return () => {
      audio.removeEventListener("loadedmetadata", markReady);
      audio.removeEventListener("canplay", markReady);
      audio.removeEventListener("canplaythrough", markReady);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", broadcastPlay);
    };
  }, [isScrubbing]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleExternalPlay = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string }>).detail;
      if (!detail) return;
      if (detail.id === playerId) return;
      const audio = audioRef.current;
      if (audio && !audio.paused) {
        audio.pause();
      }
    };

    window.addEventListener("trackplayer:play", handleExternalPlay);
    return () =>
      window.removeEventListener("trackplayer:play", handleExternalPlay);
  }, [playerId]);

  // Helpers for converting pointer position -> progress ratio (0–1)
  const getRatioFromClientX = (clientX: number) => {
    const bar = progressBarRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    const x = clientX - rect.left;
    const ratio = x / rect.width;
    return Math.min(1, Math.max(0, ratio));
  };

  const seekToRatio = (ratio: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const newTime = ratio * audio.duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
    setProgress(ratio);
  };

  // Click to seek
  const handleProgressClick = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    const ratio = getRatioFromClientX(event.clientX);
    seekToRatio(ratio);
  };

  // Mouse scrubbing
  const handleMouseDown = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    event.preventDefault();
    const ratio = getRatioFromClientX(event.clientX);
    setIsScrubbing(true);
    setScrubProgress(ratio);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const moveRatio = getRatioFromClientX(moveEvent.clientX);
      setScrubProgress(moveRatio);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      const upRatio = getRatioFromClientX(upEvent.clientX);
      setIsScrubbing(false);
      seekToRatio(upRatio);

      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Touch scrubbing (simplified)
  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    const ratio = getRatioFromClientX(touch.clientX);
    setIsScrubbing(true);
    setScrubProgress(ratio);
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    const ratio = getRatioFromClientX(touch.clientX);
    setScrubProgress(ratio);
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0];
    if (!touch) {
      setIsScrubbing(false);
      return;
    }
    const ratio = getRatioFromClientX(touch.clientX);
    setIsScrubbing(false);
    seekToRatio(ratio);
  };

  return (
    <div className={styles.root}>
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        crossOrigin="anonymous"
      />

      <button
        type="button"
        className={`${styles.button} ${isPlaying ? styles.active : ""}`}
        onClick={togglePlay}
        disabled={!isReady}
        aria-label={isPlaying ? "Pause" : "Play"}
        aria-pressed={isPlaying}
      >
        <span className={styles.index}>
          {typeof trackNumber === "number"
            ? trackNumber.toString()
            : (trackNumber ?? "–")}
        </span>
        <span className={styles.iconWrap}>
          {isPlaying ? (
            <Pause size={14} className={styles.icon} />
          ) : (
            <Play size={14} className={styles.icon} />
          )}
        </span>
      </button>

      <div
        ref={progressBarRef}
        className={styles.progress}
        onClick={handleProgressClick}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={styles.progressFill}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className={styles.time}>
        {formatTime(displayTime)} / {formatTime(duration)}
      </div>
    </div>
  );
};

export default TrackPlayer;
