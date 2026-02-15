const express = require('express');
const router = express.Router();
const { verifyJWT } = require('../middleware/authMiddleware');
const documentController = require('../controllers/documentController');
const commentController = require('../controllers/commentController');

// Të gjitha rrugët kërkojnë JWT
router.use(verifyJWT);

// GET /api/documents – lista "recent documents" për user-in e loguar
router.get('/', documentController.getRecent);

// POST /api/documents – krijon dokument të ri
router.post('/', documentController.create);

// Komente për dokument – duhet para /:id që /:id/comments të përputhet
// GET /api/documents/:id/comments – lista komentesh për dokumentin
router.get('/:id/comments', commentController.getByDocument);
// POST /api/documents/:id/comments – krijon koment të ri
router.post('/:id/comments', commentController.create);
// PATCH /api/documents/:id/comments/:commentId – resolve/unresolve koment (body: { resolved: true|false })
router.patch('/:id/comments/:commentId', commentController.resolveOne);
// DELETE /api/documents/:id/comments/:commentId – fshin koment
router.delete('/:id/comments/:commentId', commentController.deleteOne);

// GET /api/documents/:id – merr një dokument (për hapje në editor)
router.get('/:id', documentController.getOne);

// PUT /api/documents/:id – përditëson dokument
router.put('/:id', documentController.update);

module.exports = router;
