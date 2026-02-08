import { useState, useEffect } from 'react';
import './style/DocumentEditorStyles.css';
import './style/DocumentEditorPage.css';
import DocumentEditorHeader from './DocumentEditorHeader';
import FormattingToolbar from './FormattingToolbar';
import EditorArea from './EditorArea';
import DocumentSidebar from './DocumentSidebar';
import StatusBar from './StatusBar';
import { AutoSaveIndicator, ConnectionStatus } from './VisualIndicators';

const DocumentEditorPage = () => {
  // Sidebar closed by default on mobile, open on desktop
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    return window.innerWidth > 768;
  });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768 && !isSidebarOpen) {
        setIsSidebarOpen(true);
      } else if (window.innerWidth <= 768 && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div className={`document-editor-page ${isFullscreen ? 'fullscreen-mode' : ''}`}>
      {/* Header */}
      <DocumentEditorHeader />

      {/* Main Layout Container */}
      <div className="document-editor-main">
        {/* Sidebar Toggle Button */}
        <button
          className={`sidebar-toggle-btn ${isSidebarOpen ? 'sidebar-open' : ''}`}
          onClick={toggleSidebar}
          title={isSidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
          aria-label={isSidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
        >
          {isSidebarOpen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          )}
        </button>

        {/* Sidebar Overlay (Mobile) */}
        {isSidebarOpen && (
          <div 
            className="sidebar-overlay" 
            onClick={toggleSidebar}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <aside className={`document-editor-sidebar-wrapper ${isSidebarOpen ? 'sidebar-visible' : 'sidebar-hidden'}`}>
          <DocumentSidebar />
        </aside>

        {/* Main Content Area */}
        <main className="document-editor-content">
          {/* Formatting Toolbar */}
          <FormattingToolbar />

          {/* Editor Area */}
          <div className="editor-area-wrapper">
            <EditorArea />
          </div>

          {/* Status Bar */}
          <StatusBar />
        </main>
      </div>

      {/* Visual Indicators (Fixed Position) */}
      <div className="document-editor-indicators">
        <div className="indicators-left">
          <AutoSaveIndicator status="saved" lastSaved="2 min ago" />
        </div>
        <div className="indicators-right">
          <ConnectionStatus status="connected" showText={false} />
          <button
            className="fullscreen-toggle-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentEditorPage;

