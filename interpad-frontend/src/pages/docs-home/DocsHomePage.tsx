import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './style/DocsHomePage.css';

const DocsHomePage = () => {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const profileLeaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  const userJson = localStorage.getItem('user');
  const user = userJson ? (JSON.parse(userJson) as { name?: string; email?: string }) : null;
  const initial = user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (profileLeaveTimeout.current) clearTimeout(profileLeaveTimeout.current);
    };
  }, []);

  const handleProfileMouseEnter = () => {
    if (profileLeaveTimeout.current) {
      clearTimeout(profileLeaveTimeout.current);
      profileLeaveTimeout.current = null;
    }
    setProfileOpen(true);
  };

  const handleProfileMouseLeave = () => {
    profileLeaveTimeout.current = setTimeout(() => setProfileOpen(false), 150);
  };

  const handleSignOut = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    localStorage.removeItem('user');
    setProfileOpen(false);
    window.location.href = '/login';
  };

  return (
    <div className="docs-home-page">
      {/* 1. Header – fiksuar lart */}
      <header className="docs-home-header">
        <div className="docs-home-header-inner">
          {/* Majtas: vetëm logo Docs */}
          <div className="docs-home-header-left">
            <div className="docs-home-header-logo-wrap">
              <span className="docs-home-header-logo-icon">
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path fill="#4285F4" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                  <path fill="#fff" d="M14 2v6h6" opacity="0.9" />
                </svg>
              </span>
              <span className="docs-home-header-logo-text">InterPad</span>
            </div>
          </div>

          {/* Qendër: search bar */}
          <div className="docs-home-header-center">
            <div className="docs-home-search-bar">
              <svg className="docs-home-search-icon" viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
              <input type="text" className="docs-home-search-input" placeholder="Search" readOnly aria-label="Search" />
            </div>
          </div>

          {/* Djathtas: vetëm avatar/profil – dropdown me hover */}
          <div className="docs-home-header-right">
            <div
              className="docs-home-profile-wrap"
              ref={profileRef}
              onMouseEnter={handleProfileMouseEnter}
              onMouseLeave={handleProfileMouseLeave}
            >
              <button
                type="button"
                className="docs-home-profile-btn"
                onClick={() => setProfileOpen((o) => !o)}
                aria-label="Profile"
                aria-expanded={profileOpen}
              >
                <span className="docs-home-profile-avatar">{initial}</span>
              </button>
              {profileOpen && (
                <div className="docs-home-profile-dropdown">
                  <div className="docs-home-profile-dropdown-header">
                    <span className="docs-home-profile-dropdown-avatar">{initial}</span>
                    <div className="docs-home-profile-dropdown-info">
                      <span className="docs-home-profile-dropdown-name">{user?.name || 'User'}</span>
                      <span className="docs-home-profile-dropdown-email">{user?.email || ''}</span>
                    </div>
                  </div>
                  <div className="docs-home-profile-dropdown-divider" />
                  <button type="button" className="docs-home-profile-dropdown-item" onClick={handleSignOut}>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="docs-home-main">
      {/* 2. Start a new document – vetëm Blank document */}
      <section className="docs-home-section docs-home-start-new">
        <h2 className="docs-home-section-title">Start a new document</h2>
        <div className="docs-home-start-new-content">
          <button type="button" className="docs-home-blank-card" onClick={() => navigate('/editor')}>
            <span className="docs-home-blank-card-plus">
              <svg viewBox="0 0 24 24" width="80" height="80" fill="none">
                <defs>
                  <linearGradient id="plus-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4285F4" />
                    <stop offset="50%" stopColor="#34A853" />
                    <stop offset="75%" stopColor="#FBBC05" />
                    <stop offset="100%" stopColor="#EA4335" />
                  </linearGradient>
                </defs>
                <path fill="url(#plus-gradient)" d="M13 3h-2v8H3v2h8v8h2v-8h8v-2h-8V3z" />
              </svg>
            </span>
            <span className="docs-home-blank-card-label">Blank document</span>
          </button>
        </div>
      </section>

      {/* 3. Recent documents */}
      <section className="docs-home-section docs-home-recent">
        <div className="docs-home-recent-header">
          <h2 className="docs-home-section-title">Recent documents</h2>
          <div className="docs-home-recent-controls">
            <select className="docs-home-recent-select" defaultValue="owned" aria-label="Filter by owner">
              <option value="owned">Owned by me</option>
              <option value="anyone">Owned by anyone</option>
            </select>
            <div className="docs-home-recent-icons">
              <button type="button" className="docs-home-recent-icon-btn" aria-label="Grid view" title="Grid view">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M3 3v8h8V3H3zm10 0v8h8V3h-8zM3 13v8h8v-8H3zm10 0v8h8v-8h-8z" />
                </svg>
              </button>
              <button type="button" className="docs-home-recent-icon-btn" aria-label="List view" title="List view">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
                </svg>
              </button>
              <button type="button" className="docs-home-recent-icon-btn" aria-label="Sort A-Z" title="Sort A-Z">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 6l-2 4H6l3 3-1 5 4-2.5 4 2.5-1-5 3-3h-4l-2-4zm-1.5 5.5l1.5-3 1.5 3h-3z" />
                </svg>
              </button>
              <button type="button" className="docs-home-recent-icon-btn" aria-label="Folders" title="Folders">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div className="docs-home-recent-content">
          <div className="docs-home-recent-empty-state">
            <span className="docs-home-recent-empty-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                <path d="M14 2v6h6" />
                <path d="M12 11v6" />
                <path d="M9 14h6" />
              </svg>
            </span>
            <p className="docs-home-recent-empty-title">No documents yet</p>
            <p className="docs-home-recent-empty-sub">Nuk keni dokumente ende. Klikoni "Blank document" për të krijuar një të parën.</p>
          </div>
        </div>
      </section>
      </main>
    </div>
  );
};

export default DocsHomePage;
