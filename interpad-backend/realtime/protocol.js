// Central definition of real-time collaboration protocol events and payload shapes.
// This keeps backend and frontend aligned on socket message names.
//
// Event names (Socket.io):
// - 'doc:join'            – Client → Server, request to join a document room
// - 'doc:initial-state'   – Server → Client, initial document state + metadata
// - 'doc:ops'             – Client → Server, list of optimistic edit operations
// - 'doc:ops-committed'   – Server → Room, operations that have been applied & versioned
// - 'presence:update'     – Server → Room, list of active collaborators for a document
// - 'doc:error'           – Server → Client, protocol- or access-level error for a document
//
// NOTE: Only 'doc:join', 'doc:initial-state', 'presence:update' dhe 'doc:error'
// janë të përdorura tani; 'doc:ops' dhe 'doc:ops-committed' do të implementohen
// në hapat e ardhshëm të planit.

const RealtimeEvents = Object.freeze({
  DOC_JOIN: 'doc:join',
  DOC_INITIAL_STATE: 'doc:initial-state',
  DOC_OPS: 'doc:ops',
  DOC_OPS_COMMITTED: 'doc:ops-committed',
  PRESENCE_UPDATE: 'presence:update',
  DOC_ERROR: 'doc:error',
});

/**
 * Logical identifier for a realtime client/session (e.g. socket or tab).
 * Kept separate from authenticated user id so that the same user can have
 * multiple active clients with independent pending operation queues.
 * @typedef {string} ClientId
 */

/**
 * Unique identifier for a single text operation.
 * @typedef {string} OperationId
 */

/**
 * Monotonic version number for a document's full text.
 * @typedef {number} DocumentVersion
 */

/**
 * @typedef {Object} RealtimeOperation
 * @property {OperationId} id       Unique operation id (e.g. UUID from client)
 * @property {string} userId        User who generated the op
 * @property {ClientId} [clientId]  Optional logical client/session identifier
 * @property {DocumentVersion} baseVersion Document version the client based this op on
 * @property {'insert'|'delete'} type
 * @property {number} pos           Absolute character position in full text
 * @property {string} [text]        Text to insert (for insert)
 * @property {number} [length]      Number of characters to delete (for delete)
 */

/**
 * @typedef {Object} DocumentState
 * @property {string} documentId
 * @property {string} text                Current full document text (HTML string)
 * @property {DocumentVersion} version    Monotonic version counter for `text`
 * @property {RealtimeOperation[]} opsLog Tail of recently applied operations
 * @property {Date} loadedAt              When this state was first loaded into memory
 * @property {Date} updatedAt             When this state was last modified
 */

module.exports = {
  RealtimeEvents,
};

