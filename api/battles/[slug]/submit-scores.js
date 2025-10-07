// api/battles/[slug]/submit-scores.js
import { loadBattle, saveBattle, sha256 } from "../../../_utils.js";

export default async function handler(req, res) {
  const { slug } = req.query;
  if (req.method !== "POST") return res.status(405).end();

  const { judgeCode, A, B } = req.body || {};
  const doc = await loadBattle(slug);
  if (!doc) return res.status(404).json({ message: "Not found" });

  if (doc.status !== "judging_open")
    return res.status(400).json({ message: "Judging not open" });

  const j = doc.judges.find(x => x.codeHash === sha256(judgeCode || ""));
  if (!j) return res.status(403).json({ message: "Invalid judge" });
  if (j.submitted) return res.status(400).json({ message: "Already submitted" });

  const sA = Number(A), sB = Number(B);
  if (![sA, sB].every(v => Number.isFinite(v) && v >= 0 && v <= 10)) {
    return res.status(400).json({ message: "Scores 0–10" });
  }
  const round = (x) => Math.round(x * 10) / 10;

  doc.scores.push({
    judgeCodeHash: j.codeHash,
    A: round(sA),
    B: round(sB),
    submittedAt: new Date().toISOString()
  });
  j.submitted = true;

  // Aggregate
  const agg = { A: { count: 0, total: 0, average: 0 }, B: { count: 0, total: 0, average: 0 } };
  for (const s of doc.scores) {
    agg.A.count++; agg.B.count++;
    agg.A.total += s.A; agg.B.total += s.B;
  }
  agg.A.average = agg.A.count ? +(agg.A.total / agg.A.count).toFixed(2) : 0;
  agg.B.average = agg.B.count ? +(agg.B.total / agg.B.count).toFixed(2) : 0;
  doc.scoreboard = agg;

  await saveBattle(slug, doc);
  res.json({ scoreboard: doc.scoreboard });
}
