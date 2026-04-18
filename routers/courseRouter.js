const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const authMiddleware = require('../middleware/auth');

router.get('/', courseController.listCourses);
router.get('/:id', authMiddleware, courseController.getDetail);
router.post('/', authMiddleware, courseController.addCourse);

// Lengkapi CRUD
router.put('/:id', authMiddleware, courseController.updateCourse);
router.delete('/:id', authMiddleware, courseController.deleteCourse);

module.exports = router;