import './style/DocumentEditorHeader.css';
import { Link, useNavigate } from 'react-router-dom';
import { useCallback, useRef, useEffect } from 'react';
import { useDocumentEditor } from './context/DocumentEditorContext';
import { createDocument, updateDocument } from '../../services';
import type { DocumentModel } from './types/document';

const SAVED_RESET_MS = 2000;

interface DocumentEditorHeaderProps {
  onBackToDocs?: () => void;
}

const DocumentEditorHeader = ({ onBackToDocs }: DocumentEditorHeaderProps) => {
  const navigate = useNavigate();
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    document,
    setTitle,
    setDocument,
    setSaveStatus,
    saveStatus,
  } = useDocumentEditor();

  const handleSave = useCallback(async () => {
    setSaveStatus('saving');
    if (savedTimeoutRef.current) {
      clearTimeout(savedTimeoutRef.current);
      savedTimeoutRef.current = null;
    }

    try {
      const payload = { title: document.title, content: document.content };
      const isNew = document.id == null;

      const doc = isNew
        ? await createDocument(payload)
        : await updateDocument(document.id as string, payload);

      const newDoc: DocumentModel = {
        id: doc.id,
        title: doc.title,
        content: doc.content,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        version: doc.version,
      };
      setDocument(newDoc);
      setSaveStatus('saved');

      if (isNew) {
        navigate(`/editor/${doc.id}`, { replace: true });
      }

      savedTimeoutRef.current = setTimeout(() => {
        setSaveStatus('idle');
        savedTimeoutRef.current = null;
      }, SAVED_RESET_MS);
    } catch {
      setSaveStatus('error');
    }
  }, [document.id, document.title, document.content, setDocument, setSaveStatus, navigate]);

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

