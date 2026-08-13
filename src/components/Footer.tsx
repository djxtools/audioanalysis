import FlipCounter from './FlipCounter';

interface FooterProps {
  visitCount: number;
}

export default function Footer({ visitCount }: FooterProps) {
  return (
    <footer>
      <div className="footer-content">
        <div className="footer-brand">
          <span className="footer-djx">
            <span className="dj-white">DJ</span>
            <span className="dj-red">X</span>
          </span>
          <span className="footer-brand-text"> Music Tools</span>
        </div>

        <div className="footer-line">
          Key, chords & tempo detection.
        </div>

        <div className="footer-line">
          Built for DJs and producers.
        </div>

        <div className="footer-line">
          All analysis is local — no data is stored, tracked, or uploaded.
        </div>

        <div className="footer-line footer-copy">
          © 2026{' '}
          <span className="footer-djx-inline">
            <span className="dj-white">DJ</span>
            <span className="dj-red">X</span>
          </span>
          . All rights reserved.
        </div>

        <div className="footer-separator" />

        <div className="footer-counter-wrap">
          <span className="counter-label">Page visits</span>
          <FlipCounter value={visitCount} />
        </div>
      </div>
    </footer>
  );
}
