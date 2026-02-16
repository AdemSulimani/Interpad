require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const passport = require('./config/passport');

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const Document = require('./models/Document');
const { RealtimeEvents } = require('./realtime/protocol');
const {
  loadDocumentState,
  getDocumentState,
  appendCommittedOperations,
  updateDocumentText,
} = require('./realtime/documentSessionManager');
const {
  applyOperationsToText,
  transformOpsAgainstLog,
} = require('./realtime/transformOps');

const app = express();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Session configuration për OAuth flow
app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
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
  origin: FRONTEND_URL,
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

// Krijo HTTP server dhe Socket.io layer
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    credentials: true,
  },
});

// Strukturë e thjeshtë për presence per dokument
const roomPresence = new Map(); // documentId -> Map(userId -> presenceInfo)

// Middleware për autentikim të WebSocket lidhjeve duke përdorur JWT
io.use((socket, next) => {
  try {
    const authHeader = socket.handshake.headers.authorization;
    const tokenFromHeader = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : null;

    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token ||
      tokenFromHeader;

    if (!token) {
      return next(new Error('Authentication error: missing token'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded; // { id, email, name, ... }
    next();
  } catch (err) {
    next(new Error('Authentication error: invalid or expired token'));
  }
});

io.on('connection', (socket) => {
  console.log('🔌 WebSocket connected', socket.user && socket.user.id);

  // Join dokument room me kontroll të aksesit bazik
  socket.on(RealtimeEvents.DOC_JOIN, async ({ documentId }) => {
    try {
      if (!documentId) {
        socket.emit(RealtimeEvents.DOC_ERROR, { message: 'documentId is required' });
        return;
      }

      const document = await Document.findById(documentId).select('userId title sharedWith');
      if (!document) {
        socket.emit(RealtimeEvents.DOC_ERROR, { message: 'Document not found' });
        return;
      }

      // Kontrollo që user-i është pronar i dokumentit ose është në sharedWith
      const isOwner = document.userId && document.userId.toString() === socket.user.id;
      const isShared =
        Array.isArray(document.sharedWith) &&
        document.sharedWith.some((id) => id && id.toString() === socket.user.id);

      if (!isOwner && !isShared) {
        socket.emit(RealtimeEvents.DOC_ERROR, { message: 'You do not have access to this document' });
        return;
      }

      // Join në room bazuar në documentId dhe mbaj mend dokumentin aktual
      socket.join(documentId);
      socket.currentDocumentId = documentId;

      // Sigurohu që dokumenti ekziston në memory dhe merr state aktuale
      const docState = await loadDocumentState(documentId);

      // Përditëso presence për këtë dokument
      if (!roomPresence.has(documentId)) {
        roomPresence.set(documentId, new Map());
      }
      const presenceForRoom = roomPresence.get(documentId);
      presenceForRoom.set(socket.user.id, {
        userId: socket.user.id,
        name: socket.user.name,
        joinedAt: new Date().toISOString(),
      });

      const activeUsers = Array.from(presenceForRoom.values());

      // Dërgo state-in fillestar të dokumentit te klienti aktual,
      // bashkë me presence-in dhe metadatat kryesore.
      socket.emit(RealtimeEvents.DOC_INITIAL_STATE, {
        documentId,
        title: document.title,
        text: docState.text,
        version: docState.version,
        opsLogTail: docState.opsLog,
        activeUsers,
      });

      // Broadcast presence update te krejt klientat tjerë në këtë dokument
      socket.to(documentId).emit(RealtimeEvents.PRESENCE_UPDATE, {
        documentId,
        activeUsers,
      });
    } catch (err) {
      console.error('doc:join error', err);
      socket.emit(RealtimeEvents.DOC_ERROR, { message: 'Failed to join document room' });
    }
  });

  // Marrje dhe aplikim i ops‑eve të tekstit nga klientët.
  socket.on(RealtimeEvents.DOC_OPS, async (payload) => {
    try {
      const documentId = socket.currentDocumentId;

      if (!documentId) {
        socket.emit(RealtimeEvents.DOC_ERROR, {
          message: 'You must join a document before sending operations',
        });
        return;
      }

      const rawOps = Array.isArray(payload?.ops) ? payload.ops : [];
      if (rawOps.length === 0) {
        return; // asgjë për të bërë
      }

      // Normalizim bazik + injektim i identitetit të user-it / klientit.
      const socketUserId = socket.user && socket.user.id ? String(socket.user.id) : '';
      const normalizedOps = rawOps
        .filter((op) => op && (op.type === 'insert' || op.type === 'delete'))
        .map((op) => ({
          ...op,
          userId: socketUserId,
          clientId: socket.id,
        }));

      if (normalizedOps.length === 0) {
        return;
      }

      const baseVersion = normalizedOps[0]?.baseVersion;
      if (typeof baseVersion !== 'number' || Number.isNaN(baseVersion)) {
        socket.emit(RealtimeEvents.DOC_ERROR, {
          message: 'Invalid operations payload: missing or invalid baseVersion',
        });
        return;
      }

      // Sigurohu që krejt ops‑et në batch kanë të njëjtin baseVersion.
      const mixedBaseVersion = normalizedOps.some(
        (op) => op.baseVersion !== baseVersion
      );
      if (mixedBaseVersion) {
        socket.emit(RealtimeEvents.DOC_ERROR, {
          message: 'All operations in a batch must share the same baseVersion',
        });
        return;
      }

      // Merr gjendjen aktuale në memory (ose ngarko nga DB nëse mungon).
      let state = getDocumentState(documentId);
      if (!state) {
        state = await loadDocumentState(documentId);
      }

      const currentVersion = typeof state.version === 'number' ? state.version : 0;

      // Klienti nuk duhet të jetë përpara serverit.
      if (baseVersion > currentVersion) {
        socket.emit(RealtimeEvents.DOC_ERROR, {
          message: 'Client is ahead of server version – requesting resync',
        });

        // Dërgo state-in aktual që klienti të bëjë resync të plotë.
        socket.emit(RealtimeEvents.DOC_INITIAL_STATE, {
          documentId,
          title: state.title || '',
          text: state.text || '',
          version: state.version,
          opsLogTail: state.opsLog || [],
          activeUsers: [],
        });
        return;
      }

      let opsToApply = normalizedOps;

      if (baseVersion < currentVersion) {
        // Klienti është prapa – transformo ops‑et hyrëse kundrejt ops‑eve
        // që mungojnë nga opsLog.
        const opsLog = Array.isArray(state.opsLog) ? state.opsLog : [];
        const opsToCatchUp = opsLog.filter(
          (op) =>
            typeof op.appliedVersion === 'number' &&
            op.appliedVersion > baseVersion
        );

        if (opsToCatchUp.length === 0) {
          // Mungojnë historikun e nevojshëm për transformim – kërko resync.
          socket.emit(RealtimeEvents.DOC_ERROR, {
            message: 'Client is too far behind – requesting full resync',
          });
          socket.emit(RealtimeEvents.DOC_INITIAL_STATE, {
            documentId,
            title: state.title || '',
            text: state.text || '',
            version: state.version,
            opsLogTail: state.opsLog || [],
            activeUsers: [],
          });
          return;
        }

        opsToApply = transformOpsAgainstLog(opsToApply, opsToCatchUp);
      }

      // Apliko ops‑et (të transformuara) mbi tekstin aktual.
      const currentText = typeof state.text === 'string' ? state.text : '';
      const newText = applyOperationsToText(currentText, opsToApply);
      const newVersion = currentVersion + 1;

      // Përditëso state‑in në memory dhe shto ops‑et në opsLog.
      updateDocumentText(documentId, newText, newVersion);
      appendCommittedOperations(documentId, opsToApply, newVersion);

      // Broadcast i batch‑it të konfirmuar tek krejt klientët në dokument.
      io.to(documentId).emit(RealtimeEvents.DOC_OPS_COMMITTED, {
        documentId,
        opsApplied: opsToApply,
        newVersion,
        fromUserId: socketUserId,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('doc:ops error', err);
      socket.emit(RealtimeEvents.DOC_ERROR, {
        message: 'Failed to apply document operations',
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 WebSocket disconnected', socket.user && socket.user.id);

    // Pastrimi i presence për çdo dokument ku ka qenë ky socket
    roomPresence.forEach((presenceForRoom, documentId) => {
      if (presenceForRoom.has(socket.user.id)) {
        presenceForRoom.delete(socket.user.id);

        const activeUsers = Array.from(presenceForRoom.values());

        // Broadcast presence update te room-i përkatës
        io.to(documentId).emit(RealtimeEvents.PRESENCE_UPDATE, {
          documentId,
          activeUsers,
        });

        if (presenceForRoom.size === 0) {
          roomPresence.delete(documentId);
        }
      }
    });
  });
});

const PORT = process.env.PORT || 5000;

// Lidhja me databazë para se me nis serverin
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});

