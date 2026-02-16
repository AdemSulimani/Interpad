/**
 * OT‑like transform & apply functions for real‑time text collaboration.
 *
 * This module is intentionally stateless and pure – it only works with
 * primitive values (strings + plain operation objects) so it can be reused
 * on both backend and frontend if needed.
 *
 * Operation shape follows `RealtimeOperation` from `./protocol`:
 *
 * {
 *   id: string,
 *   userId: string,
 *   baseVersion: number,
 *   type: 'insert' | 'delete',
 *   pos: number,
 *   text?: string,   // for insert
 *   length?: number, // for delete
 * }
 */

/**
 * Clamp a number between min and max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Insert helper: apply a simple "insert text at position" operation
 * over a plain string. This is the primitive building block used by
 * the higher‑level OT functions and mirrors the plan's `applyInsert`
 * signature: (text, pos, insertText) → newText.
 *
 * The function is deliberately defensive:
 * - `text` is normalised to a string
 * - `pos` is clamped to [0, text.length]
 * - falsy / non‑string `insertText` results in a no‑op
 *
 * @param {string} text
 * @param {number} pos
 * @param {string} insertText
 * @returns {string}
 */
function applyInsert(text, pos, insertText) {
  const safeText = typeof text === 'string' ? text : '';
  const len = safeText.length;
  const clampedPos = clamp(typeof pos === 'number' ? pos : 0, 0, len);
  const insert =
    typeof insertText === 'string' && insertText.length > 0 ? insertText : '';

  if (!insert) return safeText;

  return safeText.slice(0, clampedPos) + insert + safeText.slice(clampedPos);
}

/**
 * Delete helper: apply a simple "delete N characters starting at pos"
 * operation over a plain string. Mirrors the plan's `applyDelete`
 * signature: (text, pos, length) → newText.
 *
 * The function is defensive:
 * - `text` is normalised to a string
 * - `pos` is clamped to [0, text.length]
 * - non‑positive or invalid `length` produces a no‑op
 *
 * @param {string} text
 * @param {number} pos
 * @param {number} length
 * @returns {string}
 */
function applyDelete(text, pos, length) {
  const safeText = typeof text === 'string' ? text : '';
  const len = safeText.length;
  const clampedPos = clamp(typeof pos === 'number' ? pos : 0, 0, len);
  const rawLength = typeof length === 'number' ? length : 0;
  const safeLength = rawLength > 0 ? rawLength : 0;

  if (safeLength === 0) return safeText;

  const end = clamp(clampedPos + safeLength, 0, len);
  if (end <= clampedPos) return safeText;

  return safeText.slice(0, clampedPos) + safeText.slice(end);
}

/**
 * Deterministic tie‑breaker for operations that touch the same position.
 * We want a stable ordering across clients, so we compare by userId and id.
 *
 * @param {import('./protocol').RealtimeOperation} a
 * @param {import('./protocol').RealtimeOperation} b
 * @returns {number} negative if a<b, positive if a>b, 0 if equal
 */
function compareOpsIdentity(a, b) {
  const ua = (a.userId || '').toString();
  const ub = (b.userId || '').toString();
  if (ua < ub) return -1;
  if (ua > ub) return 1;

  const ia = (a.id || '').toString();
  const ib = (b.id || '').toString();
  if (ia < ib) return -1;
  if (ia > ib) return 1;
  return 0;
}

/**
 * Apply a single operation to a text string.
 *
 * @param {string} text
 * @param {import('./protocol').RealtimeOperation} op
 * @returns {string}
 */
function applyOperationToText(text, op) {
  if (!op || typeof op.pos !== 'number') return text;

  if (op.type === 'insert') {
    return applyInsert(text, op.pos, op.text);
  }

  if (op.type === 'delete') {
    return applyDelete(text, op.pos, op.length);
  }

  // Unknown op type – no‑op for safety.
  return typeof text === 'string' ? text : '';
}

/**
 * Apply a list of operations sequentially to text.
 *
 * @param {string} text
 * @param {import('./protocol').RealtimeOperation[]} ops
 * @returns {string}
 */
function applyOperationsToText(text, ops) {
  if (!Array.isArray(ops) || ops.length === 0) return typeof text === 'string' ? text : '';

  let current = typeof text === 'string' ? text : '';
  for (const op of ops) {
    current = applyOperationToText(current, op);
  }
  return current;
}

/**
 * Transform an insert operation against another already‑applied insert.
 *
 * @param {import('./protocol').RealtimeOperation} op    incoming insert
 * @param {import('./protocol').RealtimeOperation} other already‑applied insert
 * @returns {import('./protocol').RealtimeOperation}
 */
function transformInsertAgainstInsert(op, other) {
  const result = { ...op };
  const otherText = typeof other.text === 'string' ? other.text : '';
  const otherLen = otherText.length;
  if (otherLen === 0) return result;

  if (other.pos < result.pos) {
    result.pos += otherLen;
  } else if (other.pos === result.pos) {
    // Deterministic tiebreak: later op shifts right.
    if (compareOpsIdentity(result, other) > 0) {
      result.pos += otherLen;
    }
  }

  return result;
}

/**
 * Transform an insert against an already‑applied delete.
 *
 * @param {import('./protocol').RealtimeOperation} op    incoming insert
 * @param {import('./protocol').RealtimeOperation} other already‑applied delete
 * @returns {import('./protocol').RealtimeOperation}
 */
