import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import type * as Y from 'yjs';
import type { DocumentModel } from '../types/document';
import { getDefaultDocument, PAGE_DELIMITER, contentToPages, DEFAULT_PAGE_HTML } from '../types/document';
import type { DocumentComment } from '../../../services/index';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/** Anchor për scroll te teksti i komentuar (hapi 4). */
export interface CommentAnchorScroll {
  pageIndex: number;
  startOffset: number;
  endOffset: number;
}

export interface DocumentEditorContextValue {
  /** Dokumenti aktual (id, title, pages, metadata) */
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
  /** Përditëson përmbajtjen e faqes së parë (HTML); vendos hasUnsavedChanges = true. (Hapi 2: për tani një faqe.) */
  setContent: (value: string) => void;
  /** Vendos listën e plotë të faqesh (p.sh. pas split overflow – Hapi 5); vendos hasUnsavedChanges = true. */
  setPages: (pages: string[]) => void;
  /** Përditëson përmbajtjen e një faqeje me indeks (Hapi 7 – UI me shumë faqe). */
  setPageContent: (pageIndex: number, value: string) => void;
  /** Vendos gjendjen e ruajtjes (p.sh. 'saving' / 'saved' / 'error') */
  setSaveStatus: (status: SaveStatus) => void;
  /** Vendos hasUnsavedChanges = false eksplicitisht (p.sh. pas save të suksesshëm për dokumentin e ri) */
  clearUnsavedChanges: () => void;
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
  /** Indeksi i faqes së fokusuar (0-based); për StatusBar "Page X of Y". */
  focusedPageIndex: number;
  /** Vendos faqen e fokusuar (thirret nga EditorArea onFocus). */
  setFocusedPageIndex: (index: number) => void;
  /** Regjistron funksionin që scroll-on te teksti i komentuar (thirret nga EditorArea). */
  registerScrollToCommentAnchor: (fn: ((anchor: CommentAnchorScroll) => void) | null) => void;
  /** Scroll te teksti i komentuar dhe vendos selection mbi të (thirret nga Sidebar kur klikohet një koment). */
  scrollToCommentAnchor: (anchor: CommentAnchorScroll) => void;
  /** Lista e komenteve (për sidebar dhe për highlight në editor – hapi 6). */
  comments: DocumentComment[];
  /** Vendos listën e komenteve (thirret nga Sidebar pas fetch). */
  setComments: (comments: DocumentComment[]) => void;
  /** Niveli i zoom-it të editorit (50–200%, p.sh. 100 = 100%). */
  zoomLevel: number;
  /** Vendos nivelin e zoom-it (thirret nga StatusBar). */
  setZoomLevel: (value: number) => void;
  /** Yjs Doc aktiv për këtë editor (nëse kollaborimi është aktiv). */
  collabDoc: Y.Doc | null;
  /** Yjs shared text që mban përmbajtjen e dokumentit (HTML + PAGE_DELIMITER). */
  collabText: Y.Text | null;
  /** Vendos ose heq lidhjen me dokumentin kollaborues Yjs. */
  attachCollab: (binding: { ydoc: Y.Doc; yText: Y.Text } | null) => void;
}

const DocumentEditorContext = createContext<DocumentEditorContextValue | null>(null);

const ZOOM_STORAGE_KEY = 'interpad-editor-zoom';
const ZOOM_MIN = 50;
const ZOOM_MAX = 200;

function getStoredZoomLevel(): number {
  if (typeof window === 'undefined') return 100;
  try {
    const stored = window.localStorage.getItem(ZOOM_STORAGE_KEY);
    if (stored !== null) {
      const n = parseInt(stored, 10);
      if (Number.isInteger(n) && n >= ZOOM_MIN && n <= ZOOM_MAX) return n;
    }
  } catch {
    /* ignore */
  }
  return 100;
}

