import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./Player.module.css";
import GlobalTransport from "./GlobalTransport";

interface Track {
  track_number?: number | null;
  slug?: string;
  title: string;
  url: string;
  duration?: number | null;
  album: string;
  artist: string;
  cover_art: string;
  producer?: string | null;
  writer?: string | null;
  credits?: string[];
  asset_id: string;
}

interface Album {
  album: string;
  artist: string;
  cover_art: string;
  tracks: Track[];
}

interface Props {
  album: Album;
  compact?: boolean;
}

const formatDuration = (seconds?: number | null) => {
  if (!Number.isFinite(seconds ?? undefined)) return "–";
  const whole = Math.round(seconds ?? 0);
  const mins = Math.floor(whole / 60);
  const secs = (whole % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

const formatTime = (seconds?: number | null) => {
  if (!Number.isFinite(seconds ?? undefined) || (seconds ?? 0) < 0)
    return "0:00";
  const whole = Math.floor(seconds ?? 0);
  const mins = Math.floor(whole / 60);
  const secs = (whole % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

const Player: React.FC<Props> = ({ album, compact = false }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const tracks = useMemo(() => album.tracks ?? [], [album.tracks]);
  const totalTracks = tracks.length;

  const loadTrack = (index: number, autoplay = false) => {
    const audio = audioRef.current;
    const track = tracks[index];
    if (!audio || !track) return;

    setCurrentIndex(index);
    audio.src = track.url;
    audio.load();
    setCurrentTime(0);
    setDuration(track.duration ?? 0);
    if (autoplay) {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.error("Audio play error", err));
    } else {
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    console.log("togle");
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.error("Audio play error", err));
    } else {
      audio.pause();
    }
  };

  const playNext = () => {
    const nextIndex = (currentIndex + 1) % totalTracks;
    loadTrack(nextIndex, true);
  };

  const playPrev = () => {
    const prevIndex = (currentIndex - 1 + totalTracks) % totalTracks;
    loadTrack(prevIndex, true);
  };

  const seekToRatio = (ratio: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const newTime = ratio * audio.duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleProgressClick = (clientX: number) => {
    const bar = progressRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    seekToRatio(ratio);
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    setIsScrubbing(true);
    handleProgressClick(event.clientX);

    const handleMove = (moveEvent: MouseEvent) => {
      handleProgressClick(moveEvent.clientX);
    };
    const handleUp = (upEvent: MouseEvent) => {
      setIsScrubbing(false);
      handleProgressClick(upEvent.clientX);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoaded = () => {
      if (audio.duration) {
        setDuration(audio.duration);
      }
    };
    const handleTimeUpdate = () => {
      if (!isScrubbing) {
        setCurrentTime(audio.currentTime);
      }
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      playNext();
    };

    audio.addEventListener("loadedmetadata", handleLoaded);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoaded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScrubbing, currentIndex, totalTracks]);

  useEffect(() => {
    if (tracks.length > 0) {
      loadTrack(0, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks]);

  const progressRatio =
    duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  return (
    <section
      className={`${styles.albumSection} ${compact ? styles.compact : ""}`}
    >
      <header className={styles.hero}>
        <div className={styles.coverWrap}>
          <img
            src={album.cover_art}
            alt={`${album.album} cover art`}
            className={styles.cover}
            loading="lazy"
          />
        </div>

        <div className={styles.meta}>
          <p className={styles.eyebrow}>Album</p>
          <h2 className={styles.title}>{album.album}</h2>
          <h3 className={styles.artist}>{album.artist}</h3>
          <p className={styles.summary}>
            {totalTracks} track{totalTracks === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      <div className={styles.controls}>
        <GlobalTransport
          tracks={tracks}
          currentIndex={currentIndex}
          isPlaying={isPlaying}
          duration={duration}
          currentTime={currentTime}
          onPlayPause={togglePlay}
          onNext={playNext}
          onPrev={playPrev}
          onSeek={seekToRatio}
        />
      </div>

      <ol className={styles.tracks}>
        {tracks.map((track, index) => {
          const isActive = index === currentIndex;
          const isTrackPlaying = isActive && isPlaying;
          return (
            <li
              key={track.slug ?? track.title ?? index}
              className={`${styles.track} ${isActive ? styles.activeTrack : ""}`}
              onClick={() => loadTrack(index, true)}
            >
              <div className={styles.trackRow}>
                <button
                  className={`${styles.trackButton} ${isTrackPlaying ? styles.playingButton : ""}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (isActive) {
                      togglePlay();
                    } else {
                      loadTrack(index, true);
                    }
                  }}
                  aria-label={`${isTrackPlaying ? "Pause" : "Play"} ${track.title}`}
                >
                  <span className={styles.trackNumber}>
                    {track.track_number ?? index + 1}
                  </span>
                  <span className={styles.trackButtonIcon}>
                    {isTrackPlaying ? "||" : "▶"}
                  </span>
                </button>

                <div className={styles.trackMain}>
                  <strong className={styles.trackTitle}>{track.title}</strong>
                </div>
                <div className={styles.trackDuration}>
                  {formatDuration(track.duration)}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <audio ref={audioRef} preload="metadata" crossOrigin="anonymous" />
    </section>
  );
};

export default Player;
