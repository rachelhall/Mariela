import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./Player.module.css";
import GlobalTransport from "./GlobalTransport";
import CardShell from "./CardShell";

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoaded = () => {
      if (audio.duration) {
        setDuration(audio.duration);
      }
    };
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
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
  }, [currentIndex, totalTracks]);

  useEffect(() => {
    if (tracks.length > 0) {
      loadTrack(0, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks]);

  const progressRatio =
    duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  const heroClass = `${styles.hero} ${compact ? styles.heroCompact : ""}`;
  const coverWrapClass = `${styles.coverWrap} ${compact ? styles.coverWrapCompact : ""}`;
  const titleClass = `${styles.title} ${compact ? styles.titleCompact : ""}`;
  const artistClass = `${styles.artist} ${compact ? styles.artistCompact : ""}`;
  const summaryClass = `${styles.summary} ${compact ? styles.summaryCompact : ""}`;
  const tracksClass = `${styles.tracks} ${compact ? styles.tracksCompact : ""}`;
  const trackClass = `${styles.track} ${compact ? styles.trackCompact : ""}`;
  const trackRowClass = `${styles.trackRow} ${compact ? styles.trackRowCompact : ""}`;
  const trackTitleClass = `${styles.trackTitle} ${compact ? styles.trackTitleCompact : ""}`;
  const trackButtonClass = `${styles.trackButton} ${compact ? styles.trackButtonCompact : ""}`;

  return (
    <CardShell title={album.album} className={compact ? styles.compactCard : ""}>
      <header className={heroClass}>
        <div className={coverWrapClass}>
          <img
            src={album.cover_art}
            alt={`${album.album} cover art`}
            className={styles.cover}
            loading="lazy"
          />
        </div>

        <div className={styles.meta}>
          <p className={styles.eyebrow}>Album</p>
          <h2 className={titleClass}>{album.album}</h2>
          <h3 className={artistClass}>{album.artist}</h3>
          <p className={summaryClass}>
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

      <ol className={tracksClass}>
        {tracks.map((track, index) => {
          const isActive = index === currentIndex;
          const isTrackPlaying = isActive && isPlaying;
          return (
            <li
              key={track.slug ?? track.title ?? index}
              className={`${trackClass} ${isActive ? styles.activeTrack : ""}`}
              onClick={() => loadTrack(index, true)}
            >
              <div className={trackRowClass}>
                <button
                  className={`${trackButtonClass} ${isTrackPlaying ? styles.playingButton : ""}`}
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
                  <strong className={trackTitleClass}>{track.title}</strong>
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
    </CardShell>
  );
};

export default Player;
