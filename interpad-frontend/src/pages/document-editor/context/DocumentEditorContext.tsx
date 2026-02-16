import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import type { DocumentModel } from '../types/document';
import {
  getDefaultDocument,
  getDocumentContent,
  serializePagesToText,
  splitTextToPages,
} from '../types/document';
import type { DocumentComment } from '../../services';
import {
  type ConnectionStatus,
  type RealtimeOperation,
  type RealtimePresenceUser,
} from '../../../realtime/protocol';
import { useDocumentRealtime } from '../../../hooks';

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
  /** Teksti i plotë i dokumentit (të gjitha faqet bashkë – përdoret nga realtime layer). */
  fullText: string;
  /** Versioni i fundit i njohur i dokumentit nga realtime server (monotonik). */
  fullTextVersion: number;
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
  /** Gjendja aktuale e lidhjes realtime për këtë dokument. */
  connectionStatus: ConnectionStatus;
  /** Lista e bashkëpunëtorëve aktivë në këtë dokument (nga presence layer). */
  activeUsers: RealtimePresenceUser[];
  /** Lista e fundit e operations të aplikuara nga realtime serveri – përdoret për të rregulluar cursorin lokal. */
  lastAppliedOps: RealtimeOperation[] | null;
  /** Pas konsumimit nga editori, pastron lastAppliedOps që të mos reaplikohet. */
  clearLastAppliedOps: () => void;
}

const DocumentEditorContext = createContext<DocumentEditorContextValue | null>(null);

const ZOOM_STORAGE_KEY = 'interpad-editor-zoom';
const ZOOM_MIN = 50;
const ZOOM_MAX = 200;