function transformInsertAgainstDelete(op, other) {
  const result = { ...op };
  const delLen = typeof other.length === 'number' ? other.length : 0;
  if (delLen <= 0) return result;

  const delStart = other.pos;
  const delEnd = delStart + delLen;

  if (result.pos <= delStart) {
    // Insert happens before the deleted block – no shift.
    return result;
  }

  if (result.pos >= delEnd) {
    // Entire deletion was before the insert – shift left.
    result.pos -= delLen;
    return result;
  }

  // Insert inside the deleted range – move it to the start of the range.
  result.pos = delStart;
  return result;
}

/**
 * Transform a delete operation against an already‑applied insert.
 *
 * @param {import('./protocol').RealtimeOperation} op    incoming delete
 * @param {import('./protocol').RealtimeOperation} other already‑applied insert
 * @returns {import('./protocol').RealtimeOperation}
 */
function transformDeleteAgainstInsert(op, other) {
  const result = { ...op };
  let length = typeof result.length === 'number' ? result.length : 0;
  if (length <= 0) return result;

  const insText = typeof other.text === 'string' ? other.text : '';
  const insLen = insText.length;
  if (insLen === 0) return result;

  const delStart = result.pos;
  const delEnd = delStart + length;
  const insPos = other.pos;

  if (insPos <= delStart) {
    // Insert before delete range – whole delete shifts right.
    result.pos += insLen;
    return result;
  }

  if (insPos >= delEnd) {
    // Insert after delete range – no effect.
    return result;
  }

  // Insert inside delete range – delete should also remove inserted text.
  length += insLen;
  result.length = length;
  return result;
}

/**
 * Transform a delete operation against an already‑applied delete.
 *
 * @param {import('./protocol').RealtimeOperation} op    incoming delete
 * @param {import('./protocol').RealtimeOperation} other already‑applied delete
 * @returns {import('./protocol').RealtimeOperation}
 */
function transformDeleteAgainstDelete(op, other) {
  let result = { ...op };
  let length = typeof result.length === 'number' ? result.length : 0;
  if (length <= 0) return result;

  const aStart = result.pos;
  const aEnd = aStart + length;

  const bStart = other.pos;
  const bLen = typeof other.length === 'number' ? other.length : 0;
  if (bLen <= 0) return result;
  const bEnd = bStart + bLen;

  // No overlap, and A is entirely before B.
  if (aEnd <= bStart) {
    return result;
  }

  // No overlap, and A is entirely after B – shift left by deleted length.
  if (aStart >= bEnd) {
    result.pos -= bLen;
    return result;
  }

  // There is some overlap between [aStart, aEnd) and [bStart, bEnd).
  const overlapStart = Math.max(aStart, bStart);
  const overlapEnd = Math.min(aEnd, bEnd);
  const overlap = Math.max(0, overlapEnd - overlapStart);

  const aLen = length;
  const newLen = Math.max(0, aLen - overlap);

  // Characters from A that are strictly before B's start stay at the same pos.
  // Characters from A that are after B's end get shifted left by bLen.
  if (aStart < bStart) {
    // A starts before B.
    result.pos = aStart;
  } else {
    // A starts inside B or after B – the surviving part (if any) starts at bStart.
    result.pos = bStart;
  }

  result.length = newLen;
  return result;
}

/**
 * Transform a single operation against another operation that is already
 * applied in the document history.
 *
 * @param {import('./protocol').RealtimeOperation} op
 * @param {import('./protocol').RealtimeOperation} other
 * @returns {import('./protocol').RealtimeOperation}
 */
function transformOperationAgainstOperation(op, other) {
  if (!op || !other) return op;

  // If both ops are effectively the same (same id), we keep `op` as‑is.
  if (op.id && other.id && op.id === other.id) {
    return op;
  }

  if (op.type === 'insert' && other.type === 'insert') {
    return transformInsertAgainstInsert(op, other);
  }

  if (op.type === 'insert' && other.type === 'delete') {
    return transformInsertAgainstDelete(op, other);
  }

  if (op.type === 'delete' && other.type === 'insert') {
    return transformDeleteAgainstInsert(op, other);
  }

  if (op.type === 'delete' && other.type === 'delete') {
    return transformDeleteAgainstDelete(op, other);
  }

  return op;
}

/**
 * Transform a list of incoming operations against a list of already‑applied
 * operations (typically the suffix of opsLog from baseVersion+1..currentVersion).
 *
 * This does *not* mutate its inputs; it returns a fresh array.
 *
 * @param {import('./protocol').RealtimeOperation[]} incomingOps
 * @param {import('./protocol').RealtimeOperation[]} appliedOps
 * @returns {import('./protocol').RealtimeOperation[]}
 */
function transformOpsAgainstLog(incomingOps, appliedOps) {
  if (!Array.isArray(incomingOps) || incomingOps.length === 0) return [];
  if (!Array.isArray(appliedOps) || appliedOps.length === 0) {
    // Return shallow copies to avoid accidental external mutation.
    return incomingOps.map((op) => ({ ...op }));
  }

  const transformed = incomingOps.map((op) => ({ ...op }));

  for (let i = 0; i < transformed.length; i++) {
    let current = transformed[i];
    for (const applied of appliedOps) {
      current = transformOperationAgainstOperation(current, applied);
    }
    transformed[i] = current;
  }

  return transformed;
}

module.exports = {
  applyInsert,
  applyDelete,
  applyOperationToText,
  applyOperationsToText,
  transformOperationAgainstOperation,
  transformOpsAgainstLog,
};

