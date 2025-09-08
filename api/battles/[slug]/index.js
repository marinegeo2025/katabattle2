// api/battles/[slug]/index.js
import { loadBattle, mask } from "../../_utils.js";

export default async function handler(req, res) {
  const { slug } = req.query;
  const doc = await loadBattle(slug);
  if (!doc) return res.status(404).json({ message: "Not found" });
  res.json(mask(doc));
}
