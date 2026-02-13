const express = require('express');
const router = express.Router();
const { verifyJWT } = require('../middleware/authMiddleware');
const documentController = require('../controllers/documentController');

// Të gjitha rrugët kërkojnë JWT
router.use(verifyJWT);

// GET /api/documents – lista "recent documents" për user-in e loguar
router.get('/', documentController.getRecent);

// POST /api/documents – krijon dokument të ri
router.post('/', documentController.create);

// GET /api/documents/:id – merr një dokument (për hapje në editor)
router.get('/:id', documentController.getOne);

// PUT /api/documents/:id – përditëson dokument
router.put('/:id', documentController.update);

module.exports = router;
