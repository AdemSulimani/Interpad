import { useState, useRef, useEffect } from 'react';
import './style/StatusBar.css';
import { useDocumentEditor } from './context/DocumentEditorContext';
import { useDocumentTextCounts } from './hooks/useDocumentTextCounts';
import { getDocumentContent } from './types/document';

const ZOOM_OPTIONS = [50, 75, 90, 100, 125, 150, 200];

const StatusBar = () => {
  const { document, focusedPageIndex, zoomLevel, setZoomLevel } = useDocumentEditor();
  const { wordCount, characterCount, characterCountNoSpaces } = useDocumentTextCounts(getDocumentContent(document));
  const [zoomDropdownOpen, setZoomDropdownOpen] = useState(false);
  const zoomDropdownRef = useRef<HTMLDivElement>(null);

  const totalPages = document.pages.length;
  const pageNumber = totalPages > 0 ? Math.min(focusedPageIndex + 1, totalPages) : 1;
  const language = 'en-US';

  useEffect(() => {
    if (!zoomDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (zoomDropdownRef.current && !zoomDropdownRef.current.contains(e.target as Node)) {
        setZoomDropdownOpen(false);
      }
    };
    const doc = window.document;
    doc.addEventListener('mousedown', handleClickOutside);
    return () => doc.removeEventListener('mousedown', handleClickOutside);
  }, [zoomDropdownOpen]);

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
            <span className="status-value">{wordCount.toLocaleString()}</span>
          </div>
          <div className="status-divider"></div>
          <div className="status-item">
            <span className="status-label">Characters:</span>
            <span className="status-value">{characterCount.toLocaleString()}</span>
          </div>
          <div className="status-item status-item-secondary">
            <span className="status-value-small">({characterCountNoSpaces.toLocaleString()} no spaces)</span>
          </div>
        </div>

        {/* Center: Page Number (if applicable) */}
        {totalPages > 0 && (
          <div className="status-bar-center">
            <div className="status-item">
              <span className="status-label">Page:</span>
              <span className="status-value">
                {pageNumber} / {totalPages}
              </span>
            </div>
          </div>
        )}

        {/* Right side: Zoom and Language */}
        <div className="status-bar-right">
          <div className="status-item status-item-zoom" ref={zoomDropdownRef}>
            <button
              type="button"
              className="status-btn zoom-btn"
              title="Zoom"
              onClick={() => setZoomDropdownOpen((open) => !open)}
              aria-expanded={zoomDropdownOpen}
              aria-haspopup="listbox"
              aria-label={`Zoom ${zoomLevel}%`}
            >
              <span className="status-value">{zoomLevel}%</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
            {zoomDropdownOpen && (
              <div className="zoom-dropdown" role="listbox" aria-label="Zgjidh nivelin e zoom-it">
                {ZOOM_OPTIONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="option"
                    aria-selected={zoomLevel === value}
                    className={`zoom-dropdown-option ${zoomLevel === value ? 'zoom-dropdown-option-active' : ''}`}
                    onClick={() => {
                      setZoomLevel(value);
                      setZoomDropdownOpen(false);
                    }}
                  >
                    {value}%
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="status-divider"></div>
          <div className="status-item">
            <button className="status-btn language-btn" title="Language">
              <span className="status-value">{language.split('-')[0].toUpperCase()}</span>
              <span className="status-value-small">({languageNames[language] || language})</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default StatusBar;

