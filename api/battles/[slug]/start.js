// api/battles/[slug]/start.js
import { loadBattle, saveBattle, sha256 } from "../../../_utils.js";

function pickTwo(list) {
  const s = [...list].sort(() => 0.5 - Math.random());
  return s.slice(0, 2);
}

export default async function handler(req, res) {
  const { slug } = req.query;
  if (req.method !== "POST") return res.status(405).end();

  const { judgeCode } = req.body || {};
  const doc = await loadBattle(slug);
  if (!doc) return res.status(404).json({ message: "Not found" });

  if (doc.status !== "enrolling") return res.status(400).json({ message: "Already started" });
  if (doc.competitors.length < 2) return res.status(400).json({ message: "Need ≥2 competitors" });

  const ok = doc.judges.find(j => j.codeHash === sha256(judgeCode || ""));
  if (!ok) return res.status(403).json({ message: "Judge only" });

  const [A, B] = pickTwo(doc.competitors);
  const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  doc.round = {
    fighterA: { name: A, video: { uid: null, ready: false } },
    fighterB: { name: B, video: { uid: null, ready: false } }
  };
  doc.status = "awaiting_videos";
  doc.uploadDeadlineAt = deadline;
  doc.competitors = [A, B]; // remove others from this round view

  await saveBattle(slug, doc);
  res.json({ fighters: [A, B], uploadDeadlineAt: deadline });
}
