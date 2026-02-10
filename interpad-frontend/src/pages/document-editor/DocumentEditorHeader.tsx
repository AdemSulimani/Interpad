import './style/DocumentEditorHeader.css';
import { Link, useNavigate } from 'react-router-dom';

const DocumentEditorHeader = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Fshi token-at dhe çdo pending verification nga storage
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    localStorage.removeItem('pendingEmail');
    localStorage.removeItem('pendingUserId');

    // Riload faqen që App.tsx të ri-inicializojë state-in nga storage
    navigate('/login');
    window.location.reload();
  };

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
            defaultValue="Untitled Document"
          />
        </div>

        {/* Right: Action Buttons & User Profile */}
        <div className="document-editor-header-right">
          <div className="document-editor-actions">
            <button className="document-editor-btn document-editor-btn-back" title="Back">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <button className="document-editor-btn document-editor-btn-save" title="Save">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
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
            <button className="document-editor-btn document-editor-btn-settings" title="Settings">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
              </svg>
            </button>
          </div>
          
          <div className="document-editor-user-profile">
            <button className="user-avatar-btn" title="User Profile">
              <div className="user-avatar">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
            </button>
            <button className="document-editor-logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DocumentEditorHeader;

