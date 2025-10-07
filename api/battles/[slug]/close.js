// api/battles/[slug]/close.js
import { loadBattle, saveBattle, sha256 } from "../../../_utils.js";

export default async function handler(req, res) {
  const { slug } = req.query;
  if (req.method !== "POST") return res.status(405).end();

  const { judgeCode } = req.body || {};
  const doc = await loadBattle(slug);
  if (!doc) return res.status(404).json({ message: "Not found" });

  if (doc.status !== "judging_open")
    return res.status(400).json({ message: "Not open" });

  const j = doc.judges.find(x => x.codeHash === sha256(judgeCode || ""));
  if (!j) return res.status(403).json({ message: "Judge only" });

  const TA = doc.scoreboard?.A?.total || 0;
  const TB = doc.scoreboard?.B?.total || 0;
  const winner =
    TA === TB ? "Draw" :
    (TA > TB ? doc.round.fighterA.name : doc.round.fighterB.name);

  doc.winner = winner;
  doc.status = "archived";
  await saveBattle(slug, doc);

  res.json({ winner, totals: { A: TA, B: TB } });
}
