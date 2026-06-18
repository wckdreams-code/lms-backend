const supabase = require('../config/supabase');

exports.getAllAccounts = async () => {
    const { data, error } = await supabase
        .from('profiles')
        .select(`
            id,
            full_name,
            role,
            current_level,
            created_at,
            teacher_permissions (
                can_create_material,
                can_update_material,
                can_delete_material
            )
        `)
        .in('role', ['siswa', 'guru', 'admin'])
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};

exports.createTeacher = async ({ email, password, full_name }) => {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name }
    });

    if (authError) throw authError;

    const userId = authData.user.id;

    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: userId,
            full_name,
            role: 'guru'
        }, { onConflict: 'id' });

    if (profileError) throw profileError;

    const { error: permissionError } = await supabase
        .from('teacher_permissions')
        .upsert({
            teacher_id: userId
        }, { onConflict: 'teacher_id' });

    if (permissionError) throw permissionError;

    return {
        id: userId,
        email,
        password,
        full_name,
        role: 'guru'
    };
};

exports.updateTeacherPermissions = async (teacherId, permissions) => {
    const { data: teacher, error: teacherError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', teacherId)
        .eq('role', 'guru')
        .maybeSingle();

    if (teacherError) throw teacherError;

    if (!teacher) {
        throw new Error('Guru tidak ditemukan atau user bukan guru.');
    }

    const payload = {
        teacher_id: teacherId,
        can_create_material: Boolean(permissions.can_create_material),
        can_update_material: Boolean(permissions.can_update_material),
        can_delete_material: Boolean(permissions.can_delete_material),
        updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('teacher_permissions')
        .upsert(payload, { onConflict: 'teacher_id' })
        .select()
        .single();

    if (error) throw error;

    return data;
};
exports.updateUserPassword = async (userId, password) => {
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
        password
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
        .from('profiles')
        .select('role');

    if (profilesError) throw profilesError;

    const { count: materialCount, error: materialError } = await supabase
        .from('materials')
        .select('*', { count: 'exact', head: true });

    if (materialError) throw materialError;

    const totalSiswa = profiles.filter(item => item.role === 'siswa').length;
    const totalGuru = profiles.filter(item => item.role === 'guru').length;

    return {
        total_siswa: totalSiswa,
        total_guru: totalGuru,
        total_materi: materialCount || 0
    };
};

exports.getTransactionStats = async () => {
    const { data, error } = await supabase
        .from('transactions')
        .select(`
            amount,
            status_pembayaran,
            is_confirmed_by_admin,
            courses:course_id (
                id,
                title
            )
        `);

    if (error) throw error;

    const confirmed = data.filter(t => t.is_confirmed_by_admin || t.status_pembayaran === 'success');
    const totalRevenue = confirmed.reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const courseMap = {};

    confirmed.forEach(t => {
        const title = t.courses?.title || 'Tanpa Kursus';
        courseMap[title] = (courseMap[title] || 0) + 1;
    });

    const bestCourse = Object.entries(courseMap).sort((a, b) => b[1] - a[1])[0];

    return {
        total_revenue: totalRevenue,
        total_transactions: data.length,
        total_confirmed: confirmed.length,
        best_course: bestCourse ? bestCourse[0] : '-'
    };
};

exports.getCourses = async () => {
    const { data, error } = await supabase
        .from('courses')
        .select(`
            id,
            title,
            description,
            category,
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
        `)
        .order('title', { ascending: true });

    if (error) throw error;
    return data;
};


exports.createCourse = async (payload) => {
    const { data, error } = await supabase
        .from('courses')
        .insert([payload])
        .select()
        .single();

    if (error) throw error;
    return data;
};

exports.updateCourse = async (courseId, payload) => {
    const { data, error } = await supabase
        .from('courses')
        .update(payload)
        .eq('id', courseId)
        .select()
        .single();

    if (error) throw error;
    return data;
};


exports.getTransactions = async () => {
    const { data, error } = await supabase
        .from('transactions')
        .select(`
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
        `)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};

