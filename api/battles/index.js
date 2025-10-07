import { saveBattle, slugify } from "../_utils.js"; // 👈 correct relative path

export default async function handler(req, res) {
  try {
    // Only allow POST requests
    if (req.method !== "POST") return res.status(405).end();

    const { customId, name } = req.body || {};
    const slug = slugify(customId || name || "kata-battle");

    // Create the new battle object
    const now = new Date().toISOString();
    const doc = {
      name: name || slug,
      slug,
      status: "enrolling",          // initial state
      createdAt: now,
      uploadDeadlineAt: null,
      competitors: [],
      judges: [],
      round: null,                  // will hold fighterA/fighterB later
      scores: [],                   // array of judge scores
      scoreboard: {},               // aggregate totals
      winner: null
    };

    // Save to Supabase
    await saveBattle(slug, doc);

    // Construct redirect URL (fallback to relative if APP_BASE_URL missing)
    const base = process.env.APP_BASE_URL;
    res.json({
      slug,
      url: base ? `${base}/b/${slug}` : `/b/${slug}`
    });

  } catch (e) {
    console.error("create-battle error:", e);
    res.status(500).json({ message: e.message || "Create failed" });
  }
}
