import {
  loadBattle, saveBattle,
  muxGetUpload, muxGetAsset, muxCreatePlaybackId
} from "../../../_utils.js";  // 👈 correct relative path

export default async function handler(req, res) {
  try {
    const { slug } = req.query;
    const uploadId = req.query.uploadId;

    if (!uploadId) {
      return res.status(400).json({ ready: false, message: "uploadId required" });
    }

    // 1️⃣ Load the battle record
    const doc = await loadBattle(slug);
    if (!doc) return res.status(404).json({ ready: false });

    // Identify which fighter this upload belongs to
    const A = doc.round?.fighterA?.video?.uploadId === uploadId;
    const B = doc.round?.fighterB?.video?.uploadId === uploadId;
    if (!A && !B) {
      return res.status(400).json({ ready: false, message: "Unknown uploadId" });
    }

    // 2️⃣ Fetch upload info (contains asset_id once upload completes)
    const upload = await muxGetUpload(uploadId);
    if (!upload.asset_id) return res.json({ ready: false }); // still processing

    // 3️⃣ Get the asset and ensure it has a playback ID
    const asset = await muxGetAsset(upload.asset_id);
    let playbackId = asset.playback_ids?.find(p => p.policy === "public")?.id;

    // If asset is ready but lacks a playback ID, create one
    if (asset.status === "ready" && !playbackId) {
      const created = await muxCreatePlaybackId(upload.asset_id, "public");
      playbackId = created.id;
    }

    // 4️⃣ If asset isn't ready yet or no playback ID yet, tell client to retry
    if (!(asset.status === "ready" && playbackId)) {
      return res.json({ ready: false });
    }

    // 5️⃣ Save both assetId + playbackId to Supabase
    const slot = A ? doc.round.fighterA : doc.round.fighterB;
    slot.video = {
      ...(slot.video || {}),
      assetId: upload.asset_id,
      playbackId,
      uid: playbackId, // 👈 what the front-end uses for playback
      ready: true
    };

    // 6️⃣ Open judging when both videos are ready
    if (
      doc.status === "awaiting_videos" &&
      doc.round?.fighterA?.video?.ready &&
      doc.round?.fighterB?.video?.ready
    ) {
      doc.status = "judging_open";
    }

    // 7️⃣ Save updated battle record
    await saveBattle(slug, doc);

    // 8️⃣ Return playback info to client
    res.json({
      ready: true,
      assetId: upload.asset_id,
      playbackId
    });

  } catch (e) {
    console.error("video-status error:", e);
    res.status(500).json({ ready: false, message: e.message || "status error" });
  }
}
