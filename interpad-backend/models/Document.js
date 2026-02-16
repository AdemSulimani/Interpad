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
    // Optional version counter për layer-in e realtime/OT.
    // Kjo lejon që pas një restart-i të serverit të rifillojmë
    // nga një version monotonik i ruajtur në Mongo.
    realtimeVersion: {
      type: Number,
      default: 0,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
    // Lista e përdoruesve që kanë akses të ndarë në dokument (përveç pronarit).
    sharedWith: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Token-a për share link (p.sh. invite link). Mund të kenë role dhe skadencë.
    shareTokens: [
      {
        token: {
          type: String,
          required: true,
        },
        role: {
          type: String,
          enum: ['viewer', 'editor'],
          default: 'editor',
        },
        expiresAt: {
          type: Date,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Për listën "recent" – indeks për sortim nga updatedAt
documentSchema.index({ userId: 1, updatedAt: -1 });
// Indeks ndihmës për kërkim sipas sharedWith (për dokumentet e ndara me user-in)
documentSchema.index({ sharedWith: 1, updatedAt: -1 });
// Indeks ndihmës për token-at e share link (shpesh kërkohet sipas token)
documentSchema.index({ 'shareTokens.token': 1 });

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;
