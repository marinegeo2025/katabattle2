// api/battles/index.js
import { saveBattle, slugify } from "../_utils.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).end();

    const { customId, name } = req.body || {};
    const slug = slugify(customId || name || "kata-battle");
    const now = new Date().toISOString();

    const doc = {
      name: name || slug,
      slug,
      status: "enrolling",
      createdAt: now,
      uploadDeadlineAt: null,
      competitors: [],
      judges: [],
      round: null,
      scores: [],
      scoreboard: {},
      winner: null
    };

    await saveBattle(slug, doc);

    const base = process.env.APP_BASE_URL; // optional
    res.json({
      slug,
      url: base ? `${base}/b/${slug}` : `/b/${slug}`  // ✅ relative fallback
    });

  } catch (e) {
    console.error("create-battle error:", e);
    res.status(500).json({ message: e.message || "Create failed" });
  }
}
