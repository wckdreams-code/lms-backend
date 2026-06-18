const supabase = require('../config/supabase');

exports.getTeacherCourses = async (teacherId) => {
  const { data, error } = await supabase
    .from('courses')
    .select(`
      *,
      modules (
        id,
        title,
        order_index,
        materials (id),
        questions (id, is_exam)
      )
    `)
    .eq('teacher_id', teacherId)
    .order('title', { ascending: true });

  if (error) throw error;
  return data;
};

exports.getTeacherPermissions = async (teacherId) => {
  const { data, error } = await supabase
    .from('teacher_permissions')
    .select('*')
    .eq('teacher_id', teacherId)
    .maybeSingle();

  if (error) throw error;

  return data || {
    can_create_material: false,
    can_update_material: false,
    can_delete_material: false
  };
};

exports.getCourseModules = async (courseId, teacherId) => {
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .eq('teacher_id', teacherId)
    .single();

  if (courseError) throw courseError;

  const { data, error } = await supabase
    .from('modules')
    .select(`
      *,
      materials (*),
      questions (*)
    `)
    .eq('course_id', course.id)
    .order('order_index', { ascending: true })
    .order('order_index', { foreignTable: 'materials', ascending: true });
    
  if (error) throw error;
  return data;
};

exports.createModule = async (payload) => {
  const { data, error } = await supabase
    .from('modules')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
};