function arePageArraysEqual(a: string[], b: string[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

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

/** Aplikon një listë operations (insert/delete) mbi një tekst dhe kthen tekstin e ri. */
function applyOpsToText(baseText: string, ops: RealtimeOperation[]): string {
  let text = baseText;

  for (const op of ops) {
    const pos = Math.max(0, Math.min(text.length, op.pos));

    if (op.type === 'delete') {
      const length = Math.max(
        0,
        Math.min(op.length ?? 0, text.length - pos)
      );
      if (length > 0) {
        text = text.slice(0, pos) + text.slice(pos + length);
      }
    } else if (op.type === 'insert') {
      const insertText = op.text ?? '';
      if (insertText.length > 0) {
        text = text.slice(0, pos) + insertText + text.slice(pos);
      }
    }
  }

  return text;
}

export function DocumentEditorProvider({ children }: { children: ReactNode }) {
  const [document, setDocumentState] = useState<DocumentModel>(getDefaultDocument);
  // serverText/serverVersion: gjendja e fundit e konfirmuar nga serveri (realtime autosave).
  const [serverText, setServerText] = useState<string>(() =>
    getDocumentContent(getDefaultDocument())
  );
  const [serverVersion, setServerVersion] = useState<number>(0);
  // fullText: gjendja lokale e editorit (serverText + pendingOps).
  const [fullText, setFullText] = useState<string>(() =>
    getDocumentContent(getDefaultDocument())
  );
  // fullTextVersion: në këtë fazë pasqyron serverVersion-in e fundit të njohur.
  const [fullTextVersion, setFullTextVersion] = useState<number>(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatusState] = useState<SaveStatus>('idle');
  const [focusedPageIndex, setFocusedPageIndex] = useState(0);
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [zoomLevel, setZoomLevelState] = useState(getStoredZoomLevel);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const scrollToCommentAnchorRef = useRef<((anchor: CommentAnchorScroll) => void) | null>(null);
  // pendingOpsRef: lista e operations të nisura nga ky klient por ende jo të konfirmuara nga serveri.
  const pendingOpsRef = useRef<RealtimeOperation[]>([]);
  // Mbajmë një ref për serverText që të kemi gjithmonë vlerën aktuale brenda callbacks.
  const serverTextRef = useRef<string>(serverText);
  const serverVersionRef = useRef<number>(serverVersion);
  // Lista e fundit e ops të aplikuara nga serveri (remote-only) – përdoret nga editori për të rregulluar cursorin.
  const [lastAppliedOps, setLastAppliedOps] = useState<RealtimeOperation[] | null>(null);
  // Flamur për të treguar kur po aplikojmë ops remote në fullText – përdoret për të shmangur
  // split-in automatik të faqeve nga fullText gjatë këtyre përditësimeve, që ndryshe mund të
  // shkaktonte duplikime faqesh në kombinim me logjikën lokale të split-it.
  const isApplyingRemoteOpsRef = useRef<boolean>(false);

  useEffect(() => {
    serverTextRef.current = serverText;
  }, [serverText]);

  useEffect(() => {
    serverVersionRef.current = serverVersion;
  }, [serverVersion]);

  const { connectionStatus, initialState, activeUsers, sendOps } = useDocumentRealtime({
    documentId: document.id,
    enabled: document.id != null,
    onOpsCommitted: (payload) => {
      if (!payload || payload.documentId !== document.id) return;
      if (!payload.opsApplied || payload.opsApplied.length === 0) {
        // Asnjë op i ri – thjesht përditëso version-in serveror që njohim.
        setServerVersion(payload.newVersion);
        setFullTextVersion(payload.newVersion);
        setLastAppliedOps(null);
        return;
      }
      // 1) Apliko opsApplied mbi serverText-in aktual për të marrë tekstin e ri të konfirmuar.
      const prevServerText = serverTextRef.current;
      const nextServerText = applyOpsToText(prevServerText, payload.opsApplied);
      serverTextRef.current = nextServerText;
      setServerText(nextServerText);

      // 2) Hiq nga pendingOps çdo op që u konfirmua nga serveri (id përputhet) dhe
      // detekto nëse batch-i përmban vetëm ops remote (asnjeri nuk ishte në pendingOpsRef).
      const committedIds = new Set(payload.opsApplied.map((op) => op.id));
      const hadLocalCommittedOps = pendingOpsRef.current.some((op) =>
        committedIds.has(op.id)
      );
      const remainingPending = pendingOpsRef.current.filter((op) => !committedIds.has(op.id));
      pendingOpsRef.current = remainingPending;

      // 3) Përditëso version-in serveror të njohur dhe pasqyroje tek fullTextVersion.
      setServerVersion(payload.newVersion);
      setFullTextVersion(payload.newVersion);

      // 4) Nëse batch-i përmban ops lokale të këtij klienti, i konsiderojmë tashmë
      // të aplikuara në fullText (përmes diff‑it lokal) dhe nuk e rishkruajmë fullText.
      // Vetëm sinkronizojmë serverText/version dhe pastrojmë pendingOps.
      if (hadLocalCommittedOps) {
        setLastAppliedOps(null);
        return;
      }

      // 5) Nëse batch-i ishte vetëm remote (asnjeri nga pendingOps), rindërto
      // gjendjen lokale (fullText) duke aplikuar pendingOps mbi serverText-in e ri
      // dhe ekspozo ops për editorin që të rregullojë cursorin.
      isApplyingRemoteOpsRef.current = true;
      const rebuiltLocalText = applyOpsToText(nextServerText, remainingPending);
      setFullText(rebuiltLocalText);
      // Pastro flamurin pas përditësimit të fullText për të lejuar split-in automatik të faqeve
      // përsëri pasi që ops-at remote janë aplikuar.
      setTimeout(() => {
        isApplyingRemoteOpsRef.current = false;
      }, 0);

      if (payload.opsApplied.length > 0) {
        setLastAppliedOps(payload.opsApplied);
      } else {
        setLastAppliedOps(null);
      }
    },
  });

  /** Gjeneron një id të thjeshtë, deterministic mjaftueshëm për ops lokale. */
  const generateOpId = () => {
    if (typeof window !== 'undefined' && 'crypto' in window && window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }
    return `op_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  };

  /** Heuristikë e thjeshtë diff: kthen listën e ops insert/delete për ndryshimin mes teksteve. */
  const buildOpsForTextChange = useCallback(
    (previous: string, next: string): RealtimeOperation[] => {
      if (previous === next || document.id == null) return [];

      const prev = previous ?? '';
      const curr = next ?? '';

      let start = 0;
      const maxStart = Math.min(prev.length, curr.length);
      while (start < maxStart && prev[start] === curr[start]) {
        start += 1;
      }

      let endPrev = prev.length - 1;
      let endCurr = curr.length - 1;
      while (endPrev >= start && endCurr >= start && prev[endPrev] === curr[endCurr]) {
        endPrev -= 1;
        endCurr -= 1;
      }

      const removedLength = endPrev >= start ? endPrev - start + 1 : 0;
      const insertedText =
        endCurr >= start ? curr.slice(start, endCurr + 1) : '';

      const ops: RealtimeOperation[] = [];
      // Çdo op i ri bazohet në version-in e fundit të konfirmuar nga serveri.
      const baseVersion = serverVersionRef.current;
      const userId = ''; // Do të zëvendësohet me userId real nga auth në hapa të tjerë.

      if (removedLength > 0) {
        ops.push({
          id: generateOpId(),
          userId,
          baseVersion,
          type: 'delete',
          pos: start,
          length: removedLength,
        });
      }

      if (insertedText.length > 0) {
        ops.push({
          id: generateOpId(),
          userId,
          baseVersion,
          type: 'insert',
          pos: start,
          text: insertedText,
        });
      }

      return ops;
    },
    [document.id]
  );

  /**
   * Përditëson fullText nga pages dhe dërgon ops tek realtime serveri
   * nëse ka ndryshim real mes tekstit të vjetër dhe atij të ri.
   */
  const syncFullTextAndSendOps = useCallback(
    (previousPages: string[], nextPages: string[]) => {
      const previousText = serializePagesToText(previousPages);
      const nextText = serializePagesToText(nextPages);
      if (previousText === nextText) {
        setFullText(nextText);
        return;
      }

      const ops = buildOpsForTextChange(previousText, nextText);
      if (ops.length > 0) {
        pendingOpsRef.current = [...pendingOpsRef.current, ...ops];
        sendOps(ops);
      }

      setFullText(nextText);
    },
    [buildOpsForTextChange, sendOps]
  );

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
    const content = getDocumentContent(doc);
    const version = typeof doc.version === 'number' ? doc.version : 0;
    // Kur hapim një dokument nga REST API, konsiderojmë që serverText == fullText
    // dhe nuk ka pendingOps.
    setServerText(content);
    setServerVersion(version);
    setFullText(content);
    setFullTextVersion(version);
    serverTextRef.current = content;
    serverVersionRef.current = version;
    pendingOpsRef.current = [];
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

  const setContent = useCallback((value: string) => {
    setDocumentState((prev) => {
      const previousPages = prev.pages;
      const nextPages = [value];
      syncFullTextAndSendOps(previousPages, nextPages);
      return { ...prev, pages: nextPages };
    });
    setHasUnsavedChanges(true);
  }, [syncFullTextAndSendOps]);

  const setPages = useCallback((pages: string[]) => {
    setDocumentState((prev) => {
      const previousPages = prev.pages;
      const nextPages = pages;
      syncFullTextAndSendOps(previousPages, nextPages);
      return { ...prev, pages: nextPages };
    });
    setHasUnsavedChanges(true);
  }, [syncFullTextAndSendOps]);

  const setPageContent = useCallback((pageIndex: number, value: string) => {
    setDocumentState((prev) => {
      const previousPages = prev.pages;
      const nextPages = prev.pages.map((p, i) => (i === pageIndex ? value : p));
      syncFullTextAndSendOps(previousPages, nextPages);
      return {
        ...prev,
        pages: nextPages,
      };
    });
    setHasUnsavedChanges(true);
  }, [syncFullTextAndSendOps]);

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

  const clearLastAppliedOps = useCallback(() => {
    setLastAppliedOps(null);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(ZOOM_STORAGE_KEY, String(zoomLevel));
    } catch {
      /* ignore */
    }
  }, [zoomLevel]);

  // Kur merrim state fillestar nga realtime serveri, sinkronizojmë fullText + pages.
  useEffect(() => {
    if (!initialState) return;
    if (!document.id || initialState.documentId !== document.id) return;

    const pagesFromRealtime = splitTextToPages(initialState.text);
    setDocumentState((prev) => ({
      ...prev,
      id: initialState.documentId,
      title: prev.title || initialState.title || prev.title,
      pages: pagesFromRealtime,
      version: initialState.version,
    }));
    // Kur sinkronizohemi me state-in fillestar nga realtime serveri,
    // e konsiderojmë atë si burimin e vërtetë (serverText) dhe nuk
    // kemi ende pendingOps lokale.
    setServerText(initialState.text);
    setServerVersion(initialState.version);
    setFullText(initialState.text);
    setFullTextVersion(initialState.version);
    serverTextRef.current = initialState.text;
    serverVersionRef.current = initialState.version;
    pendingOpsRef.current = [];
    // Realtime state konsiderohet si "e ruajtur" – nuk ka ndryshime lokale ende.
    setHasUnsavedChanges(false);
  }, [document.id, initialState]);

  // Kur fullText ndryshon (p.sh. nga ops të reja të konfirmuara nga serveri),
  // sinkronizojmë pages në document state pa gjeneruar ops të rinj.
  useEffect(() => {
    if (!document.id) return;

    // Nëse kjo ndryshim i fullText vjen si rezultat i aplikimit të ops-ve remote,
    // e lëmë menaxhimin e faqeve tek logjika tjetër (p.sh. në EditorArea) për të
    // shmangur split-in e dyfishtë që mund të shkaktojë duplikime faqesh.
    if (isApplyingRemoteOpsRef.current) {
      isApplyingRemoteOpsRef.current = false;
      return;
    }

    const pagesFromFullText = splitTextToPages(fullText);

    setDocumentState((prev) => {
      // Sigurohemi që po përditësojmë dokumentin e duhur.
      if (prev.id !== document.id) return prev;
      if (arePageArraysEqual(prev.pages, pagesFromFullText)) return prev;

      return {
        ...prev,
        pages: pagesFromFullText,
      };
    });
  }, [document.id, fullText, fullTextVersion]);

  const value: DocumentEditorContextValue = {
    document,
    fullText,
    fullTextVersion,
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
    connectionStatus,
    activeUsers,
    lastAppliedOps,
    clearLastAppliedOps,
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
