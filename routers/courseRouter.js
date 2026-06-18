// src/routers/courseRouter.js
const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const authMiddleware = require('../middleware/auth');

// List semua kursus (Publik)
router.get('/', courseController.listCourses);

// Detail satu kursus (Publik - HAPUS authMiddleware di sini!)
router.get('/:id', courseController.getDetail);

// Endpoint di bawah ini tetap butuh auth karena khusus Admin/Guru
router.post('/', authMiddleware, courseController.addCourse);
router.put('/:id', authMiddleware, courseController.updateCourse);
router.delete('/:id', authMiddleware, courseController.deleteCourse);

router.get('/:id/learn', authMiddleware, courseController.getLearnData);
router.post('/:id/learn/progress', authMiddleware, courseController.saveModuleProgress);
router.post('/:id/learn/exam', authMiddleware, courseController.submitFinalExam);

module.exports = router;