const express = require('express');
const multer = require('multer');
const teacherController = require('../controllers/teacherController');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 3 * 1024 * 1024,
    files: 30
  }
});

router.get('/:teacherId/courses', teacherController.getDashboardCourses);
router.get('/:teacherId/courses/:courseId/modules', teacherController.getCourseModules);

router.post('/:teacherId/modules', teacherController.createModule);
router.put('/:teacherId/modules/:moduleId', teacherController.updateModule);
router.delete('/:teacherId/modules/:moduleId', teacherController.deleteModule);

router.post(
  '/:teacherId/materials',
  upload.single('pdf'),
  teacherController.createMaterial
);

router.put(
  '/:teacherId/materials/:materialId',
  upload.single('pdf'),
  teacherController.updateMaterial
);

router.delete('/:teacherId/materials/:materialId', teacherController.deleteMaterial);
router.patch('/:teacherId/modules/reorder', teacherController.reorderModules);
router.patch('/:teacherId/materials/reorder', teacherController.reorderMaterials);

router.get(
  '/:teacherId/questions/template',
  teacherController.downloadQuestionTemplate
);

router.get(
  '/:teacherId/modules/:moduleId/questions',
  teacherController.getModuleQuestions
);

router.post(
  '/:teacherId/questions/manual',
  upload.single('image'),
  teacherController.createModuleQuestion
);

router.post(
  '/:teacherId/questions/import',
  upload.single('csv'),
  teacherController.importModuleQuestions
);

router.post(
  '/:teacherId/questions/sync',
  upload.any(),
  teacherController.syncModuleQuestions
);

router.delete(
  '/:teacherId/questions',
  teacherController.deleteModuleQuestions
);

router.get(
  '/:teacherId/courses/:courseId/exam',
  teacherController.getCourseExam
);

router.post(
  '/:teacherId/exam/sync',
  upload.any(),
  teacherController.syncCourseExamQuestions
);

router.delete(
  '/:teacherId/exam/questions',
  teacherController.deleteCourseExamQuestions
);

router.patch(
  '/:teacherId/exam/setting',
  teacherController.updateCourseExamSetting
);

router.get(
  '/:teacherId/exam/template',
  teacherController.downloadExamTemplate
);

router.post(
  '/:teacherId/exam/import',
  upload.single('csv'),
  teacherController.importCourseExamQuestions
);

module.exports = router;