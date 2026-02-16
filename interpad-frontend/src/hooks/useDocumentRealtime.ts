import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import {
  RealtimeEvents,
  type ConnectionStatus,
  type DocumentInitialStatePayload,
  type DocErrorPayload,
  type DocOpsCommittedPayload,
  type PresenceUpdatePayload,
  type RealtimeOperation,
  type RealtimePresenceUser,
} from '../realtime/protocol';

// Duhet të jetë i njëjtë me API_BASE_URL në `services/index.ts`
const REALTIME_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface UseDocumentRealtimeOptions {
  /** Document id për të cilin duam realtime. Nëse është null, nuk lidhemi. */
  documentId: string | null;
  /** A është e aktivizuar realtime për këtë faqe (p.sh. user është i loguar, dokument i vlefshëm). */
  enabled?: boolean;
  /**
   * Opsionale: thirret sa herë që serveri dërgon një batch të ri operations
   * të konfirmuara për këtë dokument (`doc:ops-committed`).
   */
  onOpsCommitted?: (payload: DocOpsCommittedPayload) => void;
}

export interface UseDocumentRealtimeResult {
  /** Gjendja e lidhjes me WebSocket layer. */
  connectionStatus: ConnectionStatus;
  /** Gabimi i fundit nga protokolli realtime (p.sh. mungesë akses-i). */
  lastError: string | null;
  /** State fillestar i dokumentit pasi serveri kthen `doc:initial-state`. */
  initialState: DocumentInitialStatePayload | null;
  /** Lista e bashkëpunëtorëve aktivë në këtë dokument. */
  activeUsers: RealtimePresenceUser[];
  /** Emiton një listë operations te serveri (`doc:ops`). */
  sendOps: (ops: RealtimeOperation[]) => void;
}

type ClientSocket = Socket | null;

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    window.localStorage.getItem('token') ||
    window.sessionStorage.getItem('token')
  );
}

/** Hook bazik për lidhje realtime me dokumentin (ops + presence). */
export function useDocumentRealtime(
  options: UseDocumentRealtimeOptions
): UseDocumentRealtimeResult {
  const { documentId, enabled = true, onOpsCommitted } = options;

  const socketRef = useRef<ClientSocket>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('idle');
  const [lastError, setLastError] = useState<string | null>(null);
  const [initialState, setInitialState] =
    useState<DocumentInitialStatePayload | null>(null);
  const [activeUsers, setActiveUsers] = useState<RealtimePresenceUser[]>([]);

  // Krijo ose merr një socket të ri për këtë hook.
  const getOrCreateSocket = useCallback((): ClientSocket => {
    if (socketRef.current) return socketRef.current;

    const token = getAuthToken();
    if (!token) {
      setLastError('Missing auth token for realtime connection');
      return null;
    }

    const socket = io(REALTIME_BASE_URL, {
      transports: ['websocket'],
      withCredentials: true,
      autoConnect: false,
      auth: {
        token,
      },
      extraHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    socketRef.current = socket;
    return socket;
  }, []);

  // Menaxhimi i lifecycle të socket-it dhe join në dokument.
  useEffect(() => {
    if (!enabled || !documentId) {
      return;
    }

    const socket = getOrCreateSocket();
    if (!socket) return;

    setConnectionStatus('connecting');
    setLastError(null);

    const handleConnect = () => {
      setConnectionStatus('connected');
      // Pasi lidhemi, kërkojmë join për dokumentin aktual.
      socket.emit(RealtimeEvents.DOC_JOIN, { documentId });
    };

    const handleDisconnect = () => {
      setConnectionStatus('disconnected');
    };

    const handleConnectError = (err: Error) => {
      setConnectionStatus('error');
      setLastError(err.message || 'Failed to connect to realtime server');
    };

    const handleReconnectAttempt = () => {
      setConnectionStatus('reconnecting');
    };

    const handleInitialState = (payload: DocumentInitialStatePayload) => {
      setInitialState(payload);
      setActiveUsers(payload.activeUsers || []);
      setLastError(null);
    };

    const handlePresenceUpdate = (payload: PresenceUpdatePayload) => {
      if (!payload || payload.documentId !== documentId) return;
      setActiveUsers(payload.activeUsers || []);
    };

    const handleDocError = (payload: DocErrorPayload) => {
      setLastError(payload?.message || 'Unknown realtime error');
      setConnectionStatus('error');
    };

    const handleOpsCommitted = (payload: DocOpsCommittedPayload) => {
      if (!payload || payload.documentId !== documentId) return;
      // I kemi kaluar ops‑et tek konsumatori (p.sh. DocumentEditorContext)
      // për t'i aplikuar mbi fullText + pendingOps. Këtu vetëm delegojmë.
      if (typeof onOpsCommitted === 'function') {
        onOpsCommitted(payload);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.io.on('reconnect_attempt', handleReconnectAttempt);

    socket.on(RealtimeEvents.DOC_INITIAL_STATE, handleInitialState);
    socket.on(RealtimeEvents.PRESENCE_UPDATE, handlePresenceUpdate);
    socket.on(RealtimeEvents.DOC_ERROR, handleDocError);
    socket.on(RealtimeEvents.DOC_OPS_COMMITTED, handleOpsCommitted);

    if (!socket.connected) {
      socket.connect();
    } else {
      // Nëse është tashmë i lidhur (p.sh. reuse), thjesht kërko join.
      socket.emit(RealtimeEvents.DOC_JOIN, { documentId });
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.io.off('reconnect_attempt', handleReconnectAttempt);

      socket.off(RealtimeEvents.DOC_INITIAL_STATE, handleInitialState);
      socket.off(RealtimeEvents.PRESENCE_UPDATE, handlePresenceUpdate);
      socket.off(RealtimeEvents.DOC_ERROR, handleDocError);
      socket.off(RealtimeEvents.DOC_OPS_COMMITTED, handleOpsCommitted);
    };
  }, [documentId, enabled, getOrCreateSocket]);

  // Cleanup total kur komponenti që e përdor hook-un unmount-het.
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const sendOps = useCallback((ops: RealtimeOperation[]) => {
    if (!ops || ops.length === 0) return;
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;
    socket.emit(RealtimeEvents.DOC_OPS, { ops });
  }, []);

  return useMemo(
    () => ({
      connectionStatus,
      lastError,
      initialState,
      activeUsers,
      sendOps,
    }),
    [activeUsers, connectionStatus, initialState, lastError, sendOps]
  );
}

