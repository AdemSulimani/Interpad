// Shared real-time protocol definitions for the frontend.
// These names MUST stay in sync with the backend `interpad-backend/realtime/protocol.js`.

export const RealtimeEvents = Object.freeze({
  DOC_JOIN: 'doc:join',
  DOC_INITIAL_STATE: 'doc:initial-state',
  DOC_OPS: 'doc:ops',
  DOC_OPS_COMMITTED: 'doc:ops-committed',
  PRESENCE_UPDATE: 'presence:update',
  DOC_ERROR: 'doc:error',
} as const);

export type RealtimeEventKey = keyof typeof RealtimeEvents;

// ----- Shared text & identity model ----------------------------------------------------------

/** Full document text (all pages joined with the page delimiter). */
export type FullText = string;

/** Monotonic version number for a document's full text. */
export type DocumentVersion = number;

/** Logical identifier for a realtime client/session (e.g. socket or tab). */
export type ClientId = string;

/** Unique identifier for a single text operation. */
export type OperationId = string;

// ----- Presence -------------------------------------------------------------------------------

export interface RealtimePresenceUser {
  userId: string;
  name?: string;
  joinedAt?: string;
}

// ----- Operations & document state ------------------------------------------------------------

export interface RealtimeOperation {
  /** Unique operation id – corresponds to `OperationId` in the shared model. */
  id: OperationId;
  /** Authenticated application user who generated this operation. */
  userId: string;
  /**
   * Optional logical client/session identifier (socket/tab).
   * This is kept separate from userId so that the same user can have
   * multiple active clients with independent pending operation queues.
   */
  clientId?: ClientId;
  /** Document version that this operation was based on. */
  baseVersion: DocumentVersion;
  type: 'insert' | 'delete';
  /** Absolute character position in the fullText string. */
  pos: number;
  /** Text to insert (for insert operations). */
  text?: string;
  /** Number of characters to delete (for delete operations). */
  length?: number;
}

export interface DocumentInitialStatePayload {
  documentId: string;
  title: string;
  /** Current full document text (HTML string, all pages joined). */
  text: FullText;
  /** Monotonic document version for `text`. */
  version: DocumentVersion;
  /** Tail of recently applied operations so clients can catch up. */
  opsLogTail: RealtimeOperation[];
  activeUsers: RealtimePresenceUser[];
}

export interface DocOpsCommittedPayload {
  documentId: string;
  opsApplied: RealtimeOperation[];
  /** Version of the document after applying `opsApplied`. */
  newVersion: DocumentVersion;
  fromUserId: string;
}

export interface PresenceUpdatePayload {
  documentId: string;
  activeUsers: RealtimePresenceUser[];
}

export interface DocErrorPayload {
  message: string;
}

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

