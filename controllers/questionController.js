const questionModel = require('../models/questionModel');

exports.addQuestion = async (req, res) => {
  try {
    if (req.user.role === 'siswa') return res.status(403).json({ message: 'Forbidden' });
    const newQuestion = await questionModel.createQuestion(req.body);
    res.status(201).json({ status: 'success', data: newQuestion });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.submitAnswers = async (req, res) => {
  try {
    const { course_id, module_id, answers, is_exam } = req.body; 
    // answers format: [{question_id: '...', chosen: 'A'}]
    
    // 1. Ambil kunci jawaban dari DB
    const questions = is_exam 
      ? await questionModel.getQuestionsByCourse(course_id, true)
      : await questionModel.getQuestionsByModule(module_id);

    // 2. Hitung skor
    let correctCount = 0;
    questions.forEach(q => {
      const userAns = answers.find(a => a.question_id === q.id);
      if (userAns && userAns.chosen === q.correct_answer) {
        correctCount++;
      }
    });

    const finalScore = Math.round((correctCount / questions.length) * 100);

    // 3. Simpan ke Progres
    const progress = await questionModel.saveProgress({
      user_id: req.user.id,
      course_id,
      module_id: module_id || null,
      score: finalScore,
      is_completed: finalScore >= 60 // Misal KKM 60
    });

    res.status(200).json({
      status: 'success',
      data: {
        score: finalScore,
        correct: correctCount,
        total: questions.length,
        passed: finalScore >= 60
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};