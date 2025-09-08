// api/battles/[slug]/join-judge.js
import { loadBattle, saveBattle, randToken, sha256 } from "../../_utils.js";

export default async function handler(req, res) {
  const { slug } = req.query;
  if (req.method !== "POST") return res.status(405).end();

  const { name } = req.body || {};
  const clean = (name || "Judge").trim();

  const doc = await loadBattle(slug);
  if (!doc) return res.status(404).json({ message: "Not found" });
  if (!["enrolling", "awaiting_videos", "judging_open"].includes(doc.status)) {
    return res.status(400).json({ message: "Judging closed" });
  }

  const code = "JD-" + randToken(6).toUpperCase();
  doc.judges.push({ name: clean, codeHash: sha256(code), submitted: false });
  await saveBattle(slug, doc);

  res.json({ judgeCode: code });
}
