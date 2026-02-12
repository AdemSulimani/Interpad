import './style/DocumentEditorHeader.css';
import { Link } from 'react-router-dom';
import { useDocumentEditor } from './context/DocumentEditorContext';

const DocumentEditorHeader = () => {
  const { document, setTitle } = useDocumentEditor();

  return (
    <header className="document-editor-header">
      <div className="document-editor-header-container">
        {/* Left: Logo */}
        <div className="document-editor-header-left">
          <Link to="/" className="document-editor-logo">
            <span className="document-editor-logo-text">Interpad</span>
          </Link>
        </div>

        {/* Center: Document Name (Editable) */}
        <div className="document-editor-header-center">
          <input
            type="text"
            className="document-name-input"
            placeholder="Untitled Document"
            value={document.title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Document title"
          />
        </div>

        {/* Right: Action Buttons & User Profile */}
        <div className="document-editor-header-right">
          <div className="document-editor-actions">
            <Link to="/docs" className="document-editor-btn document-editor-btn-back" title="Back to docs">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </Link>
            <button className="document-editor-btn document-editor-btn-save" title="Save">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </button>
            <button className="document-editor-btn document-editor-btn-share" title="Share">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </button>
            <button className="document-editor-btn document-editor-btn-export" title="Export">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DocumentEditorHeader;

