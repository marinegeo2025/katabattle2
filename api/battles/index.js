import {
  loadBattle, saveBattle,
  muxGetUpload, muxGetAsset, muxCreatePlaybackId
} from "../../_utils.js";

export default async function handler(req, res) {
  try {
    const { slug } = req.query;
    const uploadId = req.query.uploadId;
    if (!uploadId) return res.status(400).json({ ready: false, message: "uploadId required" });

    const doc = await loadBattle(slug);
    if (!doc) return res.status(404).json({ ready: false });

    const A = doc.round?.fighterA?.video?.uploadId === uploadId;
    const B = doc.round?.fighterB?.video?.uploadId === uploadId;
    if (!A && !B) {
      return res.status(400).json({ ready: false, message: "Unknown uploadId" });
    }

    // 1️⃣ Check upload → get asset ID
    const upload = await muxGetUpload(uploadId);
    if (!upload.asset_id) return res.json({ ready: false });

    // 2️⃣ Fetch asset → create playback ID if needed
    const asset = await muxGetAsset(upload.asset_id);
    let playbackId = asset.playback_ids?.find(p => p.policy === "public")?.id;
    if (asset.status === "ready" && !playbackId) {
      const created = await muxCreatePlaybackId(upload.asset_id, "public");
      playbackId = created.id;
    }

    // 3️⃣ If not ready yet, poll again later
    if (!(asset.status === "ready" && playbackId)) {
      return res.json({ ready: false });
    }

    // 4️⃣ Save both asset and playback IDs
    const slot = A ? doc.round.fighterA : doc.round.fighterB;
    slot.video = {
      ...(slot.video || {}),
      assetId: upload.asset_id,
      playbackId,
      uid: playbackId, // front-end uses this for iframe
      ready: true
    };

    // 5️⃣ Open judging when both ready
    if (
      doc.status === "awaiting_videos" &&
      doc.round?.fighterA?.video?.ready &&
      doc.round?.fighterB?.video?.ready
    ) {
      doc.status = "judging_open";
    }

    await saveBattle(slug, doc);
    res.json({ ready: true, assetId: upload.asset_id, playbackId });
  } catch (e) {
    console.error("video-status error:", e);
    res.status(500).json({ ready: false, message: e.message || "status error" });
  }
}
