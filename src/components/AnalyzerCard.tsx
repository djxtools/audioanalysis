import { useState, useRef, useCallback, useEffect } from 'react';
import {
  analyzeTrack,
  formatTime,
  isValidAudioFile,
  type AnalysisResult,
} from '../lib/audioAnalysis';

interface AnalyzerCardProps {
  onAnalysisComplete: (result: AnalysisResult) => void;
  onToast: (message: string) => void;
  onFileLoaded: (fileName: string, duration: number) => void;
  onReset: () => void;
}

export default function AnalyzerCard({
  onAnalysisComplete,
  onToast,
  onFileLoaded,
  onReset,
}: AnalyzerCardProps) {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [loopOn, setLoopOn] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const startAtRef = useRef(0);
  const startOffsetRef = useRef(0);
  const animFrameRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrubRef = useRef<HTMLInputElement>(null);

  const ensureCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  const drawWaveform = useCallback((buffer: AudioBuffer) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#121018';
    ctx.fillRect(0, 0, w, h);
    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / w);
    const amp = h / 2 - 10;
    ctx.beginPath();
    ctx.strokeStyle = '#c12b3f';
    ctx.lineWidth = 1.3;
    for (let x = 0; x < w; x++) {
      let min = 1.0;
      let max = -1.0;
      const start = x * step;
      for (let j = 0; j < step; j++) {
        const v = data[start + j] || 0;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const y1 = h / 2 + min * amp;
      const y2 = h / 2 + max * amp;
      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.055)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
  }, []);

  const stopPlayback = useCallback(
    (pauseKeepOffset = true) => {
      if (sourceRef.current) {
        try {
          sourceRef.current.stop();
        } catch {
          /* ignore */
        }
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (isPlaying && pauseKeepOffset && audioCtxRef.current) {
        startOffsetRef.current = Math.min(
          duration,
          audioCtxRef.current.currentTime - startAtRef.current
        );
      }
      setIsPlaying(false);
    },
    [isPlaying, duration]
  );

  const startPlayback = useCallback(
    (offset = startOffsetRef.current) => {
      ensureCtx();
      if (sourceRef.current) {
        try {
          sourceRef.current.stop();
        } catch {
          /* ignore */
        }
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      const buffer = audioBufferRef.current;
      if (!buffer || !audioCtxRef.current) return;

      const source = audioCtxRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtxRef.current.destination);
      startAtRef.current = audioCtxRef.current.currentTime - offset;
      source.start(0, offset);
      sourceRef.current = source;
      setIsPlaying(true);

      source.onended = () => {
        if (sourceRef.current === source) {
          sourceRef.current = null;
          setIsPlaying(false);
          startOffsetRef.current = 0;
          setCurrentTime(0);
          if (scrubRef.current) scrubRef.current.value = '0';
        }
      };

      const tick = () => {
        if (!audioCtxRef.current) return;
        const pos = audioCtxRef.current.currentTime - startAtRef.current;
        if (pos >= duration) {
          stopPlayback(false);
          startOffsetRef.current = 0;
          return;
        }
        setCurrentTime(pos);
        if (scrubRef.current) {
          scrubRef.current.value = String(Math.round((pos / duration) * 1000));
        }
        animFrameRef.current = requestAnimationFrame(tick);
      };
      animFrameRef.current = requestAnimationFrame(tick);
    },
    [ensureCtx, duration, stopPlayback]
  );

  const togglePlayback = useCallback(() => {
    if (!audioBufferRef.current) return;
    if (isPlaying) {
      stopPlayback(true);
    } else {
      startPlayback();
    }
  }, [isPlaying, stopPlayback, startPlayback]);

  const handleFile = useCallback(
    async (file: File) => {
      if (!isValidAudioFile(file)) {
        onToast('Please choose an audio file.');
        return;
      }
      if (file.size > 120 * 1024 * 1024) {
        onToast('File is larger than 120 MB — try a shorter version.');
        return;
      }

      setCurrentFile(file);
      ensureCtx();

      try {
        const arrayBuf = await file.arrayBuffer();
        const buffer = await audioCtxRef.current!.decodeAudioData(
          arrayBuf.slice(0)
        );
        audioBufferRef.current = buffer;
        const dur = buffer.duration;
        setDuration(dur);
        drawWaveform(buffer);
        onToast('Track loaded. Ready to analyze.');
        onFileLoaded(file.name, dur);
      } catch (err) {
        console.error(err);
        onToast('Could not decode this file. Try MP3 or WAV.');
        audioBufferRef.current = null;
      }
    },
    [ensureCtx, drawWaveform, onToast, onFileLoaded]
  );

  const resetAll = useCallback(() => {
    stopPlayback(false);
    audioBufferRef.current = null;
    setCurrentFile(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsAnalyzing(false);
    setShowProgress(false);
    setProgress(0);
    startOffsetRef.current = 0;
    startAtRef.current = 0;
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    onReset();
  }, [stopPlayback, onReset]);

  const handleAnalyze = useCallback(async () => {
    if (!audioBufferRef.current) {
      onToast('Load a track first.');
      return;
    }
    setIsAnalyzing(true);
    setShowProgress(true);
    setProgress(6);

    const iv = setInterval(() => {
      setProgress((p) => Math.min(92, p + Math.random() * 7));
    }, 140);

    await new Promise((r) => setTimeout(r, 260));

    const result = analyzeTrack(
      audioBufferRef.current,
      currentFile?.name || 'untitled'
    );

    await new Promise((r) => setTimeout(r, 620 + Math.random() * 420));
    clearInterval(iv);
    setProgress(100);

    setTimeout(() => {
      setShowProgress(false);
      setProgress(0);
    }, 460);

    onAnalysisComplete(result);
    setIsAnalyzing(false);
    onToast('Analysis complete.');
  }, [currentFile, onAnalysisComplete, onToast]);

  const handleScrub = useCallback(() => {
    if (!scrubRef.current) return;
    const t = (Number(scrubRef.current.value) / 1000) * duration;
    startOffsetRef.current = Math.max(0, Math.min(duration, t));
    if (isPlaying) {
      startPlayback(startOffsetRef.current);
    } else {
      setCurrentTime(startOffsetRef.current);
    }
  }, [duration, isPlaying, startPlayback]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !/input|textarea/i.test(
          (document.activeElement as HTMLElement)?.tagName || ''
        )
      ) {
        e.preventDefault();
        togglePlayback();
      }
      if (
        (e.key === 'a' || e.key === 'A') &&
        audioBufferRef.current &&
        !isPlaying
      ) {
        handleAnalyze();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayback, handleAnalyze, isPlaying]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (sourceRef.current) {
        try {
          sourceRef.current.stop();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  return (
    <section className="card" id="analyzerCard">
      <div className="card-inner">
        <div className="section-label">1 — Load Track</div>
        <h2 style={{ fontSize: '24px', marginBottom: '14px' }}>
          Drop in your song
        </h2>

        <div
          className={`dropzone ${isDragOver ? 'dragover' : ''}`}
          tabIndex={0}
          role="button"
          aria-label="Upload audio file"
          onClick={(e) => {
            if (!(e.target as HTMLElement).closest('button'))
              fileInputRef.current?.click();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragOver(false);
          }}
          onDrop={handleDrop}
        >
          <div className="dz-icon">
            <i className="ri-music-2-line"></i>
          </div>
          <div className="dz-title">Drop your track here</div>
          <div className="dz-hint">
            or click to browse your files — analysis runs entirely in your
            browser
          </div>
          <button
            className="dz-browse"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            <i className="ri-upload-cloud-2-line"></i> Browse files
          </button>
          <div className="dz-formats">
            mp3 • wav • flac • aiff • m4a • ogg — up to 120 MB
          </div>
          <input
            type="file"
            ref={fileInputRef}
            accept="audio/*,.mp3,.wav,.flac,.aiff,.aif,.m4a,.ogg,.mp4,.aac"
            onChange={handleFileInput}
          />
        </div>

        {currentFile && (
          <div>
            <div className="file-chip">
              <div className="fc-icon">
                <i className="ri-file-music-line"></i>
              </div>
              <div>
                <strong>{currentFile.name}</strong>
                <span>
                  {(currentFile.size / 1024 / 1024).toFixed(1)} MB •{' '}
                  {currentFile.type || 'audio'}
                </span>
              </div>
              <button
                className="remove-file"
                title="Remove file"
                aria-label="Remove file"
                onClick={resetAll}
              >
                <i className="ri-close-line"></i>
              </button>
            </div>

            <div className="wave-wrap">
              <div className="wave-top">
                <span>Waveform preview</span>
                <span className="mono">{formatTime(duration)}</span>
              </div>
              <canvas
                ref={canvasRef}
                className="wave-canvas"
                width={900}
                height={170}
              />
              <div className="transport">
                <button
                  className="t-btn"
                  aria-label="Play/Pause"
                  onClick={togglePlayback}
                >
                  <i
                    className={
                      isPlaying ? 'ri-pause-fill' : 'ri-play-fill'
                    }
                  ></i>
                </button>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  defaultValue="0"
                  className="scrub"
                  ref={scrubRef}
                  onInput={handleScrub}
                />
                <span className="time-readout">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
                <button
                  className="t-btn"
                  title="Loop selection"
                  aria-label="Loop"
                  style={{ color: loopOn ? '#f2a8b2' : '' }}
                  onClick={() => {
                    setLoopOn(!loopOn);
                    onToast(loopOn ? 'Loop off' : 'Loop on (preview only)');
                  }}
                >
                  <i className="ri-repeat-line"></i>
                </button>
              </div>
            </div>

            <div className="analyze-row">
              <button
                className="btn-analyze"
                disabled={isAnalyzing}
                onClick={handleAnalyze}
              >
                <i className="ri-radar-line"></i> Analyze Track
              </button>
              <button className="btn-ghost" onClick={resetAll}>
                Reset
              </button>
            </div>
            <div className={`progress-shell ${showProgress ? 'show' : ''}`}>
              <div
                className="progress-bar"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="meta-note">
              <i className="ri-shield-keyhole-line"></i> All audio is decoded
              locally. Nothing is uploaded. No cookies. No accounts.
            </div>
          </div>
        )}

        {!currentFile && (
          <div
            style={{
              marginTop: '16px',
              color: '#9a8f85',
              fontSize: '13.4px',
              lineHeight: 1.6,
            }}
          >
            Tip: For strongest key detection, use the full mix or a 16–32 bar
            loop. Stems work great too.
            <br />
            Keyboard: <span className="kbd">Space</span> play/pause &nbsp;{' '}
            <span className="kbd">A</span> analyze
          </div>
        )}
      </div>
    </section>
  );
}
