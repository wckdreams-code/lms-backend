const express = require('express');
const router = express.Router();
const moduleController = require('../controllers/moduleController');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

// Admin menambah modul dengan upload file PDF
router.post('/', authMiddleware, upload.single('pdf'), moduleController.addModule);

// Ambil semua modul dalam satu kursus
router.get('/course/:courseId', authMiddleware, moduleController.getCourseModules);

// 🔥 AI CONTEXT
router.post('/ai-context', authMiddleware, moduleController.getAIContext);

// Hapus modul
router.delete('/:id', authMiddleware, moduleController.deleteModule);

module.exports = router;