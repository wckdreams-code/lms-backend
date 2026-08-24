const supabase = require("../config/supabase");

function normalizeTags(value) {
  if (Array.isArray(value)) return value;
  return String(value || "")
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}

async function uploadCourseBanner(file) {
  if (!file) return null;

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error("Banner kursus harus berupa JPG, PNG, atau WEBP.");
  }

  const safeName = file.originalname.replace(/\s+/g, "-").toLowerCase();
  const filePath = `banners/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("course-banners")
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from("course-banners")
    .getPublicUrl(filePath);

  return {
    thumbnail_url: data.publicUrl,
  };
}

exports.getAllAccounts = async () => {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
            id,
            full_name,
            role,
            current_level,
            avatar_url,
            created_at,
            teacher_permissions (
                can_create_material,
                can_update_material,
                can_delete_material
            )
        `,
    )
    .in("role", ["siswa", "guru", "admin"])
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
};

exports.getAccountDetail = async (userId) => {
  const { data: account, error: accountError } = await supabase
    .from("profiles")
    .select(
      `
            id,
            full_name,
            role,
            current_level,
            avatar_url,
            created_at
        `,
    )
    .eq("id", userId)
    .maybeSingle();

  if (accountError) throw accountError;

  if (!account) {
    throw new Error("Akun tidak ditemukan.");
  }

  const [transactionsRes, certificatesRes] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        `
            id,
            order_id,
            amount,
            status_pembayaran,
            is_confirmed_by_admin,
            created_at,
            courses:course_id (
                id,
                title,
                category,
                thumbnail_url
            )
        `,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),

    supabase
      .from("certificates")
      .select(
        `
            id,
            certificate_url,
            certificate_number,
            status,
            issued_at,
            courses:course_id (
                id,
                title
            )
        `,
      )
      .eq("user_id", userId)
      .order("issued_at", { ascending: false }),
  ]);

  if (transactionsRes.error) throw transactionsRes.error;
  if (certificatesRes.error) throw certificatesRes.error;

  const transactions = transactionsRes.data || [];
  const courseMap = new Map();

  transactions
    .filter(
      (transaction) =>
        transaction.courses &&
        (transaction.status_pembayaran === "success" ||
          transaction.is_confirmed_by_admin),
    )
    .forEach((transaction) => {
      courseMap.set(transaction.courses.id, transaction.courses);
    });

  return {
    account,
    courses: Array.from(courseMap.values()),
    certificates: certificatesRes.data || [],
    transactions,
  };
};

exports.updateAccount = async (userId, payload) => {
  const updatePayload = {};

  if (payload.full_name !== undefined) {
    updatePayload.full_name = payload.full_name;
  }

  let profile = null;

  if (Object.keys(updatePayload).length > 0) {
    const { data, error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    profile = data;
  }

  if (payload.password) {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: payload.password,
    });

    if (error) throw error;
  }

  return profile || true;
};

exports.createTeacher = async ({ email, password, full_name }) => {
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

  if (authError) throw authError;

  const userId = authData.user.id;

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      full_name,
      role: "guru",
    },
    { onConflict: "id" },
  );

  if (profileError) throw profileError;

  const { error: permissionError } = await supabase
    .from("teacher_permissions")
    .upsert(
      {
        teacher_id: userId,
      },
      { onConflict: "teacher_id" },
    );

  if (permissionError) throw permissionError;

  return {
    id: userId,
    email,
    password,
    full_name,
    role: "guru",
  };
};

exports.updateTeacherPermissions = async (teacherId, permissions) => {
  const { data: teacher, error: teacherError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", teacherId)
    .eq("role", "guru")
    .maybeSingle();

  if (teacherError) throw teacherError;

  if (!teacher) {
    throw new Error("Guru tidak ditemukan atau user bukan guru.");
  }

  const payload = {
    teacher_id: teacherId,
    can_create_material: Boolean(permissions.can_create_material),
    can_update_material: Boolean(permissions.can_update_material),
    can_delete_material: Boolean(permissions.can_delete_material),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("teacher_permissions")
    .upsert(payload, { onConflict: "teacher_id" })
    .select()
    .single();

  if (error) throw error;

  return data;
};
exports.updateUserPassword = async (userId, password) => {
  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    password,
  });

  if (error) throw error;
  return data.user;
};

exports.deleteAccount = async (userId) => {
  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) throw error;
  return true;
};

exports.getDashboardStats = async () => {
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("role");

  if (profilesError) throw profilesError;

  const { count: materialCount, error: materialError } = await supabase
    .from("materials")
    .select("*", { count: "exact", head: true });

  if (materialError) throw materialError;

  const totalSiswa = profiles.filter((item) => item.role === "siswa").length;
  const totalGuru = profiles.filter((item) => item.role === "guru").length;

  return {
    total_siswa: totalSiswa,
    total_guru: totalGuru,
    total_materi: materialCount || 0,
  };
};

