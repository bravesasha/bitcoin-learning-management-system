import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Back15Icon from '#src/assets/icons/back_15.svg';
import Forward15Icon from '#src/assets/icons/forward_15.svg';
import PlayIcon from '#src/assets/icons/play.svg';

interface AudioPlayerProps {
  courseId: string;
  slideId: string;
  language: string;
  onValidate: () => void;
  validated: boolean;
}

// Build the API URL that proxies the audio through the backend instead of exposing the raw S3 bucket.
const buildAudioApiUrl = (
  courseId: string,
  slideId: string,
  lang: string,
): string => {
  return `/api/translation-downloads/audio/${courseId}/${slideId}/${lang}`;
};

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  courseId,
  slideId,
  language,
  onValidate,
  validated,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [exists, setExists] = useState<boolean | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const { t } = useTranslation();

  const url = buildAudioApiUrl(courseId, slideId, language);

  // Probe file existence
  useEffect(() => {
    let cancelled = false;
    setExists(null);

    fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' } })
      .then((res) => !cancelled && setExists(res.ok))
      .catch(() => !cancelled && setExists(false));

    return () => {
      cancelled = true;
    };
  }, [url]);

  // Load audio when exists
  useEffect(() => {
    if (exists !== true) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(url);
    } else {
      audioRef.current.src = url;
    }

    const audio = audioRef.current;

    const onLoaded = () => setDuration(audio.duration || 0);
    const onTime = () => setCurrentTime(audio.currentTime);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnded);
    };
  }, [exists, url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const seek = (delta: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(
      0,
      Math.min(duration, audioRef.current.currentTime + delta),
    );
  };

  const formatTime = useCallback((sec: number) => {
    if (!Number.isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60)
      .toString()
      .padStart(2, '0');
    return `${m}:${s}`;
  }, []);

  return (
    <div className="flex flex-col items-center gap-[10px] px-[10px] mt-10">
      {/* Status messages */}
      {exists === null && (
        <p className="text-sm text-gray-500 mb-2">
          {t('translate.checkingResource', {
            defaultValue: 'Checking audio resource…',
          })}
        </p>
      )}
      {exists === false && (
        <p className="text-sm text-gray-500 mb-2">
          {t('translate.audioNotFound', {
            defaultValue: 'Audio resource not found.',
          })}
        </p>
      )}

      {/* Audio Player Container */}
      <div
        className="rounded-lg p-4 w-full"
        style={{ backgroundColor: '#FDF1E8', border: '1px solid #FF5C00' }}
      >
        {/* Controls */}
        <div className="flex items-center gap-4 mb-3">
          {exists ? (
            <button
              type="button"
              className="focus:outline-none"
              onClick={togglePlay}
            >
              <img
                src={PlayIcon}
                alt={isPlaying ? 'Pause' : 'Play'}
                className={`w-[34px] h-[35px] ${isPlaying ? 'opacity-40' : ''}`}
              />
            </button>
          ) : (
            <img
              src={PlayIcon}
              alt="Play"
              className="w-[34px] h-[35px] opacity-30"
            />
          )}
          <div className="flex-1">
            <div className="bg-orange-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-orange-500 h-full rounded-full"
                style={{
                  width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
          <span className="text-sm text-gray-600">{formatTime(duration)}</span>
        </div>

        {/* Secondary controls */}
        <div className="flex items-center justify-center gap-5 mt-4">
          {/* Rewind 15s */}
          <button
            type="button"
            className="focus:outline-none"
            onClick={() => seek(-15)}
            disabled={!exists}
          >
            <img
              src={Back15Icon}
              alt="Rewind 15 seconds"
              className="w-[18px] h-[19.32px]"
            />
          </button>
          {/* Playback speed placeholder */}
          <span className="text-sm text-gray-900">1x</span>
          {/* Forward 15s */}
          <button
            type="button"
            className="focus:outline-none"
            onClick={() => seek(15)}
            disabled={!exists}
          >
            <img
              src={Forward15Icon}
              alt="Forward 15 seconds"
              className="w-[18px] h-[19.32px]"
            />
          </button>
        </div>

        {/* Temporary download button for testing */}
        {exists && (
          <div className="mt-4 text-center">
            <a
              href={url}
              download={`${slideId}.m4a`}
              className="text-sm text-orange-600 underline hover:text-orange-500"
            >
              {t('translate.downloadAudio', { defaultValue: 'Download audio' })}
            </a>
          </div>
        )}
      </div>

      {/* Validate */}
      <div className="flex flex-col items-center gap-[10px]">
        <button
          type="button"
          onClick={onValidate}
          className="flex items-center gap-3 cursor-pointer bg-transparent border-0 p-0"
        >
          <div
            className={`w-6 h-6 border-2 rounded-[4px] flex items-center justify-center ${
              validated
                ? 'bg-orange-500 border-orange-500'
                : 'bg-transparent border-gray-400'
            }`}
          >
            {validated && <span className="text-white text-sm">✓</span>}
          </div>
          <span className="text-gray-900 font-medium">Validate audio</span>
        </button>
      </div>

      {/* Review instructions */}
      <p className="text-orange-600 text-sm text-center">
        {t('translate.reviewInstructions', {
          defaultValue:
            'Review the transcription, make any necessary corrections, and then generate the audio.',
        })}
      </p>
    </div>
  );
};
