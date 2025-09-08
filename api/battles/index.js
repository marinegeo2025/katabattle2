// api/battles/index.js
import { saveBattle, slugify } from "../_utils.js";

export default async function handler(req, res) {
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
    round: null,        // { fighterA: {...}, fighterB: {...} }
    scores: [],         // [{ judgeCodeHash, A, B, submittedAt }]
    scoreboard: {},     // { A: {count,total,average}, B: {...} }
    winner: null
  };

  await saveBattle(slug, doc);
  res.json({ slug, url: `${process.env.APP_BASE_URL}/b/${slug}` });
}
