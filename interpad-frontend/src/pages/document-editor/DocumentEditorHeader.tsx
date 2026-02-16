import './style/DocumentEditorHeader.css';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCallback, useRef, useEffect, useState } from 'react';
import { useDocumentEditor } from './context/DocumentEditorContext';
import { createDocument, updateDocument, createDocumentShareLink } from '../../services';
import type { DocumentModel } from './types/document';
import { getDocumentContent } from './types/document';
import Modal from './Modal';

const SAVED_RESET_MS = 2000;

interface DocumentEditorHeaderProps {
  onBackToDocs?: () => void;
}

const DocumentEditorHeader = ({ onBackToDocs }: DocumentEditorHeaderProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
    activeUsers,
  } = useDocumentEditor();

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const shareToken = searchParams.get('token') || undefined;

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
        : await updateDocument(
            document.id as string,
            payload,
            shareToken ? { token: shareToken } : undefined
          );

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
  }, [document.id, document.title, document.pages, setDocument, setSaveStatus, clearUnsavedChanges, navigate, shareToken]);

  const handleShare = useCallback(async () => {
    // Nëse dokumenti nuk është ruajtur ende, kërko fillimisht ruajtje.
    if (!document.id) {
      await handleSave();
      return;
    }

    setShareError(null);
    setHasCopied(false);
    setIsSharing(true);

    try {
      const share = await createDocumentShareLink(document.id);
      setShareLink(share.url);
      setIsShareModalOpen(true);

      // Provo të kopjosh linkun automatikisht në clipboard
      if (navigator && 'clipboard' in navigator && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(share.url);
          setHasCopied(true);
        } catch {
          // Nëse dështoi auto-copy, përdoruesi mund ta kopjojë manualisht
          setHasCopied(false);
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create share link';
      setShareError(message);
      setIsShareModalOpen(true);
    } finally {
      setIsSharing(false);
    }
  }, [document.id, handleSave]);

  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
    };
  }, []);

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
          {/* Active collaborators (presence) */}
          {activeUsers && activeUsers.length > 0 && (
            <div className="document-editor-collaborators" aria-label="Active collaborators">
              <div className="document-editor-collaborators-avatars">
                {activeUsers.slice(0, 3).map((user) => {
                  const name = user.name || 'Active user';
                  const initials = name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase())
                    .join('') || 'U';

                  return (
                    <div
                      key={user.userId}
                      className="document-editor-collaborator-avatar"
                      title={name}
                    >
                      <span className="document-editor-collaborator-avatar-initials">
                        {initials}
                      </span>
                    </div>
                  );
                })}
                {activeUsers.length > 3 && (
                  <div
                    className="document-editor-collaborator-avatar document-editor-collaborator-avatar-more"
                    title={`${activeUsers.length - 3} more collaborator(s)`}
                  >
                    +{activeUsers.length - 3}
                  </div>
                )}
              </div>
              <span className="document-editor-collaborators-label">
                {activeUsers.length === 1
                  ? '1 person here'
                  : `${activeUsers.length} people here`}
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
              title={document.id ? 'Share' : 'Save document before sharing'}
              onClick={handleShare}
              disabled={isSharing}
              aria-label="Share this document"
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

      <Modal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={shareError ? 'Share link error' : 'Share document link'}
        size="small"
      >
        {shareError ? (
          <p>{shareError}</p>
        ) : (
          <div className="document-editor-share-modal-content">
            <p>
              Anyone with this link, after logging in, will be able to access this
              document according to the sharing settings.
            </p>
            {shareLink && (
              <div className="document-editor-share-link-row">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="document-editor-share-link-input"
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label="Share link"
                />
                <button
                  type="button"
                  className="document-editor-share-copy-btn"
                  onClick={async () => {
                    if (!shareLink) return;
                    try {
                      if (navigator && 'clipboard' in navigator && navigator.clipboard?.writeText) {
                        await navigator.clipboard.writeText(shareLink);
                        setHasCopied(true);
                      } else {
                        // Fallback: për browser-a pa clipboard API, selekto tekstin
                      }
                    } catch {
                      setHasCopied(false);
                    }
                  }}
                >
                  {hasCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            )}
            <p className="document-editor-share-modal-hint">
              {hasCopied
                ? 'Link copied to your clipboard.'
                : 'If copying fails, you can manually select and copy the link.'}
            </p>
          </div>
        )}
      </Modal>
    </header>
  );
};

export default DocumentEditorHeader;

