// Client terpisah KHUSUS signInWithPassword (login & verifikasi password).
// Jangan pakai client utama (config/supabase.js): signInWithPassword menyimpan
// sesi user di memori client, sehingga request storage/DB berikutnya memakai
// token user (bukan service role) dan kena error RLS
// "new row violates row-level security policy".
const { createClient } = require('@supabase/supabase-js');

const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

module.exports = supabaseAuth;
