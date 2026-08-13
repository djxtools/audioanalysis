import DJXLogo from './DJXLogo';

interface HeaderProps {
  logoClass: string;
}

export default function Header({ logoClass }: HeaderProps) {
  return (
    <header className="site-header">
      <div className="logo-wrap">
        <div className={`djx-slipmat ${logoClass}`} id="djxLogo" aria-label="DJX Crest">
          <DJXLogo />
        </div>
        <div>
          <div className="brand-eyebrow">Audio Analysis Suite</div>
          <h1 className="brand-title">
            Music Tools <em>by <span className="header-djx"><span className="dj-white">DJ</span><span className="dj-red">X</span></span></em>
          </h1>
          <div className="brand-sub">
            Root key • Chord progression • Tempo — private, in-browser, no uploads.
          </div>
          <div className="header-badges">
            <span className="pill">
              <span className="dot"></span> Local-only processing
            </span>
            <span className="pill">WAV / MP3 / FLAC / AIFF / M4A</span>
            <span className="pill">Stems-ready output</span>
          </div>
        </div>
      </div>
    </header>
  );
}
