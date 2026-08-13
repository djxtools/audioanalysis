import { useState, useRef, useCallback } from 'react';
import {
  type AnalysisResult,
  generateMidiBytes,
} from '../lib/audioAnalysis';
import {
  parseChord,
  midiToFreq,
  isBlackKey,
} from '../lib/musicTheory';

interface ResultsCardProps {
  result: AnalysisResult | null;
  fileName: string;
  duration: number;
  onToast: (message: string) => void;
}

export default function ResultsCard({
  result,
  fileName,
  duration,
  onToast,
}: ResultsCardProps) {
  const [activeChord, setActiveChord] = useState<number | null>(null);
  const [auditioning, setAuditioning] = useState(false);
  const [camelotMode, setCamelotMode] = useState(true);
  const [taps, setTaps] = useState<number[]>([]);
  const [tapReadout, setTapReadout] = useState('Tap 4+ times');
  const [highlightedPcs, setHighlightedPcs] = useState<number[]>([]);
  const [currentChordName, setCurrentChordName] = useState('—');
  const [localBpm, setLocalBpm] = useState<number | null>(null);

  const synthCtxRef = useRef<AudioContext | null>(null);
  const activeOscsRef = useRef<
    { osc: OscillatorNode; gain: GainNode }[]
  >([]);

  const getSynthCtx = useCallback(() => {
    if (!synthCtxRef.current) {
      synthCtxRef.current = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    }
    if (synthCtxRef.current.state === 'suspended') {
      synthCtxRef.current.resume();
    }
    return synthCtxRef.current;
  }, []);

  const playChord = useCallback(
    (chordName: string) => {
      const ctx = getSynthCtx();
      activeOscsRef.current.forEach((o) => {
        try {
          o.gain.gain.exponentialRampToValueAtTime(
            0.0001,
            ctx.currentTime + 0.12
          );
          o.osc.stop(ctx.currentTime + 0.14);
        } catch {
          /* ignore */
        }
      });
      activeOscsRef.current = [];

      const mids = parseChord(chordName);
      setCurrentChordName(chordName);
      setHighlightedPcs(mids.map((m) => m % 12));

      mids.forEach((mid, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i === 0 ? 'triangle' : 'sine';
        osc.frequency.value = midiToFreq(mid - 12);
        gain.gain.value = 0.0001;
        osc.connect(gain).connect(ctx.destination);
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.18, now + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.35);
        osc.start(now);
        osc.stop(now + 1.4);
        activeOscsRef.current.push({ osc, gain });
      });
    },
    [getSynthCtx]
  );

  const handleChordClick = useCallback(
    (index: number, chordName: string) => {
      setActiveChord(index);
      playChord(chordName);
    },
    [playChord]
  );

  const handleAudition = useCallback(async () => {
    if (!result || auditioning) return;
    setAuditioning(true);
    const chords = result.key.chords;
    for (let i = 0; i < chords.length; i++) {
      playChord(chords[i]);
      setActiveChord(i);
      await new Promise((r) => setTimeout(r, 700));
    }
    setAuditioning(false);
  }, [result, auditioning, playChord]);

  const handleCopyChords = useCallback(async () => {
    if (!result) return;
    const text =
      result.key.chords.join(' – ') +
      '  |  ' +
      result.key.roman.join(' – ') +
      `  (${result.key.name}, ${result.bpm.toFixed(1)} BPM)`;
    try {
      await navigator.clipboard.writeText(text);
      onToast('Chords copied to clipboard.');
    } catch {
      onToast('Copy failed — select manually.');
    }
  }, [result, onToast]);

  const handleExportJson = useCallback(() => {
    if (!result) return onToast('Analyze a track first.');
    const payload = {
      file: fileName || null,
      duration_seconds: duration,
      detected_at: new Date().toISOString(),
      key: result.key.name,
      scale: result.key.scale,
      camelot_openkey: result.key.alt,
      bpm: result.bpm,
      time_signature: result.timeSig,
      chords: result.key.chords,
      roman_numerals: result.key.roman,
      confidence: Number(result.confidence.toFixed(3)),
      tuning_cents: result.tuning,
      tool: 'Music Tools by DJX',
      privacy: 'analysis_performed_locally_no_upload',
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download =
      (fileName.replace(/\.[^.]+$/, '') || 'djx-analysis') + '.key.json';
    a.click();
    URL.revokeObjectURL(a.href);
    onToast('JSON exported.');
  }, [result, fileName, duration, onToast]);

  const handleExportMidi = useCallback(() => {
    if (!result) return onToast('Analyze a track first.');
    const chords = result.key.chords.map(parseChord);
    const bytes = generateMidiBytes(result.bpm, chords);
    const blob = new Blob([bytes as unknown as BlobPart], { type: 'audio/midi' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download =
      (fileName.replace(/\.[^.]+$/, '') || 'djx-chords') + '.mid';
    a.click();
    URL.revokeObjectURL(a.href);
    onToast('MIDI chords exported.');
  }, [result, fileName, onToast]);

  const handleTapTempo = useCallback(() => {
    const now = performance.now();
    const newTaps = [...taps, now].filter((t) => now - t < 3000);
    setTaps(newTaps);

    if (newTaps.length > 1) {
      const intervals: number[] = [];
      for (let i = 1; i < newTaps.length; i++)
        intervals.push(newTaps[i] - newTaps[i - 1]);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const bpm = 60000 / avg;
      setTapReadout(bpm.toFixed(1) + ' BPM');
      if (result) {
        const newBpm = Math.round(bpm * 10) / 10;
        setLocalBpm(newBpm);
      }
    } else {
      setTapReadout('Keep tapping…');
    }

    if (newTaps.length >= 8) newTaps.shift();
  }, [taps, result]);

  const handleShare = useCallback(async () => {
    if (!result) return;
    const txt = `Music Tools by DJX — ${result.key.name} • ${result.bpm.toFixed(1)} BPM • ${result.key.chords.join(' – ')}`;
    try {
      await navigator.clipboard.writeText(txt);
      onToast('Result copied.');
    } catch {
      onToast('Copy failed.');
    }
  }, [result, onToast]);

  const displayBpm = localBpm ?? result?.bpm ?? 0;

  const pianoKeys = Array.from({ length: 13 }, (_, i) => 60 + i);

  if (!result) {
    return (
      <section className="card" id="resultsCard">
        <div className="card-inner">
          <div className="section-label">2 — Detection Results</div>
          <div className="results-empty">
            <div>
              <div className="re-icon">
                <i className="ri-focus-3-line"></i>
              </div>
              <div
                style={{
                  fontWeight: 700,
                  color: '#d1c8be',
                  fontSize: '16px',
                  marginBottom: '6px',
                }}
              >
                Waiting for audio
              </div>
              <div style={{ maxWidth: 300, margin: '0 auto', lineHeight: 1.55 }}>
                Upload a track, then hit Analyze. You'll get key, BPM, chords,
                and a playable progression.
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const tempoLabel =
    displayBpm < 100
      ? 'Downtempo / Hip-Hop range'
      : displayBpm < 116
        ? 'House / Pop range'
        : displayBpm < 130
          ? 'House / Techno range'
          : displayBpm < 150
            ? 'Techno / Drum & Bass half-time'
            : 'Fast / Hard dance';

  return (
    <section className="card" id="resultsCard">
      <div className="card-inner">
        <div className="section-label">2 — Detection Results</div>
        <div className="results-grid">
          <div className="stat-row">
            <div className="stat-card">
              <div className="stat-label">Root Key</div>
              <div className="stat-big">{result.key.name}</div>
              <div className="stat-sub">
                <span className="mono">{result.key.alt}</span> —{' '}
                {result.confidence > 0.9
                  ? 'Very high confidence'
                  : 'High confidence'}
              </div>
              <span className="badge-soft">
                <i className="ri-scales-3-line"></i> {result.key.scale}
              </span>
            </div>
            <div className="stat-card">
              <div className="stat-label">Tempo</div>
              <div className="stat-big">
                {displayBpm.toFixed(1)}{' '}
                <span style={{ fontSize: '18px', color: '#9e9185' }}>
                  BPM
                </span>
              </div>
              <div className="stat-sub">
                {tempoLabel} • {result.timeSig}
              </div>
              <div
                style={{
                  marginTop: 10,
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <button className="small-btn" onClick={handleTapTempo}>
                  <span className="tap-dot"></span>Tap tempo
                </button>
                <span
                  className="mono"
                  style={{ fontSize: '12px', color: '#a99b8d' }}
                >
                  {tapReadout}
                </span>
              </div>
            </div>
          </div>

          <div className="chords-panel">
            <div className="chords-head">
              <div>
                <div className="stat-label">Chord Progression</div>
                <div
                  style={{
                    fontFamily: 'var(--display)',
                    fontSize: '21px',
                    marginTop: 4,
                  }}
                >
                  {result.key.roman.join(' – ')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="small-btn" onClick={handleAudition}>
                  <i className="ri-play-circle-line"></i> Audition
                </button>
                <button className="small-btn" onClick={handleCopyChords}>
                  <i className="ri-clipboard-line"></i> Copy
                </button>
              </div>
            </div>
            <div className="chips">
              {result.key.chords.map((ch, i) => (
                <button
                  key={ch + i}
                  className={`chord-chip ${activeChord === i ? 'active' : ''}`}
                  type="button"
                  onClick={() => handleChordClick(i, ch)}
                >
                  <strong>{ch}</strong>
                  <span>{result.key.roman[i]}</span>
                </button>
              ))}
            </div>

            <div className="piano-mini">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11.5px',
                  color: '#8f8175',
                  marginBottom: 6,
                }}
              >
                <span>Audition chord • Click to play</span>
                <span className="mono">{currentChordName}</span>
              </div>
              <div className="piano-keys">
                {pianoKeys.map((n) => (
                  <div
                    key={n}
                    className={`pk ${isBlackKey(n) ? 'black' : ''} ${highlightedPcs.includes(n % 12) ? 'on' : ''}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="stat-card" style={{ padding: '14px 16px' }}>
              <div className="stat-label">Energy</div>
              <div
                style={{
                  height: 7,
                  background: '#1c191f',
                  border: '1px solid #2d2831',
                  borderRadius: 999,
                  margin: '10px 0 6px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${result.energy}%`,
                    background:
                      'linear-gradient(90deg, #c12b3f, #e66a7a)',
                  }}
                />
              </div>
              <div className="stat-sub">
                {result.energy > 70
                  ? 'Driving — peak-time'
                  : result.energy > 50
                    ? 'Driving — good for peak-time'
                    : 'Laid back — warm up'}
              </div>
            </div>
            <div className="stat-card" style={{ padding: '14px 16px' }}>
              <div className="stat-label">Tuning offset</div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  marginTop: 7,
                }}
              >
                {result.tuning >= 0 ? '+' : ''}
                {result.tuning} cents
              </div>
              <div className="stat-sub">A4 ≈ 440.9 Hz</div>
            </div>
          </div>

          <div className="utility-row">
            <button className="small-btn" onClick={handleExportJson}>
              <i className="ri-download-2-line"></i> Export JSON
            </button>
            <button className="small-btn" onClick={handleExportMidi}>
              <i className="ri-music-2-line"></i> Export MIDI chords
            </button>
            <button
              className="small-btn"
              onClick={() => {
                setCamelotMode(!camelotMode);
                onToast(
                  camelotMode
                    ? 'Showing classic notation'
                    : 'Showing Camelot / Open Key'
                );
              }}
            >
              <i className="ri-compass-3-line"></i> Camelot / Open Key
            </button>
            <button className="small-btn" onClick={handleShare}>
              <i className="ri-share-line"></i> Copy result link
            </button>
          </div>
          <div className="meta-note" style={{ marginTop: 6 }}>
            <i className="ri-information-line"></i> Detection is algorithmic.
            Always use your ears before finalizing a mix or master.
          </div>
        </div>
      </div>
    </section>
  );
}
