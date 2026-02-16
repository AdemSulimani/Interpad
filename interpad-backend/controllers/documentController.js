const crypto = require('crypto');
const mongoose = require('mongoose');
const Document = require('../models/Document');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

function userHasBasicAccess(doc, userId) {
  if (!doc || !userId) return false;
  if (doc.userId && doc.userId.toString() === userId) return true;
  if (Array.isArray(doc.sharedWith)) {
    return doc.sharedWith.some((id) => id && id.toString() === userId);
  }
  return false;
}

function findActiveShareToken(doc, token) {
  if (!doc || !token || !Array.isArray(doc.shareTokens)) return null;
  const now = new Date();
  return doc.shareTokens.find(
    (t) =>
      t &&
      t.token === token &&
      (!t.expiresAt || new Date(t.expiresAt).getTime() > now.getTime())
  );
}

/**
 * Kthen dokumentin në format për frontend (id si string, createdAt/updatedAt të formatuara).
 */
function toDocResponse(doc) {
  if (!doc) return null;
  const d = doc.toObject ? doc.toObject() : doc;
  return {
    id: d._id.toString(),
    title: d.title,
    content: d.content,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    version: d.__v,
  };
}

/**
 * POST /api/documents
 * Krijon dokument të ri. Body: { title?, content? }
 * Autorizim: JWT i detyrueshëm; userId = req.user.id
 */
async function create(req, res) {
  try {
    const userId = req.user.id;
    const { title, content } = req.body || {};

    const doc = await Document.create({
      title: title != null && title !== '' ? title : 'Untitled Document',
      content: content != null ? content : '<p>Start typing your document here...</p>',
      userId,
    });

    return res.status(201).json({
      success: true,
      document: toDocResponse(doc),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create document',
    });
  }
}

/**
 * PUT /api/documents/:id
 * Përditëson dokument ekzistues. Body: { title?, content? }
 * Autorizim: JWT; dokumenti duhet t'i takojë req.user.id
 */
async function update(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const token = typeof req.query.token === 'string' ? req.query.token : undefined;
    const { title, content } = req.body || {};

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid document id' });
    }

    const doc = await Document.findById(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const hasAccess = userHasBasicAccess(doc, userId);
    const shareToken = findActiveShareToken(doc, token);
    if (!hasAccess && !shareToken) {
      return res.status(403).json({ success: false, message: 'You do not have access to this document' });
    }

    if (title !== undefined) doc.title = title;
    if (content !== undefined) doc.content = content;
    await doc.save();

    return res.json({
      success: true,
      document: toDocResponse(doc),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update document',
    });
  }
}

/**
 * GET /api/documents/:id
 * Merr një dokument për ta hapur në editor.
 * Autorizim: JWT; dokumenti duhet t'i takojë req.user.id
 */
async function getOne(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const token = typeof req.query.token === 'string' ? req.query.token : undefined;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid document id' });
    }

    const doc = await Document.findById(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    let hasAccess = userHasBasicAccess(doc, userId);
    const shareToken = findActiveShareToken(doc, token);

    if (!hasAccess && !shareToken) {
      return res.status(403).json({ success: false, message: 'You do not have access to this document' });
    }

    // Nëse user-i s'ka qenë më parë në sharedWith por po hyn me token valid, shtoje në sharedWith
    if (!hasAccess && shareToken) {
      if (!Array.isArray(doc.sharedWith)) {
        doc.sharedWith = [];
      }
      if (!doc.sharedWith.some((id) => id && id.toString() === userId)) {
        doc.sharedWith.push(userId);
        await doc.save();
      }
      hasAccess = true;
    }

    return res.json({
      success: true,
      document: toDocResponse(doc),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get document',
    });
  }
}

/**
 * GET /api/documents
 * Lista "recent documents" për user-in e loguar.
 * Kthen: id, title, updatedAt, createdAt (të fundit të përditësuarat fillimisht).
 */
async function getRecent(req, res) {
  try {
    const userId = req.user.id;

    // Kthe si "recent" edhe dokumentet ku user-i është në sharedWith
    const docs = await Document.find({
      $or: [{ userId }, { sharedWith: userId }],
    })
      .sort({ updatedAt: -1 })
      .select('_id title createdAt updatedAt')
      .lean();

    const list = docs.map((d) => ({
      id: d._id.toString(),
      title: d.title,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));

    return res.json({
      success: true,
      documents: list,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get recent documents',
    });
  }
}

/**
 * POST /api/documents/:id/share
 * Krijon ose kthen një share link për dokumentin.
 * Vetëm pronari i dokumentit mund të krijojë share link.
 */
async function createShareLink(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid document id' });
    }

    const doc = await Document.findOne({ _id: id, userId });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const now = new Date();
    const DEFAULT_EXPIRY_DAYS = 30;
    const existing = Array.isArray(doc.shareTokens)
      ? doc.shareTokens.find(
          (t) =>
            t &&
            (!t.expiresAt || new Date(t.expiresAt).getTime() > now.getTime())
        )
      : null;

    let activeToken = existing;
    if (!activeToken) {
      const token = crypto.randomBytes(24).toString('hex');
      const expiresAt = new Date(now.getTime() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

      if (!Array.isArray(doc.shareTokens)) {
        doc.shareTokens = [];
      }

      doc.shareTokens.push({
        token,
        role: 'editor',
        expiresAt,
      });
      await doc.save();

      activeToken = doc.shareTokens[doc.shareTokens.length - 1];
    }

    const shareUrl = `${FRONTEND_URL.replace(/\/$/, '')}/editor/${doc._id.toString()}?token=${activeToken.token}`;

    return res.status(201).json({
      success: true,
      share: {
        documentId: doc._id.toString(),
        token: activeToken.token,
        role: activeToken.role || 'editor',
        expiresAt: activeToken.expiresAt || null,
        url: shareUrl,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create share link',
    });
  }
}

/**
 * GET /api/documents/:id/access
 * Kthen informacion rreth aksesit në dokument (owner, sharedWith, shareTokens).
 * Vetëm pronari i dokumentit mund ta shohë këtë informacion.
 */
async function getAccessInfo(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid document id' });
    }

    const doc = await Document.findOne({ _id: id, userId })
      .populate('userId', 'name email')
      .populate('sharedWith', 'name email');

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const owner = doc.userId
      ? {
          id: doc.userId._id.toString(),
          name: doc.userId.name,
          email: doc.userId.email,
        }
      : null;

    const sharedWith =
      Array.isArray(doc.sharedWith) && doc.sharedWith.length
        ? doc.sharedWith.map((u) => ({
            id: u._id.toString(),
            name: u.name,
            email: u.email,
          }))
        : [];

    const now = new Date();
    const activeShareTokens = Array.isArray(doc.shareTokens)
      ? doc.shareTokens
          .filter(
            (t) =>
              t &&
              t.token &&
              (!t.expiresAt || new Date(t.expiresAt).getTime() > now.getTime())
          )
          .map((t) => ({
            token: t.token,
            role: t.role || 'editor',
            expiresAt: t.expiresAt || null,
          }))
      : [];

    return res.json({
      success: true,
      access: {
        owner,
        sharedWith,
        shareTokens: activeShareTokens,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get document access info',
    });
  }
}

module.exports = {
  create,
  update,
  getOne,
  getRecent,
  createShareLink,
  getAccessInfo,
};
