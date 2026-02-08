import './style/StatusBar.css';

const StatusBar = () => {
  // Mock data - në realitet do të vijnë nga props ose state management
  const stats = {
    wordCount: 1250,
    characterCount: 7850,
    characterCountNoSpaces: 6520,
    pageNumber: 1,
    totalPages: 3,
    zoom: 100,
    language: 'en-US',
  };

  const languageNames: { [key: string]: string } = {
    'en-US': 'English (US)',
    'en-GB': 'English (UK)',
    'sq-AL': 'Albanian',
    'de-DE': 'German',
    'fr-FR': 'French',
    'es-ES': 'Spanish',
  };

  return (
    <footer className="status-bar">
      <div className="status-bar-container">
        {/* Left side: Word and Character Count */}
        <div className="status-bar-left">
          <div className="status-item">
            <span className="status-label">Words:</span>
            <span className="status-value">{stats.wordCount.toLocaleString()}</span>
          </div>
          <div className="status-divider"></div>
          <div className="status-item">
            <span className="status-label">Characters:</span>
            <span className="status-value">{stats.characterCount.toLocaleString()}</span>
          </div>
          <div className="status-item status-item-secondary">
            <span className="status-value-small">({stats.characterCountNoSpaces.toLocaleString()} no spaces)</span>
          </div>
        </div>

        {/* Center: Page Number (if applicable) */}
        {stats.totalPages > 1 && (
          <div className="status-bar-center">
            <div className="status-item">
              <span className="status-label">Page:</span>
              <span className="status-value">
                {stats.pageNumber} / {stats.totalPages}
              </span>
            </div>
          </div>
        )}

        {/* Right side: Zoom and Language */}
        <div className="status-bar-right">
          <div className="status-item">
            <button className="status-btn zoom-btn" title="Zoom">
              <span className="status-value">{stats.zoom}%</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
          </div>
          <div className="status-divider"></div>
          <div className="status-item">
            <button className="status-btn language-btn" title="Language">
              <span className="status-value">{stats.language.split('-')[0].toUpperCase()}</span>
              <span className="status-value-small">({languageNames[stats.language] || stats.language})</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default StatusBar;

