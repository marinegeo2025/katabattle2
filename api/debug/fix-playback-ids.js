import {
  loadBattle, saveBattle,
  muxGetAsset, muxCreatePlaybackId
} from "../_utils.js";

export default async function handler(req, res) {
  try {
    const { slug } = req.query;
    if (!slug) return res.status(400).json({ message: "slug required" });

    const doc = await loadBattle(slug);
    if (!doc) return res.status(404).json({ message: "Not found" });

    async function ensurePlayback(video) {
      if (!video?.assetId) return null;
      const asset = await muxGetAsset(video.assetId);
      let pid = asset.playback_ids?.find(p => p.policy === "public")?.id;
      if (asset.status === "ready" && !pid) {
        const created = await muxCreatePlaybackId(video.assetId, "public");
        pid = created.id;
      }
      if (pid) {
        video.playbackId = pid;
        video.uid = pid;
        video.ready = true;
      }
      return pid;
    }

    const aPid = await ensurePlayback(doc.round?.fighterA?.video);
    const bPid = await ensurePlayback(doc.round?.fighterB?.video);

    await saveBattle(slug, doc);
    res.json({ ok: true, slug, aPid, bPid });
  } catch (e) {
    console.error("fix-playback-ids error:", e);
    res.status(500).json({ message: e.message });
  }
}
