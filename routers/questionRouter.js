const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const authMiddleware = require('../middleware/auth');

// Admin tambah soal
router.post('/', authMiddleware, questionController.addQuestion);

// Siswa submit jawaban (untuk latihan, ujian, atau placement)
router.post('/submit', authMiddleware, questionController.submitAnswers);

module.exports = router;