const Document = require('../models/Document');
const mongoose = require('mongoose');

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
    const { title, content } = req.body || {};

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid document id' });
    }

    const doc = await Document.findOne({ _id: id, userId });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
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

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid document id' });
    }

    const doc = await Document.findOne({ _id: id, userId });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
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

    const docs = await Document.find({ userId })
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

module.exports = {
  create,
  update,
  getOne,
  getRecent,
};
