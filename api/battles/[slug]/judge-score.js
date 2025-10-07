// api/battles/[slug]/judge-score.js
import { loadBattle, saveBattle, sha256 } from "../../_utils.js";

export default async function handler(req, res) {
  try {
    const { slug } = req.query;
    if (req.method !== "POST") return res.status(405).end();

    const { judgeCode, fighter, base, deductions, additions, final } = req.body;

    const doc = await loadBattle(slug);
    if (!doc) return res.status(404).json({ message: "Battle not found" });

    // Validate judge
    const judge = doc.judges.find(j => j.codeHash === sha256(judgeCode));
    if (!judge) return res.status(403).json({ message: "Invalid judge code" });

    // Validate fighter
    if (!["A", "B"].includes(fighter)) {
      return res.status(400).json({ message: "Invalid fighter key" });
    }

    // Build score record
    const scoreRecord = {
      judgeCodeHash: judge.codeHash,
      fighter,
      base: base || 8.0,
      deductions: deductions || {},
      additions: additions || {},
      final,
      submittedAt: new Date().toISOString()
    };

    doc.scores = doc.scores || [];

    // Update existing or insert new score
    const existing = doc.scores.find(
      s => s.judgeCodeHash === judge.codeHash && s.fighter === fighter
    );
    if (existing) {
      Object.assign(existing, scoreRecord);
    } else {
      doc.scores.push(scoreRecord);
    }

    // --- Calculate averages ---
    function calcAverage(scores, fighterKey) {
      const fscores = scores.filter(s => s.fighter === fighterKey);
      if (!fscores.length) return { count: 0, avg: 0 };
      const avg = fscores.reduce((sum, s) => sum + (s.final || 0), 0) / fscores.length;
      return { count: fscores.length, avg: +avg.toFixed(2) };
    }

    doc.scoreboard = {
      A: calcAverage(doc.scores, "A"),
      B: calcAverage(doc.scores, "B")
    };

    // --- Determine if all judges have submitted ---
    const totalJudges = doc.judges.length;
    const aCount = doc.scoreboard.A.count;
    const bCount = doc.scoreboard.B.count;

    // When at least one score exists for both fighters,
    // and all active judges have submitted their scores for both.
    if (aCount >= 1 && bCount >= 1 && aCount === totalJudges && bCount === totalJudges) {
      const avgA = doc.scoreboard.A.avg;
      const avgB = doc.scoreboard.B.avg;

      if (avgA === avgB) {
        doc.winner = "Draw 🤝";
      } else if (avgA > avgB) {
        doc.winner = doc.round.fighterA.name;
      } else {
        doc.winner = doc.round.fighterB.name;
      }

      doc.status = "archived"; // lock the battle
      console.log(`🏆 Battle ${slug} finished — Winner: ${doc.winner}`);
    }

    // Save everything once
    await saveBattle(slug, doc);

    // Respond once
    res.json({
      ok: true,
      scores: doc.scores,
      scoreboard: doc.scoreboard,
      winner: doc.winner || null,
      status: doc.status
    });
  } catch (e) {
    console.error("judge-score error:", e);
    res.status(500).json({ message: e.message || "Server error" });
  }
}
