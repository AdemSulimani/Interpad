const Comment = require('../models/Comment');
const Document = require('../models/Document');
const mongoose = require('mongoose');

/**
 * Kontrollon nëse dokumenti ekziston dhe i përket user-it; kthen dokumentin ose null.
 */
async function getDocumentForUser(documentId, userId) {
  if (!documentId || !mongoose.Types.ObjectId.isValid(documentId)) return null;
  return Document.findOne({ _id: documentId, userId });
}

/**
 * Kthen komentin në format për frontend (me autor name/email).
 */
function toCommentResponse(comment) {
  if (!comment) return null;
  const c = comment.toObject ? comment.toObject() : comment;
  const author = c.userId;
  return {
    id: c._id.toString(),
    documentId: c.documentId.toString(),
    author: author
      ? { id: author._id.toString(), name: author.name, email: author.email }
      : { id: '', name: '', email: '' },
    content: c.content,
    anchor: c.anchor || null,
    resolved: !!c.resolved,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

/**
 * POST /api/documents/:id/comments
 * Body: { content, anchor? }  anchor: { pageIndex?, startOffset?, endOffset?, selectedText? }
 * Autorizim: JWT; dokumenti duhet t'i takojë req.user.id
 */
async function create(req, res) {
  try {
    const documentId = req.params.id;
    const userId = req.user.id;
    const { content, anchor } = req.body || {};

    const doc = await getDocumentForUser(documentId, userId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Comment content is required' });
    }

    const comment = await Comment.create({
      documentId,
      userId,
      content: content.trim(),
      anchor: anchor && typeof anchor === 'object' ? anchor : null,
    });

    const populated = await Comment.findById(comment._id).populate('userId', 'name email');
    return res.status(201).json({
      success: true,
      comment: toCommentResponse(populated),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create comment',
    });
  }
}

/**
 * GET /api/documents/:id/comments
 * Lista e komenteve për dokumentin; të renditura nga createdAt (të rejat fundit ose fillimisht – do të renditim nga më të rejat fundit për sidebar).
 * Autorizim: JWT; dokumenti duhet t'i takojë req.user.id
 */
async function getByDocument(req, res) {
  try {
    const documentId = req.params.id;
    const userId = req.user.id;

    const doc = await getDocumentForUser(documentId, userId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const comments = await Comment.find({ documentId })
      .sort({ createdAt: 1 })
      .populate('userId', 'name email')
      .lean();

    const list = comments.map((c) => ({
      id: c._id.toString(),
      documentId: c.documentId.toString(),
      author: c.userId
        ? { id: c.userId._id.toString(), name: c.userId.name, email: c.userId.email }
        : { id: '', name: '', email: '' },
      content: c.content,
      anchor: c.anchor || null,
      resolved: !!c.resolved,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    return res.json({
      success: true,
      comments: list,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get comments',
    });
  }
}

/**
 * DELETE /api/documents/:id/comments/:commentId
 * Fshin një koment. Autorizim: dokumenti duhet t'i takojë req.user.id.
 */
async function deleteOne(req, res) {
  try {
    const documentId = req.params.id;
    const commentId = req.params.commentId;
    const userId = req.user.id;

    const doc = await getDocumentForUser(documentId, userId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ success: false, message: 'Invalid comment id' });
    }

    const result = await Comment.deleteOne({ _id: commentId, documentId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    return res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete comment',
    });
  }
}

/**
 * PATCH /api/documents/:id/comments/:commentId
 * Body: { resolved: boolean }
 * Përditëson resolved për komentin. Autorizim: dokumenti duhet t'i takojë req.user.id.
 */
async function resolveOne(req, res) {
  try {
    const documentId = req.params.id;
    const commentId = req.params.commentId;
    const userId = req.user.id;
    const resolved = req.body?.resolved === true;

    const doc = await getDocumentForUser(documentId, userId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ success: false, message: 'Invalid comment id' });
    }

    const comment = await Comment.findOneAndUpdate(
      { _id: commentId, documentId },
      { $set: { resolved } },
      { new: true }
    )
      .populate('userId', 'name email')
      .lean();

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const response = {
      id: comment._id.toString(),
      documentId: comment.documentId.toString(),
      author: comment.userId
        ? { id: comment.userId._id.toString(), name: comment.userId.name, email: comment.userId.email }
        : { id: '', name: '', email: '' },
      content: comment.content,
      anchor: comment.anchor || null,
      resolved: !!comment.resolved,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };

    return res.json({ success: true, comment: response });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update comment',
    });
  }
}

module.exports = {
  create,
  getByDocument,
  deleteOne,
  resolveOne,
};
