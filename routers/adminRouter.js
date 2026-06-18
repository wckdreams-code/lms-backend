const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/accounts', adminController.getAccounts);
router.post('/teachers', adminController.createTeacher);
router.patch('/teachers/:teacherId/permissions', adminController.updateTeacherPermissions);
router.patch('/users/:userId/password', adminController.updateUserPassword);
router.delete('/users/:userId', adminController.deleteAccount);
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/transactions', adminController.getTransactions);

router.get('/courses', adminController.getCourses);
router.post('/courses', adminController.createCourse);
router.patch('/courses/:courseId', adminController.updateCourse);
router.patch('/courses/:courseId/status', adminController.updateCourseStatus);

router.get('/transactions/stats', adminController.getTransactionStats);



module.exports = router;