// api/battles/[slug]/upload-url.js
import { loadBattle, saveBattle, muxCreateDirectUpload } from "../../_utils.js";

export default async function handler(req, res) {
  try {
    const { slug } = req.query;
    if (req.method !== "POST") return res.status(405).end();

    const { fighter } = req.body || {}; // "A" or "B"
    if (!["A", "B"].includes(fighter)) {
      return res.status(400).json({ message: "A or B" });
    }

    const doc = await loadBattle(slug);
    if (!doc) return res.status(404).json({ message: "Not found" });
    if (doc.status !== "awaiting_videos") {
      return res.status(400).json({ message: "Uploads not open" });
    }
    if (doc.uploadDeadlineAt && new Date() > new Date(doc.uploadDeadlineAt)) {
      return res.status(400).json({ message: "Upload window expired" });
    }

    const name = fighter === "A" ? doc.round.fighterA.name : doc.round.fighterB.name;

    // Create Mux direct upload URL
    const { uploadId, uploadURL } = await muxCreateDirectUpload({ origin: process.env.APP_BASE_URL });

    // Remember which upload belongs to which fighter
    const slot = fighter === "A" ? doc.round.fighterA : doc.round.fighterB;
    slot.video = slot.video || {};
    slot.video.uploadId = uploadId;

    await saveBattle(slug, doc);
    res.json({ uploadURL, uploadId });
  } catch (e) {
    console.error("upload-url error:", e);
    res.status(500).json({ message: e.message || "Upload init failed" });
  }
}

