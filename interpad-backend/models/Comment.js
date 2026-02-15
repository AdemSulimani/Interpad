const mongoose = require('mongoose');

/**
 * Anchor – lidhja e komentit me pjesën e tekstit në dokument.
 * pageIndex: faqja (0-based). startOffset / endOffset: karaktere në plain text të asaj faqeje.
 * selectedText: fragmenti i tekstit të selektuar (për shfaqje në sidebar).
 */
const anchorSchema = new mongoose.Schema(
  {
    pageIndex: { type: Number, default: 0 },
    startOffset: { type: Number, default: 0 },
    endOffset: { type: Number, default: 0 },
    selectedText: { type: String, default: '' },
  },
  { _id: false }
);

const commentSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: [true, 'Document is required'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
    },
    anchor: {
      type: anchorSchema,
      default: null,
    },
    resolved: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

commentSchema.index({ documentId: 1, createdAt: 1 });

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
