import { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import AnalyzerCard from './components/AnalyzerCard';
import ResultsCard from './components/ResultsCard';
import AudioToMidiCard from './components/AudioToMidiCard';
import InfoPanels from './components/InfoPanels';
import Footer from './components/Footer';
import type { AnalysisResult, SessionEntry } from './lib/audioAnalysis';

interface ToastItem {
  id: number;
  message: string;
}

let toastIdCounter = 0;

function getVisitCount(): number {
  try {
    const stored = localStorage.getItem('djx_visit_count');
    if (stored) {
      return parseInt(stored, 10);
    }
    // Start with a realistic base count
    const base = 1247;
    localStorage.setItem('djx_visit_count', String(base));
    return base;
  } catch {
    return 1247;
  }
}

function incrementVisitCount(): number {
  try {
    const current = getVisitCount();
    const next = current + 1;
    localStorage.setItem('djx_visit_count', String(next));
    return next;
  } catch {
    return 1248;
  }
}

export default function App() {
  const [analysisResult, setAnalysisResult] =
    useState<AnalysisResult | null>(null);
  const [sessionHistory, setSessionHistory] = useState<SessionEntry[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [logoClass, setLogoClass] = useState('');
  const [fileName, setFileName] = useState('');
  const [duration, setDuration] = useState(0);
  const [visitCount, setVisitCount] = useState(1247);

  useEffect(() => {
    // Increment visit count on mount
    const count = incrementVisitCount();
    setVisitCount(count);
  }, []);

  const addToast = useCallback((message: string) => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  const handleAnalysisComplete = useCallback(
    (result: AnalysisResult) => {
      setAnalysisResult(result);
      setLogoClass('spinning');

      setSessionHistory((prev) => {
        const newEntry: SessionEntry = {
          name: fileName.replace(/\.[^.]+$/, '') || 'track',
          key: result.key.name,
          bpm: result.bpm,
        };
        return [newEntry, ...prev].slice(0, 7);
      });
    },
    [fileName]
  );

  const handleFileLoaded = useCallback(
    (name: string, dur: number) => {
      setFileName(name);
      setDuration(dur);
      setLogoClass('spinning');
      setAnalysisResult(null);
    },
    []
  );

  const handleReset = useCallback(() => {
    setAnalysisResult(null);
    setLogoClass('');
    setFileName('');
    setDuration(0);
  }, []);

  const handleClearHistory = useCallback(() => {
    setSessionHistory([]);
  }, []);

  useEffect(() => {
    if (analysisResult) {
      setLogoClass('spinning');
    }
  }, [analysisResult]);

  return (
    <>
      <Header logoClass={logoClass} />
      <main className="page">
        <div className="grid-main">
          <AnalyzerCard
            onAnalysisComplete={handleAnalysisComplete}
            onToast={addToast}
            onFileLoaded={handleFileLoaded}
            onReset={handleReset}
          />
          <ResultsCard
            result={analysisResult}
            fileName={fileName}
            duration={duration}
            onToast={addToast}
          />
        </div>

        {/* Audio to MIDI card — full width after the main grid */}
        <div style={{ marginTop: '22px' }}>
          <AudioToMidiCard />
        </div>

        <InfoPanels
          sessionHistory={sessionHistory}
          onClearHistory={handleClearHistory}
          onToast={addToast}
        />
      </main>
      <Footer visitCount={visitCount} />
      <div id="toast-root" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.message}
          </div>
        ))}
      </div>
    </>
  );
}
