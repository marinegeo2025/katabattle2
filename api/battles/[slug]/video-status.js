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

    // 1️⃣ Upload → Asset
    const upload = await muxGetUpload(uploadId);
    if (!upload.asset_id) return res.json({ ready: false });

    // 2️⃣ Asset → Playback ID
    const asset = await muxGetAsset(upload.asset_id);

    // Find or create a PUBLIC playback ID
    let playbackId = asset.playback_ids?.find(p => p.policy === "public")?.id;
    if (asset.status === "ready" && !playbackId) {
      const created = await muxCreatePlaybackId(upload.asset_id, "public");
      playbackId = created.id;
    }

    // 3️⃣ If not ready yet, keep polling
    if (!(asset.status === "ready" && playbackId)) {
      return res.json({ ready: false });
    }

    // 4️⃣ Save playback ID, not asset ID, as video.uid
    const slot = A ? doc.round.fighterA : doc.round.fighterB;
    slot.video = {
      ...(slot.video || {}),
      assetId: upload.asset_id,
      playbackId,    // store playback separately
      uid: playbackId, // <- iframe uses this one
      ready: true
    };

    // 5️⃣ Mark judging open once both ready
    if (
      doc.status === "awaiting_videos" &&
      doc.round?.fighterA?.video?.ready &&
      doc.round?.fighterB?.video?.ready
    ) {
      doc.status = "judging_open";
    }

    await saveBattle(slug, doc);
    res.json({ ready: true, uid: playbackId });
  } catch (e) {
    console.error("video-status error:", e);
    res.status(500).json({ ready: false, message: e.message || "status error" });
  }
}
