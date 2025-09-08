// api/debug/env.js
export default function handler(req, res) {
  res.json({
    has_SUPABASE_URL: !!process.env.SUPABASE_URL,
    has_SERVICE_ROLE: !!process.env.SUPABASE_SERVICE_ROLE,
    has_MUX_ID: !!process.env.MUX_TOKEN_ID,
    has_MUX_SECRET: !!process.env.MUX_TOKEN_SECRET,
    app_base_url: process.env.APP_BASE_URL || null
  });
}
