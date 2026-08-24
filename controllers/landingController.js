const landingModel = require("../models/landingModel");

// ─────────────────────────────────────────────────────────
//  HERO SECTION
// ─────────────────────────────────────────────────────────

// GET /api/v1/landing/hero  (public)
// GET /api/v1/admin/landing/hero  (admin) — handler yang sama.
exports.getHero = async (req, res) => {
  try {
    const hero = await landingModel.getSection("hero");
    res.status(200).json({ status: "success", data: hero });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// PATCH /api/v1/admin/landing/hero  (admin, multipart — field file: "banner")
exports.updateHero = async (req, res) => {
  try {
    const current = await landingModel.getSection("hero");
    const body = req.body || {};

    // Tentukan banner: file baru > banner_url dari form > banner lama.
    let banner_url = current.banner_url || "";
    if (req.file) {
      banner_url = await landingModel.uploadLandingImage(req.file, "hero");
    } else if (body.banner_url !== undefined) {
      banner_url = body.banner_url;
    }

    const content = {
      badge: body.badge ?? current.badge ?? "",
      title: body.title ?? current.title ?? "",
      subtitle: body.subtitle ?? current.subtitle ?? "",
      primary_text: body.primary_text ?? current.primary_text ?? "",
      primary_link: body.primary_link ?? current.primary_link ?? "",
      secondary_text: body.secondary_text ?? current.secondary_text ?? "",
      secondary_link: body.secondary_link ?? current.secondary_link ?? "",
      banner_url,
    };

    const saved = await landingModel.upsertSection("hero", content);
    res.status(200).json({
      status: "success",
      message: "Hero section berhasil diperbarui.",
      data: saved,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// ─────────────────────────────────────────────────────────
//  TRUST / STATISTIK SECTION
// ─────────────────────────────────────────────────────────

// GET /api/v1/landing/trust  (public) & /api/v1/admin/landing/trust (admin)
exports.getTrust = async (req, res) => {
  try {
    const trust = await landingModel.getSection("trust");
    res.status(200).json({ status: "success", data: trust });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// PATCH /api/v1/admin/landing/trust  (admin, JSON: { items: [...] })
exports.updateTrust = async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];

    // Bersihkan & batasi tiap item agar konsisten.
    const cleanItems = items
      .map((it) => ({
        icon: String(it.icon || "fa-star").trim(),
        value: String(it.value || "").trim(),
        label: String(it.label || "").trim(),
      }))
      .filter((it) => it.value || it.label);

    const saved = await landingModel.upsertSection("trust", {
      items: cleanItems,
    });
    res.status(200).json({
      status: "success",
      message: "Statistik trust berhasil diperbarui.",
      data: saved,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// ─────────────────────────────────────────────────────────
//  FEATURES — "Kenapa Belajar di LPIA?"
// ─────────────────────────────────────────────────────────

// GET /api/v1/landing/features (public) & /api/v1/admin/landing/features (admin)
exports.getFeatures = async (req, res) => {
  try {
    const features = await landingModel.getSection("features");
    res.status(200).json({ status: "success", data: features });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// PATCH /api/v1/admin/landing/features  (admin, JSON: { items: [...] })
exports.updateFeatures = async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];

    const cleanItems = items
      .map((it) => ({
        icon: String(it.icon || "fa-star").trim(),
        title: String(it.title || "").trim(),
        description: String(it.description || "").trim(),
      }))
      .filter((it) => it.title || it.description);

    const saved = await landingModel.upsertSection("features", {
      items: cleanItems,
    });
    res.status(200).json({
      status: "success",
      message: "Section 'Kenapa LPIA' berhasil diperbarui.",
      data: saved,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// ─────────────────────────────────────────────────────────
//  PROMO SECTION (CRUD)
// ─────────────────────────────────────────────────────────

// GET /api/v1/landing/promos  (public) — hanya promo aktif & dalam periode.
exports.getActivePromos = async (req, res) => {
  try {
    const promos = await landingModel.listActivePromos();
    res.status(200).json({ status: "success", data: promos });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// GET /api/v1/admin/landing/promos  (admin) — semua promo.
exports.getAllPromos = async (req, res) => {
  try {
    const promos = await landingModel.listAllPromos();
    res.status(200).json({ status: "success", data: promos });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// POST /api/v1/admin/landing/promos  (admin, multipart — file: "image")
exports.createPromo = async (req, res) => {
  try {
    if (!req.body.title) {
      return res
        .status(400)
        .json({ status: "error", message: "Judul promo wajib diisi." });
    }
    const promo = await landingModel.createPromo({
      body: req.body,
      file: req.file,
    });
    res.status(201).json({
      status: "success",
      message: "Promo berhasil dibuat.",
      data: promo,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// PATCH /api/v1/admin/landing/promos/:id  (admin, multipart — file: "image")
exports.updatePromo = async (req, res) => {
  try {
    const promo = await landingModel.updatePromo(req.params.id, {
      body: req.body,
      file: req.file,
    });
    res.status(200).json({
      status: "success",
      message: "Promo berhasil diperbarui.",
      data: promo,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// DELETE /api/v1/admin/landing/promos/:id  (admin)
exports.deletePromo = async (req, res) => {
  try {
    await landingModel.deletePromo(req.params.id);
    res
      .status(200)
      .json({ status: "success", message: "Promo berhasil dihapus." });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// ─────────────────────────────────────────────────────────
//  CTA SECTION
// ─────────────────────────────────────────────────────────

// GET /api/v1/landing/cta (public) & /api/v1/admin/landing/cta (admin)
exports.getCta = async (req, res) => {
  try {
    const cta = await landingModel.getSection("cta");
    res.status(200).json({ status: "success", data: cta });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// PATCH /api/v1/admin/landing/cta  (admin, JSON)
exports.updateCta = async (req, res) => {
  try {
    const current = await landingModel.getSection("cta");
    const body = req.body || {};

    const content = {
      title: body.title ?? current.title ?? "",
      subtitle: body.subtitle ?? current.subtitle ?? "",
      primary_text: body.primary_text ?? current.primary_text ?? "",
      primary_link: body.primary_link ?? current.primary_link ?? "",
      secondary_text: body.secondary_text ?? current.secondary_text ?? "",
      secondary_link: body.secondary_link ?? current.secondary_link ?? "",
    };

    const saved = await landingModel.upsertSection("cta", content);
    res.status(200).json({
      status: "success",
      message: "CTA section berhasil diperbarui.",
      data: saved,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// ─────────────────────────────────────────────────────────
//  BRANCH — Info Cabang / Lokasi
// ─────────────────────────────────────────────────────────

// GET /api/v1/landing/branch (public) & /api/v1/admin/landing/branch (admin)
exports.getBranch = async (req, res) => {
  try {
    const branch = await landingModel.getSection("branch");
    res.status(200).json({ status: "success", data: branch });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// PATCH /api/v1/admin/landing/branch  (admin, multipart — file: "photo")
exports.updateBranch = async (req, res) => {
  try {
    const current = await landingModel.getSection("branch");
    const body = req.body || {};

    let photo_url = current.photo_url || "";
    if (req.file) {
      photo_url = await landingModel.uploadLandingImage(req.file, "branch");
    } else if (body.photo_url !== undefined) {
      photo_url = body.photo_url;
    }

    const content = {
      name: body.name ?? current.name ?? "",
      address: body.address ?? current.address ?? "",
      hours: body.hours ?? current.hours ?? "",
      phone: body.phone ?? current.phone ?? "",
      whatsapp: body.whatsapp ?? current.whatsapp ?? "",
      maps_link: body.maps_link ?? current.maps_link ?? "",
      tagline: body.tagline ?? current.tagline ?? "",
      description: body.description ?? current.description ?? "",
      photo_url,
    };

    const saved = await landingModel.upsertSection("branch", content);
    res.status(200).json({
      status: "success",
      message: "Info cabang berhasil diperbarui.",
      data: saved,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// ─────────────────────────────────────────────────────────
//  FAQ (CRUD)
// ─────────────────────────────────────────────────────────

// GET /api/v1/landing/faqs  (public) — hanya yang is_visible.
exports.getVisibleFaqs = async (req, res) => {
  try {
    const faqs = await landingModel.listVisibleFaqs();
    res.status(200).json({ status: "success", data: faqs });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// GET /api/v1/admin/landing/faqs  (admin) — semua.
exports.getAllFaqs = async (req, res) => {
  try {
    const faqs = await landingModel.listAllFaqs();
    res.status(200).json({ status: "success", data: faqs });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// POST /api/v1/admin/landing/faqs  (admin, JSON)
exports.createFaq = async (req, res) => {
  try {
    if (!req.body.question) {
      return res
        .status(400)
        .json({ status: "error", message: "Pertanyaan wajib diisi." });
    }
    const faq = await landingModel.createFaq(req.body);
    res.status(201).json({
      status: "success",
      message: "FAQ berhasil ditambahkan.",
      data: faq,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// PATCH /api/v1/admin/landing/faqs/:id  (admin, JSON)
exports.updateFaq = async (req, res) => {
  try {
    const faq = await landingModel.updateFaq(req.params.id, req.body);
    res.status(200).json({
      status: "success",
      message: "FAQ berhasil diperbarui.",
      data: faq,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// DELETE /api/v1/admin/landing/faqs/:id  (admin)
exports.deleteFaq = async (req, res) => {
  try {
    await landingModel.deleteFaq(req.params.id);
    res
      .status(200)
      .json({ status: "success", message: "FAQ berhasil dihapus." });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// ─────────────────────────────────────────────────────────
//  ALUMNI TESTIMONIALS (CRUD)
// ─────────────────────────────────────────────────────────

// GET /api/v1/landing/alumni  (public) — hanya yang is_visible.
exports.getVisibleAlumni = async (req, res) => {
  try {
    const alumni = await landingModel.listVisibleAlumni();
    res.status(200).json({ status: "success", data: alumni });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// GET /api/v1/admin/landing/alumni  (admin) — semua.
exports.getAllAlumni = async (req, res) => {
  try {
    const alumni = await landingModel.listAllAlumni();
    res.status(200).json({ status: "success", data: alumni });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// POST /api/v1/admin/landing/alumni  (admin, multipart — file: "photo")
exports.createAlumni = async (req, res) => {
  try {
    if (!req.body.name) {
      return res
        .status(400)
        .json({ status: "error", message: "Nama alumni wajib diisi." });
    }
    const alumni = await landingModel.createAlumni({
      body: req.body,
      file: req.file,
    });
    res.status(201).json({
      status: "success",
      message: "Alumni berhasil ditambahkan.",
      data: alumni,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// PATCH /api/v1/admin/landing/alumni/:id  (admin, multipart — file: "photo")
exports.updateAlumni = async (req, res) => {
  try {
    const alumni = await landingModel.updateAlumni(req.params.id, {
      body: req.body,
      file: req.file,
    });
    res.status(200).json({
      status: "success",
      message: "Data alumni berhasil diperbarui.",
      data: alumni,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// DELETE /api/v1/admin/landing/alumni/:id  (admin)
exports.deleteAlumni = async (req, res) => {
  try {
    await landingModel.deleteAlumni(req.params.id);
    res
      .status(200)
      .json({ status: "success", message: "Alumni berhasil dihapus." });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};
