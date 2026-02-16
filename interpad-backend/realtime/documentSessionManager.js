const Document = require('../models/Document');

// In-memory store: documentId -> DocumentState (+ autosave metadata)
const documentSessions = new Map();

// How many recent operations to keep per document in memory.
const MAX_OPS_LOG_LENGTH = 500;

// Autosave configuration
const AUTOSAVE_INTERVAL_MS = 15_000; // how often to scan sessions
const MIN_DIRTY_AGE_MS = 3_000; // minimum time since last update before saving

// Per-document guard to avoid concurrent saves for the same document
const autosaveInProgress = new Set();

/**
 * Get existing DocumentState or create a new one from initial text.
 *
 * @param {string} documentId
 * @param {string} initialText
 * @returns {import('./protocol').DocumentState & { lastSavedAt?: Date }}
 */
function getOrCreateDocumentState(documentId, initialText = '') {
  if (documentSessions.has(documentId)) {
    return documentSessions.get(documentId);
  }

  const now = new Date();
  const state = {
    documentId,
    text: initialText || '',
    version: 0,
    opsLog: [],
    loadedAt: now,
    updatedAt: now,
    // Additional, non-protocol metadata (not sent to clients):
    lastSavedAt: null,
  };

  documentSessions.set(documentId, state);
  return state;
}

/**
 * Ensure a DocumentState exists for the given document by loading it from Mongo
 * if necessary. This should be called when the first user joins a document.
 *
 * @param {string} documentId
 * @returns {Promise<import('./protocol').DocumentState & { lastSavedAt?: Date }>}
 */
async function loadDocumentState(documentId) {
  if (documentSessions.has(documentId)) {
    return documentSessions.get(documentId);
  }

  const doc = await Document.findById(documentId).select(
    'content realtimeVersion updatedAt'
  );
  const existingContent = doc ? doc.content || '' : '';

  const state = getOrCreateDocumentState(documentId, existingContent);

  if (doc) {
    if (typeof doc.realtimeVersion === 'number') {
      state.version = doc.realtimeVersion;
    }
    if (doc.updatedAt instanceof Date) {
      state.lastSavedAt = doc.updatedAt;
    }
  }

  return state;
}

/**
 * Get current in-memory state (if any) for a document.
 *
 * @param {string} documentId
 * @returns {(import('./protocol').DocumentState & { lastSavedAt?: Date }) | undefined}
 */
function getDocumentState(documentId) {
  return documentSessions.get(documentId);
}

/**
 * Append committed operations to the state log and update metadata.
 *
 * Ky funksion nuk aplikon vetë OT/CRDT mbi `state.text` – kjo bëhet nga
 * layer-i i transformimit (p.sh. `transformOps`) përpara se të thirret
 * kjo metodë. Këtu thjesht:
 *  - përditësojmë versionin e dokumentit
 *  - ruajmë një "ops log" të shkurtër në memory për transformime të ardhshme
 *
 * Çdo op në opsLog mban edhe një fushë `appliedVersion` që tregon në cilin
 * version të dokumentit është aplikuar ai op. Kjo na lejon të marrim
 * vetëm ops‑et relevante për një klient që është prapa me disa versione
 * (p.sh. `baseVersion+1 .. currentVersion`).
 *
 * @param {string} documentId
 * @param {import('./protocol').RealtimeOperation[]} committedOps
 * @param {number} newVersion
 */
function appendCommittedOperations(documentId, committedOps, newVersion) {
  const state = getOrCreateDocumentState(documentId);
  state.version = newVersion;

  if (committedOps && committedOps.length > 0) {
    // Shtojmë një fushë ndihmëse `appliedVersion` për çdo op, pa prekur
    // formën bazike të RealtimeOperation që klientët presin.
    const decoratedOps = committedOps.map((op) => ({
      ...op,
      appliedVersion: newVersion,
    }));

    state.opsLog.push(...decoratedOps);
    if (state.opsLog.length > MAX_OPS_LOG_LENGTH) {
      state.opsLog.splice(0, state.opsLog.length - MAX_OPS_LOG_LENGTH);
    }
  }

  state.updatedAt = new Date();
}

/**
 * Explicit helper për të përditësuar tekstin e dokumentit në memory.
 * Kjo do të thirret nga OT/transformOps layer kur aplikohen ops‑et.
 *
 * @param {string} documentId
 * @param {string} newText
 * @param {number} [newVersion]
 */
function updateDocumentText(documentId, newText, newVersion) {
  const state = getOrCreateDocumentState(documentId);
  state.text = typeof newText === 'string' ? newText : '';
  if (typeof newVersion === 'number') {
    state.version = newVersion;
  }
  state.updatedAt = new Date();
}

/**
 * Internal: persist një dokument aktiv në Mongo nëse ka ndryshime
 * që nga autosave-i i fundit.
 *
 * @param {string} documentId
 * @param {ReturnType<typeof getDocumentState>} state
 */
async function autosaveDocument(documentId, state) {
  if (!state) return;
  if (autosaveInProgress.has(documentId)) return;

  const now = Date.now();
  const lastUpdated = state.updatedAt ? state.updatedAt.getTime() : 0;
  const lastSaved = state.lastSavedAt ? state.lastSavedAt.getTime() : 0;

  // S’ka ndryshime të reja që nga autosave i fundit
  if (!lastUpdated || lastUpdated <= lastSaved) {
    return;
  }

  // Opsionale: mos e ruaj menjëherë sapo dikush shkruan; prit pak
  if (now - lastUpdated < MIN_DIRTY_AGE_MS) {
    return;
  }

  autosaveInProgress.add(documentId);

  try {
    await Document.findByIdAndUpdate(
      documentId,
      {
        content: state.text || '',
        realtimeVersion: typeof state.version === 'number' ? state.version : 0,
      },
      { new: false }
    );

    state.lastSavedAt = new Date();
  } catch (err) {
    // Logojmë gabimin, por nuk i ndërpresim sesionet në memory.
    // Në rast dështimi, tentativa tjetër e autosave do të provojë sërish.
    // eslint-disable-next-line no-console
    console.error('Autosave failed for document', documentId, err);
  } finally {
    autosaveInProgress.delete(documentId);
  }
}

// Start a single autosave loop për krejt dokumentet aktive në memory.
setInterval(() => {
  documentSessions.forEach((state, documentId) => {
    autosaveDocument(documentId, state);
  });
}, AUTOSAVE_INTERVAL_MS).unref?.();

module.exports = {
  loadDocumentState,
  getDocumentState,
  appendCommittedOperations,
  updateDocumentText,
  MAX_OPS_LOG_LENGTH,
};

