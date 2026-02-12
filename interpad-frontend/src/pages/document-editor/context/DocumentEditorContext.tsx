import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type { DocumentModel } from '../types/document';
import { getDefaultDocument } from '../types/document';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface DocumentEditorContextValue {
  /** Dokumenti aktual (id, title, content, metadata) */
  document: DocumentModel;
  /** A ka ndryshime të paruajtura */
  hasUnsavedChanges: boolean;
  /** Gjendja e ruajtjes – për UI (indicator, butonin Save) */
  saveStatus: SaveStatus;
  /** Ref te contentEditable (caktohet nga EditorArea) – për undo/redo dhe fokus */
  editorRef: React.RefObject<HTMLDivElement | null>;
  /** Zëvendëson tërë dokumentin (p.sh. pas load nga API). Kur save përfundon me sukses, thirr setDocument(doc) që vendos hasUnsavedChanges = false. */
  setDocument: (doc: DocumentModel) => void;
  /** Hap dokument të ri: id null, title "Untitled Document", content fillestar; vendos hasUnsavedChanges = false. Thirret nga URL /doc/new ose butoni "New". */
  openNewDocument: () => void;
  /** Përditëson titullin; vendos hasUnsavedChanges = true */
  setTitle: (value: string) => void;
  /** Përditëson përmbajtjen (HTML); vendos hasUnsavedChanges = true */
  setContent: (value: string) => void;
  /** Vendos gjendjen e ruajtjes (p.sh. 'saving' / 'saved' / 'error') */
  setSaveStatus: (status: SaveStatus) => void;
  /** (Opsional) Përditëson metadata – createdAt, updatedAt, version */
  updateMetadata: (meta: Partial<Pick<DocumentModel, 'createdAt' | 'updatedAt' | 'version'>>) => void;
  /** Undo – document.execCommand('undo') me fokus te editorit */
  undo: () => void;
  /** Redo – document.execCommand('redo') me fokus te editorit */
  redo: () => void;
  /** Ruaj selection-in aktual të editorit (thirret onBlur) – për dropdown/dialog që marrin fokusin */
  saveEditorSelection: () => void;
  /** Rikthe selection-in e ruajtur dhe fokuson editorin; kthen true nëse u rikthye */
  restoreEditorSelection: () => boolean;
}

const DocumentEditorContext = createContext<DocumentEditorContextValue | null>(null);

export function DocumentEditorProvider({ children }: { children: ReactNode }) {
  const [document, setDocumentState] = useState<DocumentModel>(getDefaultDocument);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatusState] = useState<SaveStatus>('idle');
  const editorRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);

  const saveEditorSelection = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const sel = window.document.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.startContainer) || !el.contains(range.endContainer)) return;
    savedRangeRef.current = range.cloneRange();
  }, []);

  const restoreEditorSelection = useCallback((): boolean => {
    const el = editorRef.current;
    const range = savedRangeRef.current;
    if (!el || !range) return false;
    el.focus();
    const sel = window.document.getSelection();
    if (sel) {
      sel.removeAllRanges();
      try {
        sel.addRange(range);
      } catch {
        savedRangeRef.current = null;
        return false;
      }
    }
    savedRangeRef.current = null;
    return true;
  }, []);

  const setDocument = useCallback((doc: DocumentModel) => {
    setDocumentState(doc);
    setHasUnsavedChanges(false);
  }, []);

  const openNewDocument = useCallback(() => {
    setDocument(getDefaultDocument());
  }, [setDocument]);

  const setTitle = useCallback((value: string) => {
    setDocumentState((prev) => ({ ...prev, title: value }));
    setHasUnsavedChanges(true);
  }, []);

  const setContent = useCallback((value: string) => {
    setDocumentState((prev) => ({ ...prev, content: value }));
    setHasUnsavedChanges(true);
  }, []);

  const setSaveStatus = useCallback((status: SaveStatus) => {
    setSaveStatusState(status);
  }, []);

  const undo = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    setTimeout(() => {
      window.document.execCommand('undo', false, undefined);
      const editor = editorRef.current;
      if (editor) setContent(editor.innerHTML);
    }, 0);
  }, [setContent]);

  const redo = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    setTimeout(() => {
      window.document.execCommand('redo', false, undefined);
      const editor = editorRef.current;
      if (editor) setContent(editor.innerHTML);
    }, 0);
  }, [setContent]);

  const updateMetadata = useCallback(
    (meta: Partial<Pick<DocumentModel, 'createdAt' | 'updatedAt' | 'version'>>) => {
      setDocumentState((prev) => ({ ...prev, ...meta }));
    },
    []
  );

  const value: DocumentEditorContextValue = {
    document,
    hasUnsavedChanges,
    saveStatus,
    editorRef,
    setDocument,
    openNewDocument,
    setTitle,
    setContent,
    setSaveStatus,
    updateMetadata,
    undo,
    redo,
    saveEditorSelection,
    restoreEditorSelection,
  };

  return (
    <DocumentEditorContext.Provider value={value}>
      {children}
    </DocumentEditorContext.Provider>
  );
}

export function useDocumentEditor(): DocumentEditorContextValue {
  const ctx = useContext(DocumentEditorContext);
  if (!ctx) {
    throw new Error('useDocumentEditor must be used within DocumentEditorProvider');
  }
  return ctx;
}
