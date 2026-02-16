const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      default: 'Untitled Document',
    },
    content: {
      type: String,
      default: '<p>Start typing your document here...</p>',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Për listën "recent" – indeks për sortim nga updatedAt
documentSchema.index({ userId: 1, updatedAt: -1 });

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;
