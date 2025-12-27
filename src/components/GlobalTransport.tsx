import React, { useMemo, useState } from "react";
import styles from "./GlobalTransport.module.css";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";

interface Track {
  title: string;
  duration?: number | null;
}

interface Props {
  tracks: Track[];
  currentIndex: number;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (ratio: number) => void;
}

const formatTime = (seconds?: number | null) => {
  if (!Number.isFinite(seconds ?? undefined) || (seconds ?? 0) < 0) return "0:00";
  const whole = Math.floor(seconds ?? 0);
  const mins = Math.floor(whole / 60);
  const secs = (whole % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

const GlobalTransport: React.FC<Props> = ({
  tracks: inputTracks = [],
  currentIndex,
  isPlaying,
  duration,
  currentTime,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
}) => {
  const tracks = useMemo(() => inputTracks ?? [], [inputTracks]);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const handleProgressClick = (clientX: number, element: HTMLDivElement | null) => {
    if (!element || duration <= 0) return;
    const rect = element.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    onSeek(ratio);
  };

  const progressRatio =
    duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  const currentTrackTitle = tracks[currentIndex]?.title ?? "Now Playing";

  return (
    <div className={styles.controls}>
      <div className={styles.transport}>
        <div className={styles.transportButtons}>
          <button className={styles.pillButton} onClick={onPrev} aria-label="Previous track">
            <SkipBack size={16} />
          </button>
          <button
            className={`${styles.pillButton} ${styles.primary}`}
            onClick={onPlayPause}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>
          <button className={styles.pillButton} onClick={onNext} aria-label="Next track">
            <SkipForward size={16} />
          </button>
        </div>
        <div className={styles.nowPlaying}>
          <small>Now Playing</small>
          <strong>{currentTrackTitle}</strong>
        </div>
      </div>

      <div className={styles.progressWrap}>
        <div
          className={styles.progress}
          onClick={(e) => handleProgressClick(e.clientX, e.currentTarget)}
          onMouseDown={(event) => {
            setIsScrubbing(true);
            handleProgressClick(event.clientX, event.currentTarget);

            const handleMove = (moveEvent: MouseEvent) =>
              handleProgressClick(moveEvent.clientX, event.currentTarget);
            const handleUp = (upEvent: MouseEvent) => {
              setIsScrubbing(false);
              handleProgressClick(upEvent.clientX, event.currentTarget);
              window.removeEventListener("mousemove", handleMove);
              window.removeEventListener("mouseup", handleUp);
            };

            window.addEventListener("mousemove", handleMove);
            window.addEventListener("mouseup", handleUp);
          }}
          onMouseUp={() => setIsScrubbing(false)}
        >
          <div
            className={styles.progressFill}
            style={{ width: `${progressRatio * 100}%` }}
          />
        </div>
        <div className={styles.time}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalTransport;
