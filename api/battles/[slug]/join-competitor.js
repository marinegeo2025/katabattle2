// api/battles/[slug]/join-competitor.js
import { loadBattle, saveBattle } from "../../../_utils.js";

export default async function handler(req, res) {
  const { slug } = req.query;
  if (req.method !== "POST") return res.status(405).end();

  const { name } = req.body || {};
  const clean = (name || "").trim();
  if (!clean) return res.status(400).json({ message: "Name required" });

  const doc = await loadBattle(slug);
  if (!doc) return res.status(404).json({ message: "Not found" });
  if (doc.status !== "enrolling") return res.status(400).json({ message: "Signups closed" });

  const exists = doc.competitors.find(n => n.toLowerCase() === clean.toLowerCase());
  if (exists) return res.status(400).json({ message: "Name already in" });

  doc.competitors.push(clean);
  await saveBattle(slug, doc);
  res.json({ competitors: doc.competitors });
}
