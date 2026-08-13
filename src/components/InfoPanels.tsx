import type { SessionEntry } from '../lib/audioAnalysis';

interface InfoPanelsProps {
  sessionHistory: SessionEntry[];
  onClearHistory: () => void;
  onToast: (message: string) => void;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (m) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[m] || m;
  });
}

export default function InfoPanels({
  sessionHistory,
  onClearHistory,
  onToast,
}: InfoPanelsProps) {
  return (
    <div className="panels-3">
      <div className="mini-card">
        <h4>How detection works</h4>
        <p>Music Tools by DJX runs entirely in your browser using the Web Audio API.</p>
        <ul>
          <li>
            <b>BPM:</b> Onset envelope + autocorrelation beat tracking.
          </li>
          <li>
            <b>Key:</b> 12-bin chroma + Krumhansl profile matching.
          </li>
          <li>
            <b>Chords:</b> Diatonic inference from detected key, verified against
            chroma.
          </li>
        </ul>
        <p style={{ marginTop: 10 }}>
          No audio ever leaves your device. Close the tab and it's gone.
        </p>
      </div>

      <div className="mini-card">
        <h4>Session history (local only)</h4>
        <p style={{ marginBottom: 2 }}>
          This session — cleared when you close the page.
        </p>
        <ul className="session-list">
          {sessionHistory.length === 0 ? (
            <li>
              <span style={{ color: '#7f7469' }}>No analyses yet</span>
              <span>—</span>
            </li>
          ) : (
            sessionHistory.map((h, i) => (
              <li key={i}>
                <span>{escapeHtml(h.name.slice(0, 34))}</span>
                <span className="session-key">
                  {escapeHtml(h.key)} • {h.bpm.toFixed(1)}
                </span>
              </li>
            ))
          )}
        </ul>
        <button
          className="small-btn"
          style={{ marginTop: 10 }}
          onClick={() => {
            onClearHistory();
            onToast('Session history cleared.');
          }}
        >
          <i className="ri-delete-bin-line"></i> Clear history
        </button>
      </div>

      <div className="mini-card">
        <h4>DJ / Producer tips</h4>
        <ul>
          <li>Mix in key: F#m → A / D / C#m are smooth neighbors.</li>
          <li>For tempo transitions, ±6% usually stays transparent.</li>
          <li>
            Audition the progression above to quickly check if the detection
            feels right for your track.
          </li>
          <li>
            Export MIDI chords to drop straight into Ableton / FL / Logic.
          </li>
        </ul>
        <div
          style={{
            marginTop: 12,
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <span className="pill">Private by design</span>
          <span className="pill">v1.34 • Jan 2026</span>
        </div>
      </div>
    </div>
  );
}
