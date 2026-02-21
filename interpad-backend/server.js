require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const { WebSocketServer } = require('ws');
const {
  setupWSConnection,
  setPersistence,
} = require('y-websocket/bin/utils');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const passport = require('./config/passport');

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const Document = require('./models/Document');
const {
  userHasBasicAccess,
  findActiveShareToken,
} = require('./controllers/documentController');

// --- Yjs <-> MongoDB snapshot persistence (debounced) ---
const SNAPSHOT_DEBOUNCE_MS =
  Number(process.env.YJS_SNAPSHOT_DEBOUNCE_MS) || 2000;
const SNAPSHOT_MAX_DEBOUNCE_MS =
  Number(process.env.YJS_SNAPSHOT_MAX_DEBOUNCE_MS) || 10000;

// Track per-document debounce timers and first-change timestamps
const snapshotTimers = new Map();
const snapshotFirstChangeAt = new Map();

/**
 * Persist current Yjs document state to MongoDB `Document` model.
 *
 * @param {string} docName
 * @param {import('yjs').Doc} ydoc
 */
async function persistYDocSnapshot(docName, ydoc) {
  if (!mongoose.Types.ObjectId.isValid(docName)) {
    return;
  }

  const mongoDoc = await Document.findById(docName);
  if (!mongoDoc) {
    return;
  }

  const yText = ydoc.getText('content');
  const nextContent = yText.toString();

  if (typeof nextContent !== 'string') {
    return;
  }

  // Small optimization: skip write if nothing changed
  if (mongoDoc.content === nextContent) {
    return;
  }

  mongoDoc.content = nextContent;
  await mongoDoc.save();
}

/**
 * Schedule a debounced snapshot write for the given Yjs doc.
 *
 * @param {string} docName
 * @param {import('yjs').Doc} ydoc
 */
function scheduleSnapshot(docName, ydoc) {
  const key = docName;
  const existingTimer = snapshotTimers.get(key);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const now = Date.now();
  const firstChange =
    snapshotFirstChangeAt.get(key) == null
      ? now
      : snapshotFirstChangeAt.get(key);
  snapshotFirstChangeAt.set(key, firstChange);

  const elapsed = now - firstChange;
  const delay =
    elapsed >= SNAPSHOT_MAX_DEBOUNCE_MS ? 0 : SNAPSHOT_DEBOUNCE_MS;

  const timeoutId = setTimeout(async () => {
    snapshotTimers.delete(key);
    snapshotFirstChangeAt.delete(key);
    try {
      await persistYDocSnapshot(docName, ydoc);
    } catch (err) {
      // Avoid crashing the server on snapshot errors
      console.error('Failed to persist Yjs snapshot', {
        documentId: docName,
        error: err,
      });
    }
  }, delay);

  snapshotTimers.set(key, timeoutId);
}

// Hook into y-websocket persistence to bind Yjs docs to MongoDB snapshots
setPersistence({
  provider: null,
  bindState: async (docName, ydoc) => {
    // Initial load: seed the Yjs doc with existing HTML content from Mongo
    try {
      if (mongoose.Types.ObjectId.isValid(docName)) {
        const existing = await Document.findById(docName).lean();
        if (existing && typeof existing.content === 'string') {
          const yText = ydoc.getText('content');
          if (yText.length === 0) {
            yText.insert(0, existing.content);
          }
        }
      }
    } catch (err) {
      console.error('Failed to bind initial Yjs state from Mongo', {
        documentId: docName,
        error: err,
      });
    }

    // Subscribe to Yjs updates and debounce snapshot writes
    ydoc.on('update', () => {
      scheduleSnapshot(docName, ydoc);
    });
  },
  writeState: async (docName, ydoc) => {
    // Flush any pending timer and write once more when all connections close
    const existingTimer = snapshotTimers.get(docName);
    if (existingTimer) {
      clearTimeout(existingTimer);
      snapshotTimers.delete(docName);
      snapshotFirstChangeAt.delete(docName);
    }

    try {
      await persistYDocSnapshot(docName, ydoc);
    } catch (err) {
      console.error('Failed to write final Yjs state', {
        documentId: docName,
        error: err,
      });
    }
  },
});

const app = express();

// Session configuration për OAuth flow (store në MongoDB, jo në memorie)
app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URL,
      collectionName: 'sessions',
      ttl: 24 * 60 * 60, // 24 orë në sekonda
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production', // HTTPS në production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 orë
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Global middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true, // E nevojshme për cookies/session
}));
app.use(express.json());

// Health check route (mundesh me testu shpejt)
app.get('/', (req, res) => {
  res.json({ message: 'Interpad backend is running 🚀' });
});

// Auth routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// Upload routes (imazhe për dokumente)
const uploadRoutes = require('./routes/uploadRoutes');
app.use('/api/upload', uploadRoutes);

// Document routes (krijim, përditësim, load, lista recent)
const documentRoutes = require('./routes/documentRoutes');
app.use('/api/documents', documentRoutes);

// Shërbej skedarët e ngarkuar statikisht (URL për imazhet e ruajtura)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 404 handler për çdo route që nuk u gjet
app.use(notFound);

// Error handler qendror
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Lidhja me databazë para se me nis serverin
connectDB().then(() => {
  // Krijo HTTP server-in bazë mbi Express app
  const server = http.createServer(app);

  // Inicializo Yjs WebSocket server-in mbi të njëjtin HTTP server
  // Shënim: nuk vendosim `path` këtu që të lejojmë path-e si `/yjs/doc/:documentId`.
  // Filtrimin e path-it e bëjmë manualisht në handler-in `connection` më poshtë.
  const wss = new WebSocketServer({ server });

  wss.on('connection', async (conn, req) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const { pathname, searchParams } = url;

      // Lejojmë path-e të tipit:
      // - /yjs/doc/<documentId>
      // - /yjs/<documentId>
      const basePath = '/yjs';
      let rest = pathname.startsWith(basePath) ? pathname.slice(basePath.length) : pathname;
      rest = rest.replace(/^\/+/, '');

      let documentId = null;
      if (rest.startsWith('doc/')) {
        documentId = rest.slice('doc/'.length);
      } else if (rest.length > 0) {
        documentId = rest;
      }

      if (!documentId) {
        conn.close(1008, 'Missing document id');
        return;
      }

      const authToken = searchParams.get('authToken');
      const shareTokenParam = searchParams.get('token') || undefined;

      if (!authToken) {
        conn.close(1008, 'Missing auth token');
        return;
      }

      let decoded;
      try {
        decoded = jwt.verify(authToken, process.env.JWT_SECRET);
      } catch (err) {
        conn.close(1008, 'Invalid or expired auth token');
        return;
      }

      const userId = decoded && decoded.id;
      if (!userId) {
        conn.close(1008, 'Invalid auth payload');
        return;
      }

      const doc = await Document.findById(documentId);
      if (!doc) {
        conn.close(1008, 'Document not found');
        return;
      }

      const hasAccess = userHasBasicAccess(doc, userId);
      const shareToken = findActiveShareToken(doc, shareTokenParam);

      if (!hasAccess && !shareToken) {
        conn.close(1008, 'You do not have access to this document');
        return;
      }

      // Përdor documentId si docName në Yjs
      const docName = documentId;

      setupWSConnection(conn, req, { docName });
    } catch (err) {
      // Në rast të ndonjë gabimi të papritur, mbyll lidhjen në mënyrë të sigurt.
      try {
        conn.close(1011, 'Internal server error');
      } catch (_) {
        // ignore
      }
    }
  });

  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🧩 Yjs WebSocket server attached at path /yjs`);
  });
});


