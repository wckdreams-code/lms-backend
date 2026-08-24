const supabase = require("../config/supabase");

const BUCKET = "landing-assets";

// Upload gambar aset landing ke bucket 'landing-assets'. Mengembalikan public URL.
async function uploadLandingImage(file, folder = "misc") {
  if (!file) return null;

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error("Gambar harus berupa JPG, PNG, atau WEBP.");
  }

  const safeName = file.originalname.replace(/\s+/g, "-").toLowerCase();
  const filePath = `${folder}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

// Ambil konten satu section landing (hero, trust, cta, ...).
async function getSection(section) {
  const { data, error } = await supabase
    .from("landing_settings")
    .select("content")
    .eq("section", section)
    .maybeSingle();

  if (error) throw error;
  return data?.content || {};
}

// Simpan/overwrite konten satu section.
async function upsertSection(section, content) {
  const { data, error } = await supabase
    .from("landing_settings")
    .upsert(
      { section, content, updated_at: new Date().toISOString() },
      { onConflict: "section" },
    )
    .select("content")
    .single();

  if (error) throw error;
  return data.content;
}

// ─────────────────────────────────────────────────────────
//  PROMOS (tabel tersendiri — CRUD)
// ─────────────────────────────────────────────────────────

// Semua promo (untuk admin), urut sort_order lalu terbaru.
async function listAllPromos() {
  const { data, error } = await supabase
    .from("promos")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// Promo aktif & masih dalam periode (untuk landing publik).
async function listActivePromos() {
  const { data, error } = await supabase
    .from("promos")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;

  const today = new Date().toISOString().slice(0, 10);
  return (data || []).filter((p) => {
    const startOk = !p.start_date || p.start_date <= today;
    const endOk = !p.end_date || p.end_date >= today;
    return startOk && endOk;
  });
}

async function createPromo({ body, file }) {
  let image_url = "";
  if (file) image_url = await uploadLandingImage(file, "promo");

  const payload = {
    title: body.title,
    description: body.description || "",
    image_url,
    cta_text: body.cta_text || "Lihat Promo",
    cta_link: body.cta_link || "#kursus",
    start_date: body.start_date || null,
    end_date: body.end_date || null,
    is_active: body.is_active === undefined ? true : body.is_active === "true" || body.is_active === true,
    sort_order: parseInt(body.sort_order) || 0,
  };

  const { data, error } = await supabase
    .from("promos")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function updatePromo(id, { body, file }) {
  const patch = {
    updated_at: new Date().toISOString(),
  };

  if (body.title !== undefined) patch.title = body.title;
  if (body.description !== undefined) patch.description = body.description;
  if (body.cta_text !== undefined) patch.cta_text = body.cta_text;
  if (body.cta_link !== undefined) patch.cta_link = body.cta_link;
  if (body.start_date !== undefined) patch.start_date = body.start_date || null;
  if (body.end_date !== undefined) patch.end_date = body.end_date || null;
  if (body.sort_order !== undefined) patch.sort_order = parseInt(body.sort_order) || 0;
  if (body.is_active !== undefined)
    patch.is_active = body.is_active === "true" || body.is_active === true;

  if (file) patch.image_url = await uploadLandingImage(file, "promo");

  const { data, error } = await supabase
    .from("promos")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function deletePromo(id) {
  const { error } = await supabase.from("promos").delete().eq("id", id);
  if (error) throw error;
  return true;
}

// ─────────────────────────────────────────────────────────
//  ALUMNI TESTIMONIALS (tabel tersendiri — CRUD)
// ─────────────────────────────────────────────────────────

// Semua alumni (untuk admin).
async function listAllAlumni() {
  const { data, error } = await supabase
    .from("alumni_testimonials")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// Alumni yang tampil (untuk landing publik).
async function listVisibleAlumni() {
  const { data, error } = await supabase
    .from("alumni_testimonials")
    .select("*")
    .eq("is_visible", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

function clampRating(value) {
  const n = parseInt(value);
  if (Number.isNaN(n)) return 5;
  return Math.min(5, Math.max(1, n));
}

async function createAlumni({ body, file }) {
  let photo_url = "";
  if (file) photo_url = await uploadLandingImage(file, "alumni");

  const payload = {
    name: body.name,
    photo_url,
    course_name: body.course_name || "",
    rating: clampRating(body.rating),
    testimonial: body.testimonial || "",
    year: parseInt(body.year) || null,
    is_visible:
      body.is_visible === undefined
        ? true
        : body.is_visible === "true" || body.is_visible === true,
    sort_order: parseInt(body.sort_order) || 0,
  };

  const { data, error } = await supabase
    .from("alumni_testimonials")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function updateAlumni(id, { body, file }) {
  const patch = {
    updated_at: new Date().toISOString(),
  };

  if (body.name !== undefined) patch.name = body.name;
  if (body.course_name !== undefined) patch.course_name = body.course_name;
  if (body.rating !== undefined) patch.rating = clampRating(body.rating);
  if (body.testimonial !== undefined) patch.testimonial = body.testimonial;
  if (body.year !== undefined) patch.year = parseInt(body.year) || null;
  if (body.sort_order !== undefined)
    patch.sort_order = parseInt(body.sort_order) || 0;
  if (body.is_visible !== undefined)
    patch.is_visible = body.is_visible === "true" || body.is_visible === true;

  if (file) patch.photo_url = await uploadLandingImage(file, "alumni");

  const { data, error } = await supabase
    .from("alumni_testimonials")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function deleteAlumni(id) {
  const { error } = await supabase
    .from("alumni_testimonials")
    .delete()
    .eq("id", id);
  if (error) throw error;
  return true;
}

// ─────────────────────────────────────────────────────────
//  FAQS (tabel tersendiri — CRUD)
// ─────────────────────────────────────────────────────────

async function listAllFaqs() {
  const { data, error } = await supabase
    .from("faqs")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function listVisibleFaqs() {
  const { data, error } = await supabase
    .from("faqs")
    .select("*")
    .eq("is_visible", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function createFaq(body) {
  const payload = {
    question: body.question,
    answer: body.answer || "",
    is_visible:
      body.is_visible === undefined
        ? true
        : body.is_visible === "true" || body.is_visible === true,
    sort_order: parseInt(body.sort_order) || 0,
  };

  const { data, error } = await supabase
    .from("faqs")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function updateFaq(id, body) {
  const patch = { updated_at: new Date().toISOString() };

  if (body.question !== undefined) patch.question = body.question;
  if (body.answer !== undefined) patch.answer = body.answer;
  if (body.sort_order !== undefined)
    patch.sort_order = parseInt(body.sort_order) || 0;
  if (body.is_visible !== undefined)
    patch.is_visible = body.is_visible === "true" || body.is_visible === true;

  const { data, error } = await supabase
    .from("faqs")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function deleteFaq(id) {
  const { error } = await supabase.from("faqs").delete().eq("id", id);
  if (error) throw error;
  return true;
}

module.exports = {
  uploadLandingImage,
  getSection,
  upsertSection,
  listAllFaqs,
  listVisibleFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  listAllPromos,
  listActivePromos,
  createPromo,
  updatePromo,
  deletePromo,
  listAllAlumni,
  listVisibleAlumni,
  createAlumni,
  updateAlumni,
  deleteAlumni,
};