exports.updateModule = async (moduleId, payload) => {
  const cleanPayload = {
    title: payload.title,
    order_index: Number(payload.order_index || 0)
  };

  const { data, error } = await supabase
    .from('modules')
    .update(cleanPayload)
    .eq('id', moduleId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

exports.deleteModule = async (moduleId) => {
  const { error } = await supabase
    .from('modules')
    .delete()
    .eq('id', moduleId);

  if (error) throw error;
};

exports.deleteMaterial = async (materialId) => {
  const { error } = await supabase
    .from('materials')
    .delete()
    .eq('id', materialId);

  if (error) throw error;
};

async function uploadMaterialPdf(file) {
  if (!file) return null;

  if (file.mimetype !== 'application/pdf') {
    throw new Error('File materi harus PDF.');
  }

  const filePath = `materials/${Date.now()}-${file.originalname}`;

  const { error: uploadError } = await supabase.storage
    .from('course-materials')
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('course-materials')
    .getPublicUrl(filePath);

  return {
    storage_path: filePath,
    pdf_content_url: data.publicUrl,
    file_name: file.originalname,
    mime_type: file.mimetype,
    file_size: file.size
  };
}

exports.createMaterial = async ({ body, file }) => {
  const normalizedTitle = String(body.title || '').trim();

  if (!normalizedTitle) {
    throw new Error('Judul materi wajib diisi.');
  }

  if (!body.module_id) {
    throw new Error('Module ID wajib dikirim.');
  }

  const { data: existingMaterial, error: existingError } = await supabase
    .from('materials')
    .select('id')
    .eq('module_id', body.module_id)
    .ilike('title', normalizedTitle)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existingMaterial) {
    throw new Error('Materi dengan nama ini sudah ada di modul tersebut.');
  }

  const uploadedFile = await uploadMaterialPdf(file);

  const payload = {
    module_id: body.module_id,
    title: normalizedTitle,
    order_index: Number(body.order_index || 0),
    ...uploadedFile
  };

  const { data, error } = await supabase
    .from('materials')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
};

exports.updateMaterial = async (materialId, { body, file }) => {
  const normalizedTitle = String(body.title || '').trim();

  if (!normalizedTitle) {
    throw new Error('Judul materi wajib diisi.');
  }

  const { data: currentMaterial, error: currentError } = await supabase
    .from('materials')
    .select('id, module_id')
    .eq('id', materialId)
    .single();

  if (currentError) throw currentError;

  const targetModuleId = body.module_id || currentMaterial.module_id;

  const { data: existingMaterial, error: existingError } = await supabase
    .from('materials')
    .select('id')
    .eq('module_id', targetModuleId)
    .ilike('title', normalizedTitle)
    .neq('id', materialId)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existingMaterial) {
    throw new Error('Materi dengan nama ini sudah ada di modul tersebut.');
  }

  const uploadedFile = await uploadMaterialPdf(file);

  const payload = {
    title: normalizedTitle,
    order_index: Number(body.order_index || 0),
    ...(uploadedFile || {})
  };

  const { data, error } = await supabase
    .from('materials')
    .update(payload)
    .eq('id', materialId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

exports.reorderModules = async ({ teacherId, courseId, modules }) => {
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .eq('teacher_id', teacherId)
    .single();

  if (courseError) throw courseError;

  const moduleIds = modules.map(item => item.id);

  const { data: validModules, error: moduleError } = await supabase
    .from('modules')
    .select('id')
    .eq('course_id', course.id)
    .in('id', moduleIds);

  if (moduleError) throw moduleError;

  if (validModules.length !== modules.length) {
    throw new Error('Ada modul yang tidak valid untuk course ini.');
  }

  const results = await Promise.all(
    modules.map(item =>
      supabase
        .from('modules')
        .update({ order_index: Number(item.order_index) })
        .eq('id', item.id)
        .eq('course_id', course.id)
    )
  );

  const failed = results.find(result => result.error);

  if (failed) throw failed.error;

  return true;
};

exports.reorderMaterials = async ({ teacherId, moduleId, materials }) => {
  const { data: module, error: moduleError } = await supabase
    .from('modules')
    .select(`
      id,
      course_id,
      courses!inner (
        id,
        teacher_id
      )
    `)
    .eq('id', moduleId)
    .eq('courses.teacher_id', teacherId)
    .single();

  if (moduleError) throw moduleError;

  const materialIds = materials.map(item => item.id);

  const { data: validMaterials, error: materialError } = await supabase
    .from('materials')
    .select('id')
    .eq('module_id', module.id)
    .in('id', materialIds);

  if (materialError) throw materialError;

  if (validMaterials.length !== materials.length) {
    throw new Error('Ada materi yang tidak valid untuk modul ini.');
  }

  const results = await Promise.all(
    materials.map(item =>
      supabase
        .from('materials')
        .update({ order_index: Number(item.order_index) })
        .eq('id', item.id)
        .eq('module_id', module.id)
    )
  );

  const failed = results.find(result => result.error);

  if (failed) throw failed.error;

  return true;
};

async function uploadQuestionImage(file) {
  if (!file) return null;

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error('Gambar soal harus JPG, PNG, atau WEBP.');
  }

  const safeName = file.originalname.replace(/\s+/g, '-').toLowerCase();
  const filePath = `questions/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from('question-images')
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('question-images')
    .getPublicUrl(filePath);

  return {
    image_storage_path: filePath,
    image_url: data.publicUrl
  };
}

exports.getModuleQuestions = async ({ teacherId, moduleId }) => {
  const { data: module, error: moduleError } = await supabase
    .from('modules')
    .select(`
      id,
      course_id,
      courses!inner (
        id,
        teacher_id
      )
    `)
    .eq('id', moduleId)
    .eq('courses.teacher_id', teacherId)
    .single();

  if (moduleError) throw moduleError;

  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('module_id', module.id)
    .eq('is_exam', false)
    .order('order_index', { ascending: true });

  if (error) throw error;

  return data;
};

exports.createModuleQuestion = async ({ teacherId, body, file }) => {
  const { data: module, error: moduleError } = await supabase
    .from('modules')
    .select(`
      id,
      course_id,
      courses!inner (
        id,
        teacher_id
      )
    `)
    .eq('id', body.module_id)
    .eq('courses.teacher_id', teacherId)
    .single();

  if (moduleError) throw moduleError;

  const questionText = String(body.question_text || '').trim();
  const correctAnswer = String(body.correct_answer || '').trim().toUpperCase();

  if (!questionText) throw new Error('Pertanyaan wajib diisi.');
  if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
    throw new Error('Jawaban benar harus A, B, C, atau D.');
  }

  const duplicateCheck = await supabase
    .from('questions')
    .select('id')
    .eq('module_id', module.id)
    .eq('is_exam', false)
    .ilike('question_text', questionText)
    .maybeSingle();

  if (duplicateCheck.error) throw duplicateCheck.error;

  if (duplicateCheck.data) {
    throw new Error('Soal dengan pertanyaan yang sama sudah ada di modul ini.');
  }

  const uploadedImage = await uploadQuestionImage(file);

  const { count, error: countError } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('module_id', module.id)
    .eq('is_exam', false);

  if (countError) throw countError;

  const payload = {
    module_id: module.id,
    course_id: module.course_id,
    question_text: questionText,
    option_a: String(body.option_a || '').trim(),
    option_b: String(body.option_b || '').trim(),
    option_c: String(body.option_c || '').trim(),
    option_d: String(body.option_d || '').trim(),
    correct_answer: correctAnswer,
    explanation: String(body.explanation || '').trim() || null,
    image_url: body.image_url || uploadedImage?.image_url || null,
    image_storage_path: uploadedImage?.image_storage_path || null,
    is_exam: false,
    order_index: Number(count || 0) + 1
  };

  if (!payload.option_a || !payload.option_b || !payload.option_c || !payload.option_d) {
    throw new Error('Semua pilihan jawaban A sampai D wajib diisi.');
  }

  const { data, error } = await supabase
    .from('questions')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;

  return data;
};

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let insideQuote = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && next === '"') {
      current += '"';
      i++;
      continue;
    }

    if (char === '"') {
      insideQuote = !insideQuote;
      continue;
    }

    if (char === ',' && !insideQuote) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function parseQuestionsCsv(buffer) {
  const csvText = buffer.toString('utf-8').replace(/\r/g, '');
  const lines = csvText.split('\n').filter(line => line.trim());

  if (lines.length < 2) {
    throw new Error('CSV harus memiliki header dan minimal 1 soal.');
  }

  const headers = parseCsvLine(lines[0]).map(item => item.trim());
  const requiredHeaders = [
    'question_text',
    'option_a',
    'option_b',
    'option_c',
    'option_d',
    'correct_answer'
  ];

  const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));

  if (missingHeaders.length) {
    throw new Error(`Header CSV tidak lengkap: ${missingHeaders.join(', ')}`);
  }

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);

    const row = headers.reduce((acc, header, headerIndex) => {
      acc[header] = values[headerIndex] || '';
      return acc;
    }, {});

    const correctAnswer = String(row.correct_answer || '').trim().toUpperCase();

    if (!row.question_text?.trim()) {
      throw new Error(`Baris ${index + 2}: pertanyaan wajib diisi.`);
    }

    if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
      throw new Error(`Baris ${index + 2}: correct_answer harus A, B, C, atau D.`);
    }

    return {
      question_text: row.question_text.trim(),
      option_a: row.option_a.trim(),
      option_b: row.option_b.trim(),
      option_c: row.option_c.trim(),
      option_d: row.option_d.trim(),
      correct_answer: correctAnswer,
      image_url: row.image_url?.trim() || null,
      explanation: row.explanation?.trim() || null
    };
  });
}

exports.importModuleQuestions = async ({ teacherId, body, file }) => {
  if (!file) {
    throw new Error('File CSV wajib diupload.');
  }

  if (!file.originalname.endsWith('.csv') && file.mimetype !== 'text/csv') {
    throw new Error('File harus berformat CSV.');
  }

  const { data: module, error: moduleError } = await supabase
    .from('modules')
    .select(`
      id,
      course_id,
      courses!inner (
        id,
        teacher_id
      )
    `)
    .eq('id', body.module_id)
    .eq('courses.teacher_id', teacherId)
    .single();

  if (moduleError) throw moduleError;

  const rows = parseQuestionsCsv(file.buffer);

  const { data: existingQuestions, error: existingError } = await supabase
    .from('questions')
    .select('question_text')
    .eq('module_id', module.id)
    .eq('is_exam', false);

  if (existingError) throw existingError;

  const existingSet = new Set(
    (existingQuestions || []).map(item => item.question_text.trim().toLowerCase())
  );

  const seenInCsv = new Set();

  const { count, error: countError } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('module_id', module.id)
    .eq('is_exam', false);

  if (countError) throw countError;

  const payload = rows.map((row, index) => {
    const normalizedQuestion = row.question_text.toLowerCase();

    if (existingSet.has(normalizedQuestion)) {
      throw new Error(`Soal duplikat dengan database: ${row.question_text}`);
    }

    if (seenInCsv.has(normalizedQuestion)) {
      throw new Error(`Soal duplikat di CSV: ${row.question_text}`);
    }

    seenInCsv.add(normalizedQuestion);

    return {
      module_id: module.id,
      course_id: module.course_id,
      question_text: row.question_text,
      option_a: row.option_a,
      option_b: row.option_b,
      option_c: row.option_c,
      option_d: row.option_d,
      correct_answer: row.correct_answer,
      image_url: row.image_url,
      explanation: row.explanation,
      is_exam: false,
      order_index: Number(count || 0) + index + 1
    };
  });

  const { data, error } = await supabase
    .from('questions')
    .insert(payload)
    .select();

  if (error) throw error;

  return data;
};

function normalizeQuestionPayload(item, index = 0, module) {
  const correctAnswer = String(item.correct_answer || '').trim().toUpperCase();

  if (!String(item.question_text || '').trim()) {
    throw new Error(`Soal ${index + 1}: pertanyaan wajib diisi.`);
  }

  if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
    throw new Error(`Soal ${index + 1}: jawaban benar harus A, B, C, atau D.`);
  }

  if (!item.option_a || !item.option_b || !item.option_c || !item.option_d) {
    throw new Error(`Soal ${index + 1}: semua opsi A sampai D wajib diisi.`);
  }

  return {
    module_id: module.id,
    course_id: module.course_id,
    question_text: String(item.question_text).trim(),
    option_a: String(item.option_a).trim(),
    option_b: String(item.option_b).trim(),
    option_c: String(item.option_c).trim(),
    option_d: String(item.option_d).trim(),
    correct_answer: correctAnswer,
    image_url: item.image_url || null,
    explanation: String(item.explanation || '').trim() || null,
    is_exam: false,
    order_index: Number(item.order_index || index + 1)
  };
}

exports.deleteModuleQuestions = async ({ teacherId, moduleId, questionIds = [] }) => {
  const { data: module, error: moduleError } = await supabase
    .from('modules')
    .select(`
      id,
      course_id,
      courses!inner (
        id,
        teacher_id
      )
    `)
    .eq('id', moduleId)
    .eq('courses.teacher_id', teacherId)
    .single();

  if (moduleError) throw moduleError;

  let query = supabase
    .from('questions')
    .delete()
    .eq('module_id', module.id)
    .eq('is_exam', false);

  if (questionIds.length) {
    query = query.in('id', questionIds);
  }

  const { error } = await query;

  if (error) throw error;

  return true;
};

exports.syncModuleQuestions = async ({ teacherId, body, files = [] }) => {
  const moduleId = body.module_id;
  const mode = body.mode || 'append';

  if (!moduleId) {
    throw new Error('Module ID wajib dikirim.');
  }

  const { data: module, error: moduleError } = await supabase
    .from('modules')
    .select(`
      id,
      course_id,
      courses!inner (
        id,
        teacher_id
      )
    `)
    .eq('id', moduleId)
    .eq('courses.teacher_id', teacherId)
    .single();

  if (moduleError) throw moduleError;

  let questions = [];

  try {
    questions = JSON.parse(body.questions || '[]');
  } catch {
    throw new Error('Format data soal tidak valid.');
  }

  if (!Array.isArray(questions) || !questions.length) {
    throw new Error('Minimal harus ada 1 soal.');
  }

  const fileMap = new Map();

  files.forEach(file => {
    fileMap.set(file.fieldname, file);
  });

  if (mode === 'replace') {
    await supabase
      .from('questions')
      .delete()
      .eq('module_id', module.id)
      .eq('is_exam', false);
  }

  const savedQuestions = [];

  for (let index = 0; index < questions.length; index++) {
    const item = questions[index];
    const file = fileMap.get(`image_${item.client_id}`);

    const uploadedImage = file ? await uploadQuestionImage(file) : null;

    const payload = normalizeQuestionPayload(
      {
        ...item,
        image_url: uploadedImage?.image_url || item.image_url || null,
        order_index: index + 1
      },
      index,
      module
    );

    if (item.id && mode !== 'append') {
      const { data, error } = await supabase
        .from('questions')
        .update({
          ...payload,
          image_storage_path: uploadedImage?.image_storage_path || item.image_storage_path || null
        })
        .eq('id', item.id)
        .eq('module_id', module.id)
        .select()
        .single();

      if (error) throw error;
      savedQuestions.push(data);
    } else {
      const { data, error } = await supabase
        .from('questions')
        .insert({
          ...payload,
          image_storage_path: uploadedImage?.image_storage_path || null
        })
        .select()
        .single();

      if (error) throw error;
      savedQuestions.push(data);
    }
  }

  return savedQuestions;
};

exports.getCourseExam = async ({ teacherId, courseId }) => {
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .eq('teacher_id', teacherId)
    .single();

  if (courseError) throw courseError;

  const { data: questions, error: questionError } = await supabase
    .from('questions')
    .select('*')
    .eq('course_id', course.id)
    .eq('is_exam', true)
    .order('order_index', { ascending: true });

  if (questionError) throw questionError;

  const { data: setting, error: settingError } = await supabase
    .from('course_exam_settings')
    .select('*')
    .eq('course_id', course.id)
    .maybeSingle();

  if (settingError) throw settingError;

  return {
    questions,
    setting: setting || {
      course_id: course.id,
      duration_minutes: 10
    }
  };
};

exports.syncCourseExamQuestions = async ({ teacherId, body, files = [] }) => {
  const courseId = body.course_id;
  const mode = body.mode || 'append';

  if (!courseId) throw new Error('Course ID wajib dikirim.');

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .eq('teacher_id', teacherId)
    .single();

  if (courseError) throw courseError;

  let questions = [];

  try {
    questions = JSON.parse(body.questions || '[]');
  } catch {
    throw new Error('Format data ujian tidak valid.');
  }

  if (!Array.isArray(questions) || !questions.length) {
    throw new Error('Minimal harus ada 1 soal ujian.');
  }

  const fileMap = new Map();

  files.forEach(file => {
    fileMap.set(file.fieldname, file);
  });

  if (mode === 'replace') {
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('course_id', course.id)
      .eq('is_exam', true);

    if (error) throw error;
  }

  const savedQuestions = [];

  for (let index = 0; index < questions.length; index++) {
    const item = questions[index];
    const file = fileMap.get(`image_${item.client_id}`);
    const uploadedImage = file ? await uploadQuestionImage(file) : null;

    const correctAnswer = String(item.correct_answer || '').trim().toUpperCase();

    if (!String(item.question_text || '').trim()) {
      throw new Error(`Soal ujian ${index + 1}: pertanyaan wajib diisi.`);
    }

    if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
      throw new Error(`Soal ujian ${index + 1}: jawaban benar harus A, B, C, atau D.`);
    }

    if (!item.option_a || !item.option_b || !item.option_c || !item.option_d) {
      throw new Error(`Soal ujian ${index + 1}: semua opsi wajib diisi.`);
    }

    const payload = {
      module_id: null,
      course_id: course.id,
      question_text: String(item.question_text).trim(),
      option_a: String(item.option_a).trim(),
      option_b: String(item.option_b).trim(),
      option_c: String(item.option_c).trim(),
      option_d: String(item.option_d).trim(),
      correct_answer: correctAnswer,
      image_url: uploadedImage?.image_url || item.image_url || null,
      image_storage_path: uploadedImage?.image_storage_path || item.image_storage_path || null,
      explanation: null,
      is_exam: true,
      order_index: index + 1
    };

    if (item.id && mode !== 'append') {
      const { data, error } = await supabase
        .from('questions')
        .update(payload)
        .eq('id', item.id)
        .eq('course_id', course.id)
        .eq('is_exam', true)
        .select()
        .single();

      if (error) throw error;
      savedQuestions.push(data);
    } else {
      const { data, error } = await supabase
        .from('questions')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      savedQuestions.push(data);
    }
  }

  return savedQuestions;
};

exports.deleteCourseExamQuestions = async ({ teacherId, courseId, questionIds = [] }) => {
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .eq('teacher_id', teacherId)
    .single();

  if (courseError) throw courseError;

  let query = supabase
    .from('questions')
    .delete()
    .eq('course_id', course.id)
    .eq('is_exam', true);

  if (questionIds.length) {
    query = query.in('id', questionIds);
  }

  const { error } = await query;
  if (error) throw error;

  return true;
};

exports.upsertCourseExamSetting = async ({ teacherId, courseId, durationMinutes }) => {
  const duration = Number(durationMinutes);

  if (!duration || duration < 1) {
    throw new Error('Durasi ujian minimal 1 menit.');
  }

  if (duration > 300) {
    throw new Error('Durasi ujian maksimal 300 menit.');
  }

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .eq('teacher_id', teacherId)
    .single();

  if (courseError) throw courseError;

  const { data, error } = await supabase
    .from('course_exam_settings')
    .upsert(
      {
        course_id: course.id,
        duration_minutes: duration,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'course_id' }
    )
    .select()
    .single();

  if (error) throw error;

  return data;
};

exports.importCourseExamQuestions = async ({ teacherId, body, file }) => {
  if (!file) {
    throw new Error('File CSV wajib diupload.');
  }

  if (!file.originalname.endsWith('.csv') && file.mimetype !== 'text/csv') {
    throw new Error('File harus berformat CSV.');
  }

  const courseId = body.course_id;

  if (!courseId) {
    throw new Error('Course ID wajib dikirim.');
  }

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .eq('teacher_id', teacherId)
    .single();

  if (courseError) throw courseError;

  const rows = parseQuestionsCsv(file.buffer);

  const { data: existingQuestions, error: existingError } = await supabase
    .from('questions')
    .select('question_text')
    .eq('course_id', course.id)
    .eq('is_exam', true);

  if (existingError) throw existingError;

  const existingSet = new Set(
    (existingQuestions || []).map(item => item.question_text.trim().toLowerCase())
  );

  const seenInCsv = new Set();

  const { count, error: countError } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', course.id)
    .eq('is_exam', true);

  if (countError) throw countError;

  const payload = rows.map((row, index) => {
    const normalizedQuestion = row.question_text.toLowerCase();

    if (existingSet.has(normalizedQuestion)) {
      throw new Error(`Soal ujian duplikat dengan database: ${row.question_text}`);
    }

    if (seenInCsv.has(normalizedQuestion)) {
      throw new Error(`Soal ujian duplikat di CSV: ${row.question_text}`);
    }

    seenInCsv.add(normalizedQuestion);

    return {
      module_id: null,
      course_id: course.id,
      question_text: row.question_text,
      option_a: row.option_a,
      option_b: row.option_b,
      option_c: row.option_c,
      option_d: row.option_d,
      correct_answer: row.correct_answer,
      image_url: row.image_url,
      image_storage_path: null,
      explanation: null,
      is_exam: true,
      order_index: Number(count || 0) + index + 1
    };
  });

  const { data, error } = await supabase
    .from('questions')
    .insert(payload)
    .select();

  if (error) throw error;

  return data;
};