export function DocumentEditorProvider({ children }: { children: ReactNode }) {
  const [document, setDocumentState] = useState<DocumentModel>(getDefaultDocument);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatusState] = useState<SaveStatus>('idle');
  const [focusedPageIndex, setFocusedPageIndex] = useState(0);
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [zoomLevel, setZoomLevelState] = useState(getStoredZoomLevel);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const scrollToCommentAnchorRef = useRef<((anchor: CommentAnchorScroll) => void) | null>(null);
  // Flamur për të dalluar kur po aplikojmë ndryshime nga shared state (remote)
  // që të mos shkaktojmë cikle dhe të mos mbishkruajmë menjëherë ndryshimet lokale.
  const isApplyingRemoteRef = useRef(false);
  const [collabDoc, setCollabDoc] = useState<Y.Doc | null>(null);
  const [collabText, setCollabText] = useState<Y.Text | null>(null);

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
    setFocusedPageIndex(0);
  }, []);

  const openNewDocument = useCallback(() => {
    setDocument(getDefaultDocument());
  }, [setDocument]);

  const setTitle = useCallback((value: string) => {
    setDocumentState((prev) => ({ ...prev, title: value }));
    setHasUnsavedChanges(true);
  }, []);

  /**
   * Helper që aplikon një ndryshim te faqet dhe, nëse ka një Yjs binding aktiv,
   * e shkruan ndryshimin edhe në shared text (që sinkrohet real‑time me klientët tjerë).
   */
  const applyPagesUpdate = useCallback(
    (updater: (prevPages: string[]) => string[]) => {
      // Nëse aktualisht po aplikojmë ndryshime nga shared state (remote),
      // mos shkruaj përsëri në Yjs për të shmangur ciklet dhe mbishkrimet.
      if (isApplyingRemoteRef.current) {
        setDocumentState((prev) => {
          const nextPages = updater(prev.pages);
          return { ...prev, pages: nextPages };
        });
        setHasUnsavedChanges(true);
        return;
      }

      setDocumentState((prev) => {
        const nextPages = updater(prev.pages);

        if (collabDoc && collabText) {
          const fullContent = nextPages.join(PAGE_DELIMITER);
          collabDoc.transact(() => {
            if (collabText.length > 0) {
              collabText.delete(0, collabText.length);
            }
            if (fullContent) {
              collabText.insert(0, fullContent);
            }
          });
        }

        return { ...prev, pages: nextPages };
      });
      setHasUnsavedChanges(true);
    },
    [collabDoc, collabText]
  );

  const setContent = useCallback(
    (value: string) => {
      applyPagesUpdate(() => [value]);
    },
    [applyPagesUpdate]
  );

  const setPages = useCallback(
    (pages: string[]) => {
      applyPagesUpdate(() => pages);
    },
    [applyPagesUpdate]
  );

  const setPageContent = useCallback(
    (pageIndex: number, value: string) => {
      applyPagesUpdate((prevPages) =>
        prevPages.map((p, i) => (i === pageIndex ? value : p))
      );
    },
    [applyPagesUpdate]
  );

  const setSaveStatus = useCallback((status: SaveStatus) => {
    setSaveStatusState(status);
  }, []);

  // Hapi 5: Funksion për të vendosur hasUnsavedChanges = false eksplicitisht
  // Përdoret pas save të suksesshëm për dokumentin e ri para navigimit
  const clearUnsavedChanges = useCallback(() => {
    setHasUnsavedChanges(false);
  }, []);

  const undo = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    setTimeout(() => {
      window.document.execCommand('undo', false, undefined);
      const editor = editorRef.current;
      if (editor) {
        if (document.pages.length > 1) {
          setPageContent(focusedPageIndex, editor.innerHTML);
        } else {
          setContent(editor.innerHTML);
        }
      }
    }, 0);
  }, [document.pages.length, focusedPageIndex, setContent, setPageContent]);

  const redo = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    setTimeout(() => {
      window.document.execCommand('redo', false, undefined);
      const editor = editorRef.current;
      if (editor) {
        if (document.pages.length > 1) {
          setPageContent(focusedPageIndex, editor.innerHTML);
        } else {
          setContent(editor.innerHTML);
        }
      }
    }, 0);
  }, [document.pages.length, focusedPageIndex, setContent, setPageContent]);

  const updateMetadata = useCallback(
    (meta: Partial<Pick<DocumentModel, 'createdAt' | 'updatedAt' | 'version'>>) => {
      setDocumentState((prev) => ({ ...prev, ...meta }));
    },
    []
  );

  const registerScrollToCommentAnchor = useCallback((fn: ((anchor: CommentAnchorScroll) => void) | null) => {
    scrollToCommentAnchorRef.current = fn;
  }, []);

  const scrollToCommentAnchor = useCallback((anchor: CommentAnchorScroll) => {
    scrollToCommentAnchorRef.current?.(anchor);
  }, []);

  const setZoomLevel = useCallback((value: number) => {
    const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
    setZoomLevelState(clamped);
  }, []);

  /**
   * Lidh ose shkëput editorin nga një dokument kollaborues Yjs.
   *
   * Pas ndryshimit (Hapi 2):
   *  - Nuk inicializojmë më shared text nga dokumenti lokal në frontend.
   *  - Gjendja fillestare e shared text vjen nga serveri (MongoDB/Yjs),
   *    në mënyrë që klientët e rinj të mos e mbishkruajnë aksidentalisht përmbajtjen ekzistuese.
   */
  const attachCollab = useCallback(
    (binding: { ydoc: Y.Doc; yText: Y.Text } | null) => {
      setCollabDoc(binding ? binding.ydoc : null);
      setCollabText(binding ? binding.yText : null);
    },
    []
  );

  useEffect(() => {
    if (!collabDoc || !collabText) return;

    const applyFromShared = () => {
      const content = collabText.toString();
      const pages = contentToPages(content);
      const isRemoteEmpty = !content || !content.trim();
      isApplyingRemoteRef.current = true;
      try {
        setDocumentState((prev) => {
          // Nëse remote është bosh, por lokalisht kemi përmbajtje reale (jo vetëm placeholder),
          // mos e mbishkruaj dokumentin me placeholder.
          if (isRemoteEmpty) {
            const hasRealLocalContent = prev.pages.some((p) => {
              const trimmed = (p ?? '').trim();
              return trimmed && trimmed !== DEFAULT_PAGE_HTML;
            });
            if (hasRealLocalContent) {
              return prev;
            }
          }

          return {
            ...prev,
            pages,
          };
        });
      } finally {
        isApplyingRemoteRef.current = false;
      }
    };

    // Pas lidhjes, trajto Yjs si burim të vërtetë për përmbajtjen.
    applyFromShared();

    const observer = () => {
      applyFromShared();
    };

    collabText.observe(observer);
    return () => {
      collabText.unobserve(observer);
    };
  // Që të shmangim loop-in, varim vetëm nga lidhja Yjs (collabDoc/collabText),
  // jo nga dokumenti React që e përditësojmë brenda këtij efekti.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collabDoc, collabText]);

  useEffect(() => {
    try {
      window.localStorage.setItem(ZOOM_STORAGE_KEY, String(zoomLevel));
    } catch {
      /* ignore */
    }
  }, [zoomLevel]);

  const value: DocumentEditorContextValue = {
    document,
    hasUnsavedChanges,
    saveStatus,
    editorRef,
    setDocument,
    openNewDocument,
    setTitle,
    setContent,
    setPages,
    setPageContent,
    setSaveStatus,
    clearUnsavedChanges,
    updateMetadata,
    undo,
    redo,
    saveEditorSelection,
    restoreEditorSelection,
    focusedPageIndex,
    setFocusedPageIndex,
    registerScrollToCommentAnchor,
    scrollToCommentAnchor,
    comments,
    setComments,
    zoomLevel,
    setZoomLevel,
    collabDoc,
    collabText,
    attachCollab,
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
