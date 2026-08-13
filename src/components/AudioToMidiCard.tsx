import { useState } from 'react';

export default function AudioToMidiCard() {
  const [iframeLoaded, setIframeLoaded] = useState(false);

  return (
    <section className="card audio-midi-card">
      <div className="card-inner">
        <div className="section-label">3 — Audio to MIDI</div>
        <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>
          Convert audio to MIDI
        </h2>
        <p style={{ color: '#a99d91', fontSize: '13.7px', lineHeight: 1.58, margin: '0 0 16px 0' }}>
          Powered by Muscriptor — an open-source audio-to-MIDI transcription tool by Kyutai.
          Upload audio directly and get MIDI note data back. Runs in your browser.
        </p>

        <div className="midi-iframe-wrap">
          {!iframeLoaded && (
            <div className="midi-loading">
              <div className="midi-loading-spinner" />
              <span>Loading Muscriptor…</span>
            </div>
          )}
          <iframe
            src="https://muscriptor.kyutai.org/"
            title="Muscriptor — Audio to MIDI"
            className="midi-iframe"
            allow="microphone; camera"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            onLoad={() => setIframeLoaded(true)}
          />
        </div>

        <div className="meta-note" style={{ marginTop: '14px' }}>
          <i className="ri-external-link-line"></i>
          Embedded from{' '}
          <a
            href="https://muscriptor.kyutai.org/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#d5cdc5', textDecoration: 'underline', textUnderlineOffset: '2px' }}
          >
            muscriptor.kyutai.org
          </a>
        </div>
      </div>
    </section>
  );
}
