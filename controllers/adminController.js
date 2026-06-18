const adminModel = require('../models/adminModel');

exports.getAccounts = async (req, res) => {
    try {
        const accounts = await adminModel.getAllAccounts();

        res.status(200).json({
            status: 'success',
            data: accounts
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

exports.createTeacher = async (req, res) => {
    try {
        const { email, password, full_name } = req.body;

        if (!email || !password || !full_name) {
            return res.status(400).json({
                status: 'error',
                message: 'Nama, email, dan password wajib diisi.'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                status: 'error',
                message: 'Password minimal 8 karakter.'
            });
        }

        const teacher = await adminModel.createTeacher({
            email,
            password,
            full_name
        });

        res.status(201).json({
            status: 'success',
            message: 'Akun guru berhasil dibuat.',
            data: teacher
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

exports.updateTeacherPermissions = async (req, res) => {
    try {
        const { teacherId } = req.params;

        const permission = await adminModel.updateTeacherPermissions(
            teacherId,
            req.body
        );

        res.status(200).json({
            status: 'success',
            message: 'Permission guru berhasil diperbarui.',
            data: permission
        });
    } catch (error) {
        console.error('UPDATE TEACHER PERMISSION ERROR:', error);

        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

exports.updateUserPassword = async (req, res) => {
    try {
        const { userId } = req.params;
        const { password } = req.body;

        if (!password || password.length < 8) {
            return res.status(400).json({
                status: 'error',
                message: 'Password minimal 8 karakter.'
            });
        }

        await adminModel.updateUserPassword(userId, password);

        res.status(200).json({
            status: 'success',
            message: 'Password berhasil diperbarui.'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

exports.deleteAccount = async (req, res) => {
    try {
        const { userId } = req.params;

        await adminModel.deleteAccount(userId);

        res.status(200).json({
            status: 'success',
            message: 'Akun berhasil dihapus.'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const stats = await adminModel.getDashboardStats();

        res.status(200).json({
            status: 'success',
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

exports.getTransactions = async (req, res) => {
    try {
        const transactions = await adminModel.getTransactions();

        res.status(200).json({
            status: 'success',
            data: transactions
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

exports.getCourses = async (req, res) => {
    try {
        const courses = await adminModel.getCourses();

        res.status(200).json({
            status: 'success',
            data: courses
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

exports.createCourse = async (req, res) => {
    try {
        const {
            title,
            description,
            category,
            price,
            teacher_id,
            thumbnail_url,
            certificate_template_url,
            status
        } = req.body;

        if (!title || price === undefined) {
            return res.status(400).json({
                status: 'error',
                message: 'Judul dan harga kursus wajib diisi.'
            });
        }

        const course = await adminModel.createCourse({
            title,
            description,
            category,
            price,
            teacher_id: teacher_id || null,
            thumbnail_url,
            certificate_template_url,
            status: status || 'draft'
        });

        res.status(201).json({
            status: 'success',
            message: 'Kursus berhasil dibuat.',
            data: course
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

exports.updateCourse = async (req, res) => {
    try {
        const { courseId } = req.params;

        const course = await adminModel.updateCourse(courseId, req.body);

        res.status(200).json({
            status: 'success',
            message: 'Kursus berhasil diperbarui.',
            data: course
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

exports.updateCourseStatus = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { status } = req.body;

        if (!['draft', 'published', 'archived'].includes(status)) {
            return res.status(400).json({
                status: 'error',
                message: 'Status kursus tidak valid.'
            });
        }

        const course = await adminModel.updateCourse(courseId, { status });

        res.status(200).json({
            status: 'success',
            message: 'Status kursus berhasil diperbarui.',
            data: course
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

exports.getTransactionStats = async (req, res) => {
    try {
        const stats = await adminModel.getTransactionStats();

        res.status(200).json({
            status: 'success',
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

