import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import './style/DocumentEditorStyles.css';
import './style/DocumentEditorPage.css';
import './style/DocumentSidebar.css';
import { DocumentEditorProvider, useDocumentEditor } from './context/DocumentEditorContext';
import DocumentEditorHeader from './DocumentEditorHeader';
import FormattingToolbar from './FormattingToolbar';
import EditorArea from './EditorArea';
import type { CommentSelectionAnchor } from './EditorArea';
import AddCommentPopover from './AddCommentPopover';
import DocumentSidebar from './DocumentSidebar';
import StatusBar from './StatusBar';
import { AutoSaveIndicator, ConnectionStatus } from './VisualIndicators';
import Modal, { ModalFooter } from './Modal';
import { getDocument } from '../../services';
import { getDefaultDocument, contentToPages } from './types/document';

const LEAVE_CONFIRM_TITLE = 'Exit without saving?';
const LEAVE_CONFIRM_MESSAGE = 'Are you sure you want to exit? You have not saved your changes.';

/** Kthen kohën relative nga updatedAt (p.sh. "Just now", "2 min ago") për treguesin "Last saved". */
function formatLastSaved(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return d.toLocaleDateString();
}

const DocumentEditorPageInner = () => {
  const { documentId } = useParams<{ documentId?: string }>();
  const navigate = useNavigate();
  const { openNewDocument, hasUnsavedChanges, setDocument, saveStatus, document: currentDocument, clearUnsavedChanges } = useDocumentEditor();
  const lastSavedLabel = formatLastSaved(currentDocument.updatedAt);
  const indicatorStatus =
    saveStatus === 'error' ? 'error' as const
    : saveStatus === 'saving' ? 'saving' as const
    : saveStatus === 'saved' || (saveStatus === 'idle' && lastSavedLabel) ? 'saved' as const
    : 'idle';
  const indicatorLastSaved =
    indicatorStatus === 'saved' ? lastSavedLabel : undefined;
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [documentLoadError, setDocumentLoadError] = useState<string | null>(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const [addCommentOpen, setAddCommentOpen] = useState<{
    anchor: CommentSelectionAnchor | null;
    rect: { top: number; left: number; width: number; height: number };
  } | null>(null);
  const [refreshCommentsKey, setRefreshCommentsKey] = useState(0);
  const [focusedCommentId, setFocusedCommentId] = useState<string | null>(null);

  // Hapi 4: Përmirëso logjikën e useBlocker
  // Kontrollo nëse save-i është duke u procesuar ose sapo u përfundua
  // Nëse save-i sapo u përfundua me sukses (saveStatus === 'saved'), mos shfaq popup-in
  // Ose përdor saveStatus për të kontrolluar nëse save-i është duke u procesuar (saveStatus === 'saving')
  // Nëse save-i është duke u procesuar ose sapo u përfundua, hasUnsavedChanges nuk duhet të aktivizojë blocker
  const shouldBlockNavigation = hasUnsavedChanges && saveStatus !== 'saving' && saveStatus !== 'saved';
  const blocker = useBlocker(shouldBlockNavigation);

  const showLeaveModal = showBackConfirm || blocker.state === 'blocked';

  const handleLeaveConfirm = useCallback(() => {
    if (blocker.state === 'blocked') {
      blocker.proceed();
    } else {
      setShowBackConfirm(false);
      navigate('/docs');
    }
  }, [blocker, navigate]);

  const handleLeaveCancel = useCallback(() => {
    if (blocker.state === 'blocked') {
      blocker.reset();
    } else {
      setShowBackConfirm(false);
    }
  }, [blocker]);

  const onBackToDocs = useCallback(() => {
    // Hapi 4: Kontrollo saveStatus para se të shfaqësh popup
    // Nëse save-i është duke u procesuar ose sapo u përfundua, mos shfaq popup
    if (hasUnsavedChanges && saveStatus !== 'saving' && saveStatus !== 'saved') {
      setShowBackConfirm(true);
    } else {
      navigate('/docs');
    }
  }, [hasUnsavedChanges, saveStatus, navigate]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Hapi 5: Trajto navigimin pas save
  // Përdor useEffect që kontrollon saveStatus === 'saved' dhe vendos hasUnsavedChanges = false
  // nëse është dokument i ri (currentDocument.id nuk është null pas save)
  // Kjo siguron që hasUnsavedChanges është false para navigimit
  useEffect(() => {
    // Nëse save-i sapo u përfundua me sukses dhe dokumenti ka id (nuk është më dokument i ri)
    // sigurohu që hasUnsavedChanges është false
    if (saveStatus === 'saved' && currentDocument.id != null && hasUnsavedChanges) {
      // Kjo është një siguri shtesë për të siguruar që hasUnsavedChanges është false
      // pas save të suksesshëm për dokumentin e ri
      clearUnsavedChanges();
    }
  }, [saveStatus, currentDocument.id, hasUnsavedChanges, clearUnsavedChanges]);

  // Kur hapet /editor (pa id ose "new") → dokument i ri. Kur /editor/:documentId → load nga API.
  useEffect(() => {
    if (documentId === undefined || documentId === 'new') {
      setDocumentLoadError(null);
      setIsLoadingDocument(false);
      openNewDocument();
      return;
    }

    let cancelled = false;
    setIsLoadingDocument(true);
    setDocumentLoadError(null);

    getDocument(documentId)
      .then((doc) => {
        if (cancelled) return;
        setDocument({
          id: doc.id,
          title: doc.title,
          pages: contentToPages(doc.content),
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          version: doc.version,
        });
      })
      .catch((e) => {
        if (cancelled) return;
        setDocumentLoadError(e instanceof Error ? e.message : 'Failed to load document');
        setDocument(getDefaultDocument());
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDocument(false);
      });

    return () => {
      cancelled = true;
    };
  }, [documentId, openNewDocument, setDocument]);

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
    if (!window.document.fullscreenElement) {
      window.document.documentElement.requestFullscreen().catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      window.document.exitFullscreen();
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!window.document.fullscreenElement);
    };

    window.document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      window.document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div className={`document-editor-page ${isFullscreen ? 'fullscreen-mode' : ''}`}>
      <Modal
        isOpen={showLeaveModal}
        onClose={handleLeaveCancel}
        title={LEAVE_CONFIRM_TITLE}
        showCloseButton={true}
        closeOnOverlayClick={false}
        size="small"
        footer={
          <ModalFooter
            cancelText="Cancel"
            confirmText="Exit"
            confirmVariant="danger"
            onCancel={handleLeaveCancel}
            onConfirm={handleLeaveConfirm}
          />
        }
      >
        <p className="document-editor-leave-confirm-message">{LEAVE_CONFIRM_MESSAGE}</p>
      </Modal>

      {/* Header */}
      <DocumentEditorHeader onBackToDocs={onBackToDocs} />

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
          <DocumentSidebar
            refreshCommentsKey={refreshCommentsKey}
            focusedCommentId={focusedCommentId}
            onFocusedCommentSeen={() => setFocusedCommentId(null)}
            onCommentDeleted={() => setRefreshCommentsKey((k) => k + 1)}
            onRequestAddCommentWithoutSelection={
              currentDocument.id
                ? () =>
                    setAddCommentOpen({
                      anchor: null,
                      rect: {
                        top: 120,
                        left: typeof window !== 'undefined' ? window.innerWidth / 2 - 180 : 200,
                        width: 360,
                        height: 0,
                      },
                    })
                : undefined
            }
          />
        </aside>

        {/* Main Content Area */}
        <main className="document-editor-content">
          {documentLoadError && (
            <div className="document-editor-load-error" role="alert">
              {documentLoadError}
            </div>
          )}
          {/* Formatting Toolbar */}
          <FormattingToolbar />

          {/* Editor Area */}
          <div className="editor-area-wrapper">
            {isLoadingDocument ? (
              <div className="document-editor-doc-loading">
                <div className="document-editor-doc-loading-spinner" aria-hidden />
                <p className="document-editor-doc-loading-text">Duke ngarkuar dokumentin…</p>
              </div>
            ) : (
              <EditorArea
                onAddCommentClick={
                  currentDocument.id
                    ? (anchor, rect) => setAddCommentOpen({ anchor, rect })
                    : undefined
                }
                onCommentHighlightClick={
                  currentDocument.id
                    ? (commentId) => {
                        setFocusedCommentId(commentId);
                        setIsSidebarOpen(true);
                      }
                    : undefined
                }
              />
            )}
          </div>

          {/* Status Bar */}
          <StatusBar />
        </main>
      </div>

      {/* Add Comment popover (hapi 3) – vetëm kur dokumenti ka id (është ruajtur) */}
      {addCommentOpen && currentDocument.id && (
        <>
          <div
            className="add-comment-backdrop"
            role="presentation"
            aria-hidden
            onClick={() => setAddCommentOpen(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'transparent' }}
          />
          <AddCommentPopover
            documentId={currentDocument.id}
            anchor={addCommentOpen.anchor}
            rect={addCommentOpen.rect}
            onClose={() => setAddCommentOpen(null)}
            onSuccess={(commentId) => {
              setRefreshCommentsKey((k) => k + 1);
              if (commentId) {
                setFocusedCommentId(commentId);
                setIsSidebarOpen(true);
              }
            }}
          />
        </>
      )}

      {/* Visual Indicators (Fixed Position) */}
      <div className="document-editor-indicators">
        <div className="indicators-left">
          <AutoSaveIndicator status={indicatorStatus} lastSaved={indicatorLastSaved} />
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

const DocumentEditorPage = () => (
  <DocumentEditorProvider>
    <DocumentEditorPageInner />
  </DocumentEditorProvider>
);

export default DocumentEditorPage;