exports.getSalesChart = async (days = 30) => {
  const safeDays = Number(days) || 30;
  const now = new Date();
  const endDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - Math.max(safeDays - 1, 0));

  const { data, error } = await supabase
    .from("transactions")
    .select("amount, created_at, status_pembayaran, is_confirmed_by_admin")
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString());

  if (error) throw error;

  const confirmed = data.filter((item) => {
    const createdAt = new Date(item.created_at);
    return (
      createdAt >= startDate &&
      createdAt <= endDate &&
      (item.is_confirmed_by_admin || item.status_pembayaran === "success")
    );
  });

  if (safeDays >= 365) {
    const rows = [];
    for (let i = 11; i >= 0; i -= 1) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
      const label = monthDate.toLocaleDateString("id-ID", {
        month: "short",
        year: "numeric",
      });
      const total = confirmed.reduce((sum, item) => {
        const createdAt = new Date(item.created_at);
        const itemKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`;
        return itemKey === monthKey ? sum + Number(item.amount || 0) : sum;
      }, 0);

      rows.push({ label, total });
    }

    return rows;
  }

  const rows = [];
  const totalDays = safeDays > 1 ? safeDays : 1;

  for (let i = totalDays - 1; i >= 0; i -= 1) {
    const date = new Date(endDate);
    date.setDate(endDate.getDate() - i);
    const key = date.toISOString().split("T")[0];
    const label = date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
    });

    const total = confirmed.reduce((sum, item) => {
      const createdAt = new Date(item.created_at);
      return createdAt.toISOString().split("T")[0] === key
        ? sum + Number(item.amount || 0)
        : sum;
    }, 0);

    rows.push({ label, total });
  }

  return rows;
};

exports.getTransactionStats = async () => {
  const { data, error } = await supabase.from("transactions").select(`
            amount,
            status_pembayaran,
            is_confirmed_by_admin,
            courses:course_id (
                id,
                title
            )
        `);

  if (error) throw error;

  const confirmed = data.filter(
    (t) => t.is_confirmed_by_admin || t.status_pembayaran === "success",
  );
  const totalRevenue = confirmed.reduce(
    (sum, t) => sum + Number(t.amount || 0),
    0,
  );

  const courseMap = {};

  confirmed.forEach((t) => {
    const title = t.courses?.title || "Tanpa Kursus";
    courseMap[title] = (courseMap[title] || 0) + 1;
  });

  const bestCourse = Object.entries(courseMap).sort((a, b) => b[1] - a[1])[0];

  return {
    total_revenue: totalRevenue,
    total_transactions: data.length,
    total_confirmed: confirmed.length,
    best_course: bestCourse ? bestCourse[0] : "-",
  };
};

exports.getCourses = async () => {
  const { data, error } = await supabase
    .from("courses")
    .select(
      `
            id,
            title,
            description,
            category,
            delivery_type,
            level,
            learning_type,
            tags,
            price,
            thumbnail_url,
            certificate_template_url,
            status,
            teacher:teacher_id (
                id,
                full_name,
                role
            ),
            modules (
                id,
                title,
                order_index,
                materials (
                    id,
                    title
                ),
                questions (
                    id,
                    question_text,
                    is_exam
                )
            ),
            transactions (
                id,
                user_id,
                status_pembayaran,
                is_confirmed_by_admin,
                profiles:user_id (
                    id,
                    full_name,
                    role
                )
            )
        `,
    )
    .is("deleted_at", null)
    .order("title", { ascending: true });

  if (error) throw error;
  return data;
};

exports.createCourse = async ({ body, file }) => {
  const uploadedBanner = await uploadCourseBanner(file);

  const payload = {
    title: body.title,
    description: body.description || null,
    category: body.category,
    delivery_type: body.delivery_type,
    level: body.level,
    learning_type: body.learning_type,
    tags: normalizeTags(body.tags),
    price: Number(body.price || 0),
    teacher_id: body.teacher_id || null,
    thumbnail_url: uploadedBanner?.thumbnail_url || null,
    status: body.status || "draft",
  };

  const { data, error } = await supabase
    .from("courses")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
};

exports.updateCourse = async (courseId, { body, file }) => {
  const uploadedBanner = await uploadCourseBanner(file);

  const payload = {
    title: body.title,
    description: body.description || null,
    category: body.category,
    delivery_type: body.delivery_type,
    level: body.level,
    learning_type: body.learning_type,
    tags: normalizeTags(body.tags),
    price: Number(body.price || 0),
    teacher_id: body.teacher_id || null,
    status: body.status || "draft",
    ...(uploadedBanner || {}),
  };

  const { data, error } = await supabase
    .from("courses")
    .update(payload)
    .eq("id", courseId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

exports.updateCourseStatus = async (courseId, status) => {
  const { data, error } = await supabase
    .from("courses")
    .update({ status })
    .eq("id", courseId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Cek apakah course masih punya data siswa aktif (dipakai sebelum delete).
exports.getCourseStudentData = async (courseId) => {
  const [trxRes, progRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("course_id", courseId)
      .eq("status_pembayaran", "success"),
    supabase
      .from("student_progress")
      .select("id", { count: "exact", head: true })
      .eq("course_id", courseId),
  ]);

  if (trxRes.error) throw trxRes.error;
  if (progRes.error) throw progRes.error;

  return {
    successTransactions: trxRes.count || 0,
    progressRows: progRes.count || 0,
  };
};

exports.deleteCourse = async (courseId) => {
  const { data, error } = await supabase
    .from("courses")
    .update({
      deleted_at: new Date().toISOString(),
    })
    .eq("id", courseId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

exports.getTransactions = async () => {
  const { data, error } = await supabase
    .from("transactions")
    .select(
      `
            id,
            order_id,
            amount,
            status_pembayaran,
            is_confirmed_by_admin,
            payment_proof_url,
            created_at,
            profiles:user_id (
                id,
                full_name,
                role
            ),
            courses:course_id (
                id,
                title,
                price
            )
        `,
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
};

// ─────────────────────────────────────────────────────────
//  SERTIFIKAT (upload PDF oleh admin)
// ─────────────────────────────────────────────────────────

// Upload file PDF sertifikat ke bucket 'certificates'.
async function uploadCertificatePdf(file, folder = "certs") {
  if (!file) throw new Error("File sertifikat (PDF) wajib diunggah.");

  if (file.mimetype !== "application/pdf") {
    throw new Error("File sertifikat harus PDF.");
  }

  const safeName = file.originalname.replace(/\s+/g, "-").toLowerCase();
  const filePath = `${folder}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("certificates")
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from("certificates")
    .getPublicUrl(filePath);

  return { publicUrl: data.publicUrl, fileName: file.originalname };
}

// Daftar sertifikat (antrian pending + riwayat issued).
exports.getCertificates = async (status) => {
  let query = supabase
    .from("certificates")
    .select(
      `
            id,
            certificate_number,
            certificate_url,
            status,
            issued_at,
            created_at,
            profiles:user_id (
                id,
                full_name
            ),
            courses:course_id (
                id,
                title
            )
        `,
    )
    .order("created_at", { ascending: false });

  if (status === "pending" || status === "issued") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

// Admin menerbitkan sertifikat: upload PDF + set status issued.
exports.uploadCertificateFile = async (certificateId, file, adminId) => {
  const { data: cert, error: certError } = await supabase
    .from("certificates")
    .select("id, certificate_number")
    .eq("id", certificateId)
    .maybeSingle();

  if (certError) throw certError;
  if (!cert) throw new Error("Sertifikat tidak ditemukan.");

  const uploaded = await uploadCertificatePdf(file, "certs");

  // Generate nomor sertifikat jika belum ada.
  const certificateNumber =
    cert.certificate_number ||
    `LPIA-CERT/${new Date().getFullYear()}/${require("crypto")
      .randomUUID()
      .slice(0, 8)
      .toUpperCase()}`;

  const { data, error } = await supabase
    .from("certificates")
    .update({
      certificate_url: uploaded.publicUrl,
      certificate_number: certificateNumber,
      status: "issued",
      issued_at: new Date().toISOString(),
      issued_by: adminId,
    })
    .eq("id", certificateId)
    .select(
      `
            id,
            certificate_number,
            certificate_url,
            status,
            issued_at,
            profiles:user_id (id, full_name),
            courses:course_id (id, title)
        `,
    )
    .single();

  if (error) throw error;
  return data;
};

// Daftar template sertifikat per course.
exports.getCertificateTemplates = async () => {
  const { data, error } = await supabase
    .from("certificate_templates")
    .select(
      `
            id,
            course_id,
            template_file,
            file_name,
            created_at,
            courses:course_id (
                id,
                title
            )
        `,
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
};

// Upload/ganti template sertifikat untuk satu course (upsert).
exports.upsertCertificateTemplate = async (courseId, file, adminId) => {
  if (!courseId) throw new Error("Course ID wajib dikirim.");

  const uploaded = await uploadCertificatePdf(file, "templates");

  const { data, error } = await supabase
    .from("certificate_templates")
    .upsert(
      {
        course_id: courseId,
        template_file: uploaded.publicUrl,
        file_name: uploaded.fileName,
        uploaded_by: adminId,
      },
      { onConflict: "course_id" },
    )
    .select()
    .single();

  if (error) throw error;
  return data;
};
