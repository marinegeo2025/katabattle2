// api/battles/index.js
import { saveBattle, slugify } from "../_utils.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).end();

    const { customId, name } = req.body || {};
    const slug = slugify(customId || name || "kata-battle");
    const now = new Date().toISOString();

    // ✅ Preconfigured data structure for all new battles
    const doc = {
      name: name || slug,
      slug,
      status: "enrolling",
      createdAt: now,
      uploadDeadlineAt: null,

      // Core participants
      competitors: [],
      judges: [],

      // Round info
      round: null, // { fighterA: {...}, fighterB: {...} }

      // ✅ Scoring array always present
      scores: [], // <— ensures every battle includes it from creation

      // Optional extras for aggregation
      scoreboard: {}, // { A: {count,total,average}, B: {...} }
      winner: null
    };

    await saveBattle(slug, doc);

    const base = process.env.APP_BASE_URL;
    res.json({
      slug,
      url: base ? `${base}/b/${slug}` : `/b/${slug}` // fallback
    });
  } catch (e) {
    console.error("create-battle error:", e);
    res.status(500).json({ message: e.message || "Create failed" });
  }
}
