import './style/DocumentEditorHeader.css';
import { Link, useNavigate } from 'react-router-dom';
import { useCallback, useRef, useEffect, useState } from 'react';
import { useDocumentEditor } from './context/DocumentEditorContext';
import { createDocument, updateDocument, createDocumentShareLink } from '../../services';
import type { DocumentModel } from './types/document';
import { getDocumentContent } from './types/document';
import Modal, { ModalFooter } from './Modal';

const SAVED_RESET_MS = 2000;

interface DocumentEditorHeaderProps {
  onBackToDocs?: () => void;
  collaboratorCount?: number | null;
}

const DocumentEditorHeader = ({ onBackToDocs, collaboratorCount }: DocumentEditorHeaderProps) => {
  const navigate = useNavigate();
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Hapi 3: Flag përkohës që tregon që save-i është përfunduar për dokumentin e ri
  // Kjo përdoret për të siguruar që navigimi bëhet pasi state është përditësuar
  const isSavingNewDocumentRef = useRef<boolean>(false);
  const {
    document,
    setTitle,
    setDocument,
    setSaveStatus,
    saveStatus,
    clearUnsavedChanges,
  } = useDocumentEditor();
  const [isShareLoading, setIsShareLoading] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  const handleSave = useCallback(async () => {
    setSaveStatus('saving');
    if (savedTimeoutRef.current) {
      clearTimeout(savedTimeoutRef.current);
      savedTimeoutRef.current = null;
    }

    try {
      const payload = { title: document.title, content: getDocumentContent(document) };
      const isNew = document.id == null;

      // Hapi 3: Trajto rastin e dokumentit të ri
      // Nëse është dokument i ri, vendos flag që tregon që save-i është duke u procesuar
      if (isNew) {
        isSavingNewDocumentRef.current = true;
      }

      const doc = isNew
        ? await createDocument(payload)
        : await updateDocument(document.id as string, payload);

      // Ruaj strukturën e faqesh të editorit; API kthen content të bashkuar, por ne duam të mbajmë pages[]
      const newDoc: DocumentModel = {
        id: doc.id,
        title: doc.title,
        pages: document.pages.length > 0 ? document.pages : [doc.content ?? ''],
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        version: doc.version,
      };
      
      // Hapi 2 & 3: Përmirëso logjikën e handleSave
      // Pas setDocument(newDoc), sigurohu që hasUnsavedChanges është false para se të bësh navigate
      // setDocument vendos hasUnsavedChanges = false, por React state updates janë asinkrone
      // Përdor setTimeout me delay të vogël për të siguruar që state është përditësuar para navigimit
      setDocument(newDoc);
      setSaveStatus('saved');

      // Hapi 3 & 5: Trajto rastin e dokumentit të ri
      // Nëse është dokument i ri, vendos flag që tregon që save-i është përfunduar
      // Para se të bësh navigate, sigurohu që hasUnsavedChanges është false
      // Hapi 5: Nëse është dokument i ri dhe save-i u përfundua me sukses, vendos hasUnsavedChanges = false eksplicitisht
      if (isNew) {
        // Hapi 5: Vendos hasUnsavedChanges = false eksplicitisht para navigimit
        // Kjo siguron që useBlocker nuk do të shfaqë popup
        clearUnsavedChanges();
        
        // Përdor setTimeout për të siguruar që hasUnsavedChanges është përditësuar në false
        // para se të bëhet navigate, kështu që useBlocker nuk do të shfaqë popup
        // Delay i vogël (10ms) për të siguruar që React ka aplikuar state updates
        setTimeout(() => {
          // Sigurohu që flag-u tregon që save-i është përfunduar
          isSavingNewDocumentRef.current = false;
          navigate(`/editor/${doc.id}`, { replace: true });
        }, 10);
      } else {
        // Nëse nuk është dokument i ri, reset flag-u
        isSavingNewDocumentRef.current = false;
      }

      savedTimeoutRef.current = setTimeout(() => {
        setSaveStatus('idle');
        savedTimeoutRef.current = null;
      }, SAVED_RESET_MS);
    } catch {
      setSaveStatus('error');
      // Nëse ka gabim, reset flag-u
      isSavingNewDocumentRef.current = false;
    }
  }, [document.id, document.title, document.pages, setDocument, setSaveStatus, clearUnsavedChanges, navigate]);

  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
    };
  }, []);

  const handleOpenShareModal = () => {
    setIsShareModalOpen(true);
  };

  const handleCloseShareModal = () => {
    setIsShareModalOpen(false);
    setShareError(null);
    setCopyStatus('idle');
  };

  const handleShareClick = useCallback(async () => {
    if (!document.id) {
      setShareUrl(null);
      setShareError('Please save the document before creating a share link.');
      handleOpenShareModal();
      return;
    }

    setIsShareLoading(true);
    setShareError(null);
    setCopyStatus('idle');

    try {
      const share = await createDocumentShareLink(document.id as string);
      setShareUrl(share.url);
      handleOpenShareModal();

      // Try to copy immediately for convenience; ignore failures silently.
      if (navigator && 'clipboard' in navigator && share.url) {
        try {
          await navigator.clipboard.writeText(share.url);
          setCopyStatus('copied');
        } catch {
          // Ignore – user can still copy manually.
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create share link';
      setShareUrl(null);
      setShareError(message);
      handleOpenShareModal();
    } finally {
      setIsShareLoading(false);
    }
  }, [document.id]);

  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return;

    try {
      if (navigator && 'clipboard' in navigator) {
        await navigator.clipboard.writeText(shareUrl);
        setCopyStatus('copied');
      } else {
        // Fallback – select text manually
        setCopyStatus('error');
      }
    } catch {
      setCopyStatus('error');
    }
  }, [shareUrl]);

  return (
    <>
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
            {typeof collaboratorCount === 'number' && collaboratorCount > 0 && (
              <div
                className="document-editor-presence-pill"
                aria-label={`${collaboratorCount} ${collaboratorCount === 1 ? 'person' : 'people'} editing`}
              >
                <span className="document-editor-presence-dot" aria-hidden />
                <span className="document-editor-presence-text">
                  {collaboratorCount === 1 ? 'Just you editing' : `${collaboratorCount} people editing`}
                </span>
              </div>
            )}
            <div className="document-editor-actions">
              <button
                type="button"
                className="document-editor-btn document-editor-btn-back"
                title="Back to docs"
                onClick={onBackToDocs ?? (() => navigate('/docs'))}
                aria-label="Back to docs"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
              </button>
              <button
                type="button"
                className={`document-editor-btn document-editor-btn-save ${saveStatus === 'saved' ? 'document-editor-btn-save-success' : ''}`}
                title={saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Save'}
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
                aria-label={saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Save'}
              >
                {saveStatus === 'saving' && (
                  <span className="document-editor-save-label">Saving…</span>
                )}
                {saveStatus === 'saved' && (
                  <span className="document-editor-save-saved">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Saved
                  </span>
                )}
                {saveStatus !== 'saving' && saveStatus !== 'saved' && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
              <button
                type="button"
                className="document-editor-btn document-editor-btn-share"
                title={document.id ? (isShareLoading ? 'Generating share link…' : 'Share') : 'Save document before sharing'}
                onClick={handleShareClick}
                disabled={isShareLoading}
                aria-label={document.id ? 'Share document' : 'Save document before sharing'}
              >
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

      <Modal
        isOpen={isShareModalOpen}
        onClose={handleCloseShareModal}
        title={shareUrl ? 'Share this document' : 'Share document'}
        size="small"
        footer={
          <ModalFooter
            onCancel={handleCloseShareModal}
            showConfirm={false}
          />
        }
      >
        {isShareLoading && (
          <p>Generating share link…</p>
        )}
        {!isShareLoading && shareError && (
          <p className="document-editor-share-error">{shareError}</p>
        )}
        {!isShareLoading && shareUrl && (
          <div className="document-editor-share-content">
            <p className="document-editor-share-description">
              Anyone with this link can open the document according to its sharing settings.
            </p>
            <div className="document-editor-share-row">
              <input
                type="text"
                className="document-editor-share-input"
                readOnly
                value={shareUrl}
                onFocus={(e) => e.target.select()}
              />
              <button
                type="button"
                className="document-editor-btn document-editor-btn-copy-link"
                onClick={handleCopyLink}
              >
                Copy link
              </button>
            </div>
            {copyStatus === 'copied' && (
              <p className="document-editor-share-status document-editor-share-status-success">
                Link copied to clipboard.
              </p>
            )}
            {copyStatus === 'error' && (
              <p className="document-editor-share-status document-editor-share-status-error">
                Could not copy automatically. Please select and copy the link manually.
              </p>
            )}
          </div>
        )}
      </Modal>
    </>
  );
};

export default DocumentEditorHeader;